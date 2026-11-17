export type GenerationStyle = "balanced" | "words" | "invented" | "minimal";

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
};

export type Candidate = {
  username: string;
  score: number;
  label: "Dictionary word" | "Coined name";
  length: number;
  origin: GenerationStyle;
};

export type ManualStatus = "unchecked" | "appeared_claimable" | "not_claimable" | "claimed";

export type ManualVerification = {
  status: Exclude<ManualStatus, "unchecked">;
  checkedAt: string;
  method: "instagram_manual";
  note: string;
};

export type HandleStore = {
  version: 1;
  saved: Candidate[];
  checks: Record<string, ManualVerification>;
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
  requireVowel: true
};
