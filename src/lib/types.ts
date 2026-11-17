export type GenerationStyle =
  | "balanced"
  | "words"
  | "invented"
  | "minimal"
  | "aesthetic"
  | "brand"
  | "random"
  | "og";
export type GenerateOptions = {
  minLength: number;
  maxLength: number;
  count: number;
  style: GenerationStyle;
  inspiration: string;
  startsWith: string;
  contains: string;
  endsWith: string;
  requireVowel: boolean;
  allowNumbers: boolean;
  allowUnderscores: boolean;
  allowDots: boolean;
  pattern: string;
  keyword: string;
};
export type Candidate = {
  username: string;
  score: number;
  label: "Dictionary word" | "Coined name";
  length: number;
  origin: GenerationStyle;
};
export type ManualStatus =
  | "UNVERIFIED"
  | "NEEDS_RECHECK"
  | "REPORTED_AVAILABLE"
  | "REPORTED_UNAVAILABLE"
  | "RESERVED_OR_UNKNOWN"
  | "CLAIMED";
export const STATUS_LABEL: Record<ManualStatus, string> = {
  UNVERIFIED: "Unverified",
  NEEDS_RECHECK: "Needs recheck",
  REPORTED_AVAILABLE: "User-reported available",
  REPORTED_UNAVAILABLE: "User-reported unavailable",
  RESERVED_OR_UNKNOWN: "Reserved or unknown",
  CLAIMED: "Claimed by you",
};
export type VerificationMethod =
  | "instagram_manual"
  | "instagram_profile_manual";
export const METHOD_LABEL: Record<VerificationMethod, string> = {
  instagram_manual: "Username field · manual",
  instagram_profile_manual: "Public profile · manual",
};
export type ManualVerification = {
  status: ManualStatus;
  checkedAt: string;
  method: VerificationMethod;
  note: string;
};
export type VerificationEvent = ManualVerification & {
  username: string;
  id: string;
};
export type HandleStore = {
  version: 2;
  saved: Candidate[];
  checks: Record<string, ManualVerification>;
  events: VerificationEvent[];
};
export const DEFAULT_OPTIONS: GenerateOptions = {
  minLength: 3,
  maxLength: 6,
  count: 48,
  style: "balanced",
  inspiration: "",
  startsWith: "",
  contains: "",
  endsWith: "",
  requireVowel: true,
  allowNumbers: false,
  allowUnderscores: false,
  allowDots: false,
  pattern: "",
  keyword: "",
};
