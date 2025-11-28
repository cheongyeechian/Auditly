import { NextResponse } from "next/server";

// Gemini API endpoint - using gemini-2.0-flash (not 2.5) to avoid "thinking" token overhead
// gemini-2.5-flash uses internal "thinking" tokens that consume the output budget
// Reference: https://ai.google.dev/gemini-api/docs/api-key
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
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
    console.log("[Gemini API] Source code length:", cleanedSource.length);
    console.log("[Gemini API] Source code preview (first 1000 chars):", cleanedSource.slice(0, 1000));

    // Truncate source code aggressively - Gemini 2.5 Flash uses "thinking" tokens
    // which can consume the entire budget on large contracts
    // Keep source under 00 chars (~2000 tokens) to ensure response room
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

    console.log("[Gemini API] Sending prompt to Gemini...");
    console.log("[Gemini API] Prompt length:", prompt.length, "chars");
    console.log("[Gemini API] Source length (trimmed):", trimmedSource.length, "chars");

    // Helper function to call Gemini API
    async function callGemini(sourceCode: string): Promise<{ summary: string; success: boolean }> {
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

      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey!, // apiKey is checked at the top of the handler
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: riskPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 400,
          },
        }),
      });

      const data = await response.json();
      console.log("[Gemini API] Response status:", response.status);
      console.log("[Gemini API] Full response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error("[Gemini] error response", data);
        return { summary: "", success: false };
      }

      const finishReason = data?.candidates?.[0]?.finishReason;
      const parts = data?.candidates?.[0]?.content?.parts;
      let summary = "";

      if (Array.isArray(parts) && parts.length > 0) {
        summary = parts.map((p: { text?: string }) => p.text || "").join("").trim();
      }

      console.log("[Gemini API] Finish reason:", finishReason, "| Summary length:", summary.length);

      // If MAX_TOKENS with no content, it failed
      if (finishReason === "MAX_TOKENS" && !summary) {
        return { summary: "", success: false };
      }

      return { summary, success: !!summary };
    }

    // Try with full source first
    console.log("[Gemini API] Attempt 1: Using trimmed source (" + trimmedSource.length + " chars)");
    let result = await callGemini(trimmedSource);

    // If failed, retry with even shorter source (first 3000 chars)
    if (!result.success && trimmedSource.length > 3000) {
      console.log("[Gemini API] Attempt 2: Retrying with shorter source (3000 chars)");
      const shorterSource = trimmedSource.slice(0, 3000) + "\n\n/* ... truncated ... */";
      result = await callGemini(shorterSource);
    }

    // If still failed, try with just the first 1500 chars
    if (!result.success && trimmedSource.length > 1500) {
      console.log("[Gemini API] Attempt 3: Retrying with minimal source (1500 chars)");
      const minimalSource = trimmedSource.slice(0, 1500) + "\n\n/* ... truncated ... */";
      result = await callGemini(minimalSource);
    }

    // Final fallback
    const summary = result.success 
      ? result.summary 
      : "This is a verified contract. Manual review recommended for detailed security analysis.";

    console.log("[Gemini API] ✅ Final summary:", summary);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[contract-code-insights] error", error);
    return NextResponse.json({ error: "Failed to analyze contract code." }, { status: 500 });
  }
}


