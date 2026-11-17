import test from "node:test";
import assert from "node:assert/strict";
import {
  brandScore,
  generateCandidates,
  validateOptions,
} from "../src/lib/handle-generator";
import { DEFAULT_OPTIONS } from "../src/lib/types";

const options = (override = {}) =>
  validateOptions({ ...DEFAULT_OPTIONS, ...override });

test("generates unique well-formed names in requested range", () => {
  const actual = generateCandidates(
    options({ minLength: 3, maxLength: 5, count: 60 }),
  );
  assert.equal(actual.length, 60);
  assert.equal(
    new Set(actual.map((item) => item.username)).size,
    actual.length,
  );
  assert.ok(actual.every((item) => /^[a-z]{3,5}$/.test(item.username)));
  assert.ok(actual.every((item) => item.score >= 10 && item.score <= 99));
});

test("honours compatible prefix, contains and suffix constraints", () => {
  const actual = generateCandidates(
    options({
      minLength: 6,
      maxLength: 6,
      count: 16,
      startsWith: "ro",
      contains: "ha",
      endsWith: "n",
    }),
  );
  assert.equal(actual.length, 16);
  assert.ok(
    actual.every(
      (item) =>
        item.username.startsWith("ro") &&
        item.username.includes("ha") &&
        item.username.endsWith("n"),
    ),
  );
});

test("dictionary-only never fabricates a real word", () => {
  const actual = generateCandidates(
    options({ style: "words", minLength: 3, maxLength: 3, count: 100 }),
  );
  assert.ok(actual.length <= 100);
  assert.ok(actual.every((item) => item.label === "Dictionary word"));
});

test("rejects impossible and malformed filters", () => {
  assert.throws(() => options({ minLength: 6, maxLength: 4 }), /length/i);
  assert.throws(() => options({ count: 1000 }), /between 1 and 100/i);
  assert.throws(() => options({ startsWith: "r@" }), /letters/i);
  assert.throws(
    () =>
      options({
        minLength: 3,
        maxLength: 3,
        startsWith: "aaa",
        endsWith: "bbb",
      }),
    /cannot fit/i,
  );
});

test("brand score is a heuristic, not registration evidence", () => {
  assert.ok(brandScore("lume") > brandScore("qwxz"));
  assert.ok(brandScore("awe") >= 10);
});
