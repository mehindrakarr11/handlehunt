import { NextResponse } from "next/server";
import { generateCandidates, validateOptions } from "@/lib/handle-generator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const type = request.headers.get("content-type") || "";
    if (!type.toLowerCase().includes("application/json"))
      return NextResponse.json({ error: "Send a JSON request." }, { status: 415 });
    // Reject unusually large bodies (protects public deployments from accidental overload).
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 4096) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    const options = validateOptions(JSON.parse(raw));
    const candidates = generateCandidates(options);
    return NextResponse.json({
      candidates,
      count: candidates.length,
      availability: "unverified",
      notice: "These names were generated locally. No Instagram availability lookup was performed."
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
