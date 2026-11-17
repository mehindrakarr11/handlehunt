import type { ManualVerification } from "../types";

export function isMarkedTaken(verification?: ManualVerification): boolean {
  return (
    verification?.status === "REPORTED_UNAVAILABLE" ||
    verification?.status === "CLAIMED"
  );
}

export function profileObservation(
  result: "exists" | "unknown",
  note = "",
): ManualVerification {
  return {
    status:
      result === "exists" ? "REPORTED_UNAVAILABLE" : "RESERVED_OR_UNKNOWN",
    method: "instagram_profile_manual",
    checkedAt: new Date().toISOString(),
    note:
      note.trim().slice(0, 280) ||
      (result === "exists"
        ? "I saw an Instagram profile with this exact username."
        : "No exact profile confirmed: page missing, login required, or response unclear. Claimability is unknown."),
  };
}
