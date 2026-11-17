import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_OPTIONS } from "../src/lib/types";
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
test("public pages render and health reports demo capabilities", async () => {
  for (const path of [
    "/",
    "/discover",
    "/saved",
    "/queue",
    "/history",
    "/settings",
    "/login",
    "/about",
  ]) {
    const r = await fetch(base + path);
    assert.equal(r.status, 200, path);
    assert.ok((await r.text()).includes("HandleHunt"));
  }
  const r = await fetch(base + "/api/health");
  const { data } = await r.json();
  assert.equal(data.mode, "demo");
  assert.equal(data.automatedInstagramChecks, false);
});
test("generator works through the production route with validation and CSRF rejection", async () => {
  const post = (body: unknown, origin?: string) =>
    fetch(base + "/api/generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(origin ? { origin } : {}),
      },
      body: JSON.stringify(body),
    });
  const r = await post({
    ...DEFAULT_OPTIONS,
    minLength: 8,
    maxLength: 8,
    pattern: "sky_??##",
    allowNumbers: true,
    allowUnderscores: true,
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.data.count, 48);
  assert.ok(
    body.data.candidates.every((c: { username: string }) =>
      /^sky_[a-z]{2}\d{2}$/.test(c.username),
    ),
  );
  assert.equal((await post({ ...DEFAULT_OPTIONS, minLength: 1 })).status, 400);
  assert.equal(
    (await post(DEFAULT_OPTIONS, "https://untrusted.example")).status,
    403,
  );
  assert.equal(
    (await fetch(base + "/api/generate", { method: "POST", body: "not JSON" }))
      .status,
    415,
  );
  assert.equal(
    (
      await fetch(base + "/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '"' + "x".repeat(9000) + '"',
      })
    ).status,
    413,
  );
});
test("private endpoints fail closed without Supabase and provider returns unsupported", async () => {
  for (const [path, method] of [
    ["/api/handles", "GET"],
    ["/api/handles", "POST"],
    ["/api/handles/00000000-0000-0000-0000-000000000001", "DELETE"],
    ["/api/verifications", "GET"],
    ["/api/verifications", "POST"],
  ]) {
    const r = await fetch(base + path, { method });
    assert.equal(r.status, 503, `${method} ${path}`);
    assert.equal((await r.json()).ok, false);
  }
  const r = await fetch(base + "/api/availability?username=sky");
  assert.equal((await r.json()).data.status, "UNKNOWN");
  assert.equal(
    (await fetch(base + "/api/availability?username=a..b")).status,
    400,
  );
});
