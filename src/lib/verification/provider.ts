export type AvailabilityOutcome = {
  status: "UNKNOWN";
  supported: false;
  username: string;
  provider: string;
  source: "unsupported";
  checkedAt: string;
  message: string;
};
export interface AvailabilityProvider {
  readonly name: string;
  check(username: string): Promise<AvailabilityOutcome>;
}
export class ManualOnlyProvider implements AvailabilityProvider {
  readonly name = "unsupported";
  async check(username: string): Promise<AvailabilityOutcome> {
    return {
      status: "UNKNOWN",
      supported: false,
      username,
      provider: this.name,
      source: "unsupported",
      checkedAt: new Date().toISOString(),
      message:
        "No officially authorized availability integration is configured. Check Instagram’s own username field and record a manual observation. A missing profile is not proof of availability.",
    };
  }
}
export type VerificationProvider = AvailabilityProvider;
