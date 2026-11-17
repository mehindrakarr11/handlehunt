import test from "node:test";
import assert from "node:assert/strict";
import { parseStore } from "../src/lib/client-store";
import type { Candidate } from "../src/lib/types";
const candidate: Candidate = {
  username: "lume",
  score: 80,
  length: 4,
  origin: "balanced",
  label: "Coined name",
};
test("migrates existing browser shortlists and manual observations without losing notes", () => {
  const old = {
    version: 1,
    saved: [candidate, candidate],
    checks: {
      lume: {
        status: "appeared_claimable",
        checkedAt: "2026-11-17T00:00:00Z",
        method: "instagram_manual",
        note: "My observation",
      },
    },
  };
  const store = parseStore(JSON.stringify(old));
  assert.equal(store.version, 2);
  assert.equal(store.saved.length, 1);
  assert.equal(store.checks.lume.status, "REPORTED_AVAILABLE");
  assert.equal(store.checks.lume.note, "My observation");
});
test("ignores corrupt browser data and sanitizes event notes", () => {
  assert.equal(parseStore("broken").saved.length, 0);
  assert.equal(
    parseStore(
      JSON.stringify({
        version: 2,
        saved: [{}, candidate],
        checks: {},
        events: [
          {
            username: "lume",
            status: "CLAIMED",
            id: "test",
            checkedAt: "2026-11-17T00:00:00Z",
            note: { bad: "object" },
          },
        ],
      }),
    ).events[0].note,
    "[object Object]",
  );
  assert.equal(Object.hasOwn(parseStore(null).checks, "__proto__"), false);
  assert.equal(parseStore(null).checks["__proto__"], undefined);
});
