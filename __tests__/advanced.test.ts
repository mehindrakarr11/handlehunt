import test from "node:test";
import assert from "node:assert/strict";
import {
  generateCandidates,
  validateOptions,
  brandScore,
} from "../src/lib/handle-generator";
import {
  isValidUsername,
  normalizeUsername,
  usernameSchema,
  candidateSchema,
  verificationSchema,
} from "../src/lib/validation";
import { DEFAULT_OPTIONS, type GenerationStyle } from "../src/lib/types";
import { canTransition } from "../src/lib/verification/transitions";
import { ManualOnlyProvider } from "../src/lib/verification/provider";
import { makeCsv } from "../src/lib/csv";
import { demoLimit } from "../src/lib/demo-limit";
const options = (overrides = {}) =>
  validateOptions({ ...DEFAULT_OPTIONS, ...overrides });
test("normalization preserves allowed punctuation and rejects malformed names", () => {
  assert.equal(normalizeUsername(" @Sky_01 "), "sky_01");
  assert.equal(usernameSchema.parse(" @Sky.01 "), "sky.01");
  for (const name of [
    "a",
    "a".repeat(11),
    ".sky",
    "sky.",
    "a..b",
    "sky-01",
    "hello world",
    "écho",
    "<script>",
    "a/b",
  ]) {
    assert.equal(isValidUsername(name), false, name);
    assert.throws(() => usernameSchema.parse(name));
  }
  for (const name of ["ab", "a_", "a.b", "0123456789", "a".repeat(10)])
    assert.equal(isValidUsername(name), true, name);
});
test("all eight modes produce valid unique candidates at boundary lengths", () => {
  for (const style of [
    "balanced",
    "words",
    "invented",
    "minimal",
    "aesthetic",
    "brand",
    "random",
    "og",
  ] as GenerationStyle[]) {
    const result = generateCandidates(
      options({
        minLength: 2,
        maxLength: style === "og" ? 5 : 10,
        style,
        count: 40,
      }),
    );
    assert.ok(result.length > 0, style);
    assert.equal(new Set(result.map((c) => c.username)).size, result.length);
    assert.ok(result.every((c) => candidateSchema.safeParse(c).success));
  }
  for (const length of [2, 10]) {
    const result = generateCandidates(
      options({ minLength: length, maxLength: length, count: 20 }),
    );
    assert.equal(result.length, 20);
    assert.ok(result.every((c) => c.username.length === length));
  }
});
test("literal patterns, keyword, punctuation and number preferences compose", () => {
  const result = generateCandidates(
    options({
      minLength: 8,
      maxLength: 8,
      pattern: "sky_??##",
      keyword: "sky",
      allowNumbers: true,
      allowUnderscores: true,
      count: 50,
    }),
  );
  assert.equal(result.length, 50);
  assert.ok(result.every((c) => /^sky_[a-z]{2}[0-9]{2}$/.test(c.username)));
  const dotted = generateCandidates(
    options({
      minLength: 5,
      maxLength: 5,
      pattern: "??.??",
      allowDots: true,
      count: 30,
    }),
  );
  assert.equal(dotted.length, 30);
  assert.ok(dotted.every((c) => /^[a-z]{2}\.[a-z]{2}$/.test(c.username)));
  assert.throws(() => options({ pattern: "??##" }), /numbers/i);
  assert.throws(
    () => options({ style: "og", minLength: 6, maxLength: 9 }),
    /OG/,
  );
  assert.throws(
    () =>
      options({
        keyword: "sky",
        startsWith: "sea",
        minLength: 3,
        maxLength: 3,
      }),
    /cannot fit/,
  );
  assert.throws(
    () => options({ startsWith: ".", allowDots: true }),
    /cannot fit/,
  );
});
test("finite search spaces return fewer results without duplicating or inventing words", () => {
  const exact = generateCandidates(
    options({
      minLength: 3,
      maxLength: 3,
      startsWith: "sky",
      requireVowel: false,
      count: 100,
    }),
  );
  assert.deepEqual(
    exact.map((c) => c.username),
    ["sky"],
  );
  const noVowel = generateCandidates(
    options({ minLength: 3, maxLength: 3, startsWith: "xyz", count: 20 }),
  );
  assert.deepEqual(noVowel, []);
  const noWords = generateCandidates(
    options({ style: "words", minLength: 10, maxLength: 10, startsWith: "zz" }),
  );
  assert.deepEqual(noWords, []);
});
test("scoring rewards clean memorable names without assigning availability", () => {
  assert.ok(brandScore("lume") > brandScore("lume_123"));
  assert.ok(brandScore("aura") > brandScore("qwxz"));
  for (const c of generateCandidates(options()))
    assert.equal("availability" in c, false);
});
test("manual observations validate status, method and note bounds", () => {
  assert.equal(
    verificationSchema.parse({
      username: " @Sky ",
      status: "REPORTED_AVAILABLE",
      method: "instagram_manual",
    }).username,
    "sky",
  );
  for (const v of [
    { status: "API_VERIFIED", method: "instagram_manual" },
    { status: "CLAIMED", method: "instagram_api" },
    { status: "CLAIMED", method: "instagram_manual", note: "x".repeat(281) },
  ])
    assert.throws(() => verificationSchema.parse({ username: "sky", ...v }));
  assert.equal(canTransition("CLAIMED", "REPORTED_UNAVAILABLE"), false);
  assert.equal(canTransition("CLAIMED", "NEEDS_RECHECK"), true);
  assert.equal(canTransition("NEEDS_RECHECK", "REPORTED_UNAVAILABLE"), true);
});
test("default availability provider is explicitly unsupported and never implies claimability", async () => {
  const result = await new ManualOnlyProvider().check("sky");
  assert.equal(result.status, "UNKNOWN");
  assert.equal(result.supported, false);
  assert.equal(result.source, "unsupported");
  assert.ok(Number.isFinite(Date.parse(result.checkedAt)));
});
test("CSV includes manual evidence and neutralizes spreadsheet formulas", () => {
  const candidate = generateCandidates(
    options({
      startsWith: "sky",
      minLength: 3,
      maxLength: 3,
      requireVowel: false,
    }),
  )[0];
  const csv = makeCsv([candidate], {
    sky: {
      status: "REPORTED_AVAILABLE",
      checkedAt: "2026-11-17T00:00:00Z",
      method: "instagram_manual",
      note: '=HYPERLINK("bad")',
    },
  });
  assert.ok(csv.includes("REPORTED_AVAILABLE"));
  assert.ok(csv.includes("instagram_manual"));
  assert.ok(csv.includes("'=HYPERLINK"));
});
test("demo rate limit expires and cannot be bypassed by caller headers", () => {
  const key = "unit-limit";
  for (let i = 0; i < 30; i++) assert.equal(demoLimit(key, 1000), true);
  assert.equal(demoLimit(key, 1000), false);
  assert.equal(demoLimit(key, 61001), true);
});
