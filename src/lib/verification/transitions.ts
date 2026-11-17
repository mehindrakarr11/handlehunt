import type { ManualStatus } from "../types";
// All observations may be revised, but a claimed handle must enter recheck before a new observation.
export function canTransition(from: ManualStatus, to: ManualStatus): boolean {
  return (
    from !== "CLAIMED" ||
    ["CLAIMED", "NEEDS_RECHECK", "UNVERIFIED"].includes(to)
  );
}
