import { NextResponse } from "next/server";

// RedPill (OpenAI-compatible) configuration
// Docs: https://docs.redpill.ai/quickstart
const REDPILL_BASE_URL ="https://api.redpill.ai/v1";
const REDPILL_MODEL = "google/gemini-2.5-flash-lite"; // Gemini via RedPill gateway

/**
 * Clean up source code for AI consumption:
 * - Handle Etherscan's JSON-wrapped multi-file format
 * - For multi-file contracts, extract the MAIN contract (not all dependencies)
 * - Remove excessive whitespace
 */
function cleanSourceCode(rawSource: string, contractName?: string): string {
  let source = rawSource;

  console.log(`[cleanSourceCode] Input length: ${rawSource.length}, contractName: ${contractName}`);
  console.log(`[cleanSourceCode] Starts with: ${rawSource.slice(0, 50)}`);

  // Etherscan returns multi-file contracts in JSON format: {{...}} or {...}
  // containing "sources": { "file.sol": { "content": "..." } }
  if (source.startsWith("{{") || source.startsWith("{")) {
    try {
      // Remove outer double braces if present (Etherscan quirk for verified contracts)
      const jsonStr = source.startsWith("{{") ? source.slice(1, -1) : source;
      const parsed = JSON.parse(jsonStr);

      // Multi-file format with "sources" key
      if (parsed.sources && typeof parsed.sources === "object") {
        const fileEntries = Object.entries(parsed.sources) as [string, { content?: string }][];
        
        console.log(`[cleanSourceCode] Multi-file contract detected: ${fileEntries.length} files`);
        console.log(`[cleanSourceCode] Files:`, fileEntries.map(([f]) => f).join(", "));

        // Strategy: Find the main contract file intelligently
        let mainFile: { name: string; content: string } | null = null;
        const normalizedContractName = (contractName || "").toLowerCase().replace(/\s+/g, "");

        // PASS 1: Look for file that DEFINES the contract (most reliable)
        for (const [filename, fileData] of fileEntries) {
          const content = fileData?.content;
          if (!content) continue;

          // Check if this file contains "contract ContractName" definition
          const contractDefRegex = new RegExp(`contract\\s+${contractName}\\s*(is|\\{)`, "i");
          if (contractName && contractDefRegex.test(content)) {
            mainFile = { name: filename, content };
            console.log(`[cleanSourceCode] ✅ Found main file by contract definition: ${filename}`);
            break;
          }
        }

        // PASS 2: Match by filename containing contract name
        if (!mainFile) {
          for (const [filename, fileData] of fileEntries) {
            const content = fileData?.content;
            if (!content) continue;

            const baseName = filename.split("/").pop()?.toLowerCase().replace(".sol", "") || "";
            
            if (normalizedContractName && baseName.includes(normalizedContractName)) {
              mainFile = { name: filename, content };
              console.log(`[cleanSourceCode] ✅ Found main file by name match: ${filename}`);
              break;
            }
          }
        }

        // PASS 3: Find non-interface/non-library files, prefer ones not starting with "I" or "@"
        if (!mainFile) {
          const candidates: { name: string; content: string; score: number }[] = [];
          
          for (const [filename, fileData] of fileEntries) {
            const content = fileData?.content;
            if (!content) continue;

            const lowerPath = filename.toLowerCase();
            const baseName = filename.split("/").pop()?.toLowerCase() || "";
            
            // Skip obvious non-main files
            if (
              lowerPath.includes("/interfaces/") ||
              lowerPath.includes("/libraries/") ||
              lowerPath.includes("@openzeppelin") ||
              lowerPath.includes("@chainlink") ||
              lowerPath.includes("@uniswap") ||
              baseName.startsWith("i") && baseName.length > 1 && baseName[1] === baseName[1].toUpperCase()
            ) {
              continue;
            }

            // Score based on likelihood of being main contract
            let score = 0;
            if (content.includes("constructor(")) score += 2;
            if (content.includes("function ")) score += 1;
            if (!lowerPath.includes("abstract")) score += 1;
            if (!lowerPath.includes("base")) score += 1;
            
            candidates.push({ name: filename, content, score });
          }

          // Sort by score descending, take best match
          candidates.sort((a, b) => b.score - a.score);
          if (candidates.length > 0) {
            mainFile = candidates[0];
            console.log(`[cleanSourceCode] ✅ Found main file by scoring: ${mainFile.name} (score: ${candidates[0].score})`);
          }
        }

        // PASS 4: Last resort - use the last file in the list (often main contract)
        if (!mainFile && fileEntries.length > 0) {
          const [lastName, lastData] = fileEntries[fileEntries.length - 1];
          if (lastData?.content) {
            mainFile = { name: lastName, content: lastData.content };
            console.log(`[cleanSourceCode] ⚠️ Fallback: using last file: ${lastName}`);
          }
        }

        if (mainFile) {
          source = `// File: ${mainFile.name}\n\n${mainFile.content}`;
          console.log(`[cleanSourceCode] Extracted main file: ${mainFile.name} (${mainFile.content.length} chars)`);
        } else {
          console.log(`[cleanSourceCode] ❌ Could not find main file, using raw source`);
        }
      } else if (parsed.content) {
        // Single file wrapped in JSON
        source = parsed.content;
        console.log(`[cleanSourceCode] Single file JSON wrapper detected`);
      }
    } catch (e) {
      console.log(`[cleanSourceCode] JSON parse failed (might be raw Solidity):`, (e as Error).message);
      // Not valid JSON, use as-is (probably raw Solidity)
    }
  } else {
    console.log(`[cleanSourceCode] Raw Solidity source (not JSON wrapped)`);
  }

  // Normalize line endings and remove excessive blank lines
  source = source
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  console.log(`[cleanSourceCode] Final output length: ${source.length}`);
  return source;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.REDPILL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "REDPILL_API_KEY is not configured." }, { status: 500 });
    }

    const body = await request.json();
    const rawSourceCode = typeof body.sourceCode === "string" ? body.sourceCode : "";
    const contractName = typeof body.contractName === "string" ? body.contractName : "Unknown Contract";
    const address = typeof body.address === "string" ? body.address : "Unknown Address";

    if (!rawSourceCode.trim()) {
      return NextResponse.json({ error: "Missing source code to analyze." }, { status: 400 });
    }

    // Clean and parse the source code properly - pass contractName to help find main file
    const cleanedSource = cleanSourceCode(rawSourceCode, contractName);

    // Log the source code being sent to AI
    console.log("[RedPill] Source code length:", cleanedSource.length);
    console.log("[RedPill] Source code preview (first 1000 chars):", cleanedSource.slice(0, 1000));

    // Truncate source code to leave headroom for the model response
    const MAX_SOURCE_LENGTH = 8000;
    const trimmedSource =
      cleanedSource.length > MAX_SOURCE_LENGTH
        ? `${cleanedSource.slice(0, MAX_SOURCE_LENGTH)}\n\n/* ... source truncated for AI processing ... */`
        : cleanedSource;

    // Build a concise prompt - ask for bullet points focused on RISKS only
    const prompt = `You are a neutral smart contract reviewer explaining capabilities to regular users.

RULES:
- Output ONLY bullet points, one risk per line
- Start each line with "- " (dash space)
- Be NEUTRAL and FACTUAL - describe what the contract CAN do, not what it WILL do
- Do NOT assume malicious intent - avoid words like "steal", "malicious", "attack"
- Use phrases like "has the ability to", "can", "is able to" instead of "will", "could steal"
- Use PLAIN ENGLISH - NO function names, NO technical jargon
- Example good: "An admin has the ability to upgrade this contract to a new version"
- Example good: "The owner can withdraw funds from this contract"
- Example bad: "The owner could steal all your funds"
- Example bad: "Attackers could exploit this to drain your wallet"
- If no notable capabilities, output: - Standard contract with no unusual permissions

Contract: ${contractName}

\`\`\`
${trimmedSource}
\`\`\`

Capabilities:`;

    console.log("[RedPill] Sending prompt to RedPill...");
    console.log("[RedPill] Prompt length:", prompt.length, "chars");
    console.log("[RedPill] Source length (trimmed):", trimmedSource.length, "chars");

    // Helper function to call RedPill (OpenAI-compatible chat completions)
    async function callRedPill(sourceCode: string): Promise<{ summary: string; success: boolean }> {
      const riskPrompt = `You are a neutral smart contract reviewer explaining capabilities to regular users.

RULES:
- Output ONLY bullet points, one risk per line
- Start each line with "- " (dash space)
- Be NEUTRAL and FACTUAL - describe what the contract CAN do, not what it WILL do
- Do NOT assume malicious intent - avoid words like "steal", "malicious", "attack"
- Use phrases like "has the ability to", "can", "is able to" instead of "will", "could steal"
- Use PLAIN ENGLISH - NO function names, NO technical jargon
- Example good: "An admin has the ability to upgrade this contract to a new version"
- Example good: "The owner can withdraw funds from this contract"
- Example bad: "The owner could steal all your funds"
- Example bad: "Attackers could exploit this to drain your wallet"
- If no notable capabilities, output: - Standard contract with no unusual permissions

Contract: ${contractName}

\`\`\`
${sourceCode}
\`\`\`

Capabilities:`;

      const response = await fetch(`${REDPILL_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: REDPILL_MODEL,
          messages: [
            {
              role: "user",
              content: riskPrompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      const data = await response.json();
      console.log("[RedPill] Response status:", response.status);
      if (!response.ok) {
        console.error("[RedPill] Error response:", JSON.stringify(data, null, 2));
        return { summary: "", success: false };
      }

      const summary =
        data?.choices?.[0]?.message?.content?.trim?.() ||
        data?.choices?.[0]?.message?.content ||
        "";

      console.log("[RedPill] Summary length:", summary.length);
      return { summary, success: Boolean(summary) };
    }

    // Single attempt via RedPill gateway
    console.log("[RedPill] Attempt: Using trimmed source (" + trimmedSource.length + " chars)");
    const result = await callRedPill(trimmedSource);

    // Final fallback
    const summary = result.success 
      ? result.summary 
      : "This is a verified contract. Manual review recommended for detailed security analysis.";

    console.log("[RedPill] ✅ Final summary:", summary);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[contract-code-insights] error", error);
    return NextResponse.json({ error: "Failed to analyze contract code." }, { status: 500 });
  }
}


