import { NextResponse } from "next/server";
import { analyzeContract, isAnalyzerError } from "@/lib/analyzer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const chain = typeof body.chain === "string" ? body.chain : "ethereum";
    const address = typeof body.address === "string" ? body.address : "";
    const addressType = typeof body.addressType === "string" ? body.addressType : undefined;
    const result = await analyzeContract({ chain, address, addressType });
    return NextResponse.json(result);
  } catch (error) {
    const status = isAnalyzerError(error) ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status });
  }
}

