import test from "node:test";
import assert from "node:assert/strict";
import {
  isMarkedTaken,
  profileObservation,
} from "../src/lib/verification/review";
import { verificationSchema } from "../src/lib/validation";
import { parseStore } from "../src/lib/client-store";
import { makeCsv } from "../src/lib/csv";
import {
  STATUS_LABEL,
  type ManualStatus,
  type Candidate,
} from "../src/lib/types";

test("taken filtering excludes reported unavailable and claimed, never unknown or unverified", () => {
  for (const status of Object.keys(STATUS_LABEL) as ManualStatus[]) {
    assert.equal(
      isMarkedTaken({
        status,
        method: "instagram_manual",
        note: "",
        checkedAt: new Date().toISOString(),
      }),
      ["REPORTED_UNAVAILABLE", "CLAIMED"].includes(status),
      status,
    );
  }
  assert.equal(isMarkedTaken(undefined), false);
});

test("profile observations preserve the manual source and cannot establish availability", () => {
  const exists = profileObservation("exists");
  const unknown = profileObservation("unknown");
  assert.equal(exists.status, "REPORTED_UNAVAILABLE");
  assert.equal(unknown.status, "RESERVED_OR_UNKNOWN");
  for (const observation of [exists, unknown]) {
    assert.equal(observation.method, "instagram_profile_manual");
    assert.ok(Number.isFinite(Date.parse(observation.checkedAt)));
    const { checkedAt: _timestamp, ...request } = observation;
    void _timestamp;
    assert.ok(
      verificationSchema.safeParse({ username: "lume", ...request }).success,
    );
  }
  assert.equal(
    profileObservation("exists", "  My exact match  ").note,
    "My exact match",
  );
  assert.equal(profileObservation("unknown", "a".repeat(300)).note.length, 280);
  for (const status of [
    "REPORTED_AVAILABLE",
    "CLAIMED",
    "UNVERIFIED",
    "NEEDS_RECHECK",
  ]) {
    assert.equal(
      verificationSchema.safeParse({
        username: "lume",
        status,
        method: "instagram_profile_manual",
      }).success,
      false,
    );
  }
  assert.ok(
    verificationSchema.safeParse({
      username: "lume",
      status: "REPORTED_AVAILABLE",
      method: "instagram_manual",
    }).success,
  );
});

test("profile source and unknown results survive browser reloads and CSV exports", () => {
  const candidate: Candidate = {
    username: "lume",
    score: 80,
    length: 4,
    origin: "balanced",
    label: "Coined name",
  };
  const observation = profileObservation("unknown");
  const stored = parseStore(
    JSON.stringify({
      version: 2,
      saved: [candidate],
      checks: { lume: observation },
      events: [{ ...observation, username: "lume", id: "test" }],
    }),
  );
  assert.deepEqual(stored.checks.lume, observation);
  assert.equal(stored.events[0].method, "instagram_profile_manual");
  assert.equal(stored.saved.length, 1);
  const csv = makeCsv(stored.saved, stored.checks);
  assert.ok(csv.includes('"RESERVED_OR_UNKNOWN"'));
  assert.ok(csv.includes('"instagram_profile_manual"'));
  const invalid = parseStore(
    JSON.stringify({
      version: 2,
      saved: [candidate],
      checks: { lume: { ...observation, status: "REPORTED_AVAILABLE" } },
      events: [],
    }),
  );
  assert.equal(invalid.checks.lume, undefined);
  assert.equal(invalid.saved.length, 1);
});
