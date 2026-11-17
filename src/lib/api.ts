import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { serverClient } from "./supabase/server";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireAccount() {
  const client = await serverClient();
  if (!client)
    throw new ApiError(
      503,
      "Cloud persistence is not configured. Use the clearly labeled local demo.",
    );
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    throw new ApiError(401, "Sign in to your HandleHunt account.");
  return { client, user };
}
export function success<T>(data: T, status = 200) {
  return NextResponse.json(
    { ok: true, data },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export function failure(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    error.message === "Rate limit exceeded"
  )
    return failure(
      new ApiError(429, "Too many requests. Please try again in a minute."),
    );
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    error.message === "Collection limit reached"
  )
    return failure(
      new ApiError(
        409,
        "Collection limit reached. Remove older saved handles first.",
      ),
    );
  if (error instanceof ApiError)
    return NextResponse.json(
      { ok: false, error: { message: error.message } },
      { status: error.status },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { ok: false, error: { message: error.issues[0].message } },
      { status: 400 },
    );
  console.error(
    "HandleHunt API operation failed",
    error instanceof Error ? error.name : "Database error",
  );
  return NextResponse.json(
    { ok: false, error: { message: "The operation failed. Try again." } },
    { status: 500 },
  );
}
export async function jsonBody(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  )
    throw new ApiError(415, "Send a JSON request.");
  // Bound streaming reads too: content-length alone is not trustworthy.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Missing JSON body.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new ApiError(413, "Request too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, "Invalid JSON.");
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next may use its bind address in request.url. Host identifies the actual browser origin.
  const expected = `${url.protocol}//${request.headers.get("host") || url.host}`;
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== expected)
  )
    throw new ApiError(403, "Cross-origin writes are not allowed.");
}
