import { NextResponse } from "next/server";
import { ManualOnlyProvider } from "@/lib/verification/provider";

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username")?.toLowerCase().trim() || "";
  if (!/^[a-z0-9._]{1,30}$/.test(username)) {
    return NextResponse.json({ error: "Pass a valid Instagram-style username (1–30 characters)." }, { status: 400 });
  }
  const result = await new ManualOnlyProvider().check(username);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
