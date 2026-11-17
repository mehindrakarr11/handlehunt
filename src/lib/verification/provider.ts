/**
 * Deliberately non-networked: no public official Instagram username registration
 * availability endpoint exists for a general app integration.
 * A future authorized provider can implement this contract without changing UI labels.
 */
export type AvailabilityOutcome =
  | { status: "manual_required"; username: string; message: string }
  | { status: "unknown"; username: string; message: string };

export interface VerificationProvider {
  check(username: string): Promise<AvailabilityOutcome>;
}

export class ManualOnlyProvider implements VerificationProvider {
  async check(username: string): Promise<AvailabilityOutcome> {
    return {
      status: "manual_required",
      username,
      message: "Open Instagram > Profile > Edit profile > Username and try the handle. Only Instagram can confirm whether you may claim it."
    };
  }
}
