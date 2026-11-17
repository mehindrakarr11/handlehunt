import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({ service: "HandleHunt", phase: 1, discovery: true, automatedInstagramChecks: false, verification: "manual" });
}
