import { generationSchema, isValidUsername } from "./validation";
import { WORD_BANK, WORD_SET } from "./words";
import type { Candidate, GenerateOptions } from "./types";

const VOWELS = "aeiou";
const CONSONANTS = "bcdfghjklmnpqrstvwxyz";
const ONSETS = [
  "v",
  "z",
  "l",
  "n",
  "s",
  "m",
  "r",
  "k",
  "h",
  "f",
  "d",
  "t",
  "p",
  "c",
  "b",
  "y",
  "w",
  "br",
  "cl",
  "dr",
  "fl",
  "gl",
  "kr",
  "ny",
  "sh",
  "th",
  "vr",
  "zy",
];
const NUCLEI = ["a", "e", "i", "o", "u", "ae", "ia", "io", "ei", "ou"];
const TAILS = [
  "n",
  "r",
  "s",
  "x",
  "l",
  "m",
  "v",
  "ly",
  "ra",
  "on",
  "en",
  "is",
  "io",
  "a",
  "e",
  "o",
];
const MAX_ATTEMPTS = 18000;

const choose = <T>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

export function validateOptions(input: unknown): GenerateOptions {
  const parsed = generationSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const o = parsed.data;
  if (o.minLength > o.maxLength)
    throw new Error("Minimum length exceeds maximum length.");
  if (o.style === "og") {
    o.maxLength = Math.min(o.maxLength, 5);
    o.allowNumbers = o.allowDots = o.allowUnderscores = false;
  }
  if (o.minLength > o.maxLength)
    throw new Error("OG names require a length between 2 and 5.");
  for (const value of [
    o.startsWith,
    o.contains,
    o.endsWith,
    o.keyword,
    o.pattern.replace(/[?#]/g, ""),
  ]) {
    if (
      (!o.allowNumbers && /[0-9]/.test(value)) ||
      (!o.allowDots && value.includes(".")) ||
      (!o.allowUnderscores && value.includes("_"))
    )
      throw new Error("Required text conflicts with character preferences.");
  }
  if (o.pattern.includes("#") && !o.allowNumbers)
    throw new Error("Enable numbers for a # pattern.");
  const possible = Array.from(
    { length: o.maxLength - o.minLength + 1 },
    (_, i) => i + o.minLength,
  ).some((len) => templates(len, o).length > 0);
  if (!possible)
    throw new Error(
      "Those filters cannot fit together. Try a shorter pattern or fewer constraints.",
    );
  return o;
}

function placeInto(
  length: number,
  prefix: string,
  infix: string,
  suffix: string,
  offset: number,
): string[] | null {
  const result = Array<string>(length).fill("");
  function write(text: string, start: number) {
    for (let i = 0; i < text.length; i++) {
      const index = start + i;
      if (
        index < 0 ||
        index >= length ||
        (result[index] && result[index] !== text[i])
      )
        return false;
      result[index] = text[i];
    }
    return true;
  }
  return write(prefix, 0) &&
    write(suffix, length - suffix.length) &&
    write(infix, offset)
    ? result
    : null;
}

function templates(length: number, o: GenerateOptions): string[][] {
  if (o.pattern && o.pattern.length !== length) return [];
  const output: string[][] = [];
  for (let at = 0; at <= length - o.contains.length; at++) {
    const base = placeInto(length, o.startsWith, o.contains, o.endsWith, at);
    if (!base) continue;
    for (let k = 0; k <= length - o.keyword.length; k++) {
      const cells = [...base];
      let valid = true;
      const write = (value: string, offset: number) => {
        for (let i = 0; i < value.length; i++) {
          if (cells[offset + i] && cells[offset + i] !== value[i])
            valid = false;
          cells[offset + i] = value[i];
        }
      };
      write(o.keyword, k);
      for (let i = 0; i < o.pattern.length; i++) {
        const ch = o.pattern[i];
        if (ch === "?") {
          if (cells[i] && !/^[a-z]$/.test(cells[i])) valid = false;
        } else if (ch === "#") {
          if (cells[i] && !/^[0-9]$/.test(cells[i])) valid = false;
        } else write(ch, i);
      }
      if (
        valid &&
        cells[0] !== "." &&
        cells[length - 1] !== "." &&
        !cells.join("!").includes(".!.")
      )
        output.push(cells);
    }
  }
  return output;
}
function matches(name: string, o: GenerateOptions): boolean {
  return (
    isValidUsername(name) &&
    name.length >= o.minLength &&
    name.length <= o.maxLength &&
    name.startsWith(o.startsWith) &&
    name.endsWith(o.endsWith) &&
    name.includes(o.contains) &&
    name.includes(o.keyword) &&
    (!o.requireVowel || /[aeiou]/.test(name)) &&
    (o.allowNumbers || !/[0-9]/.test(name)) &&
    (o.allowDots || !name.includes(".")) &&
    (o.allowUnderscores || !name.includes("_")) &&
    (!o.pattern ||
      ([...o.pattern].every((ch, i) =>
        ch === "?"
          ? /[a-z]/.test(name[i] || "")
          : ch === "#"
            ? /[0-9]/.test(name[i] || "")
            : ch === name[i],
      ) &&
        o.pattern.length === name.length))
  );
}

export function brandScore(name: string): number {
  let score = 53;
  const length = name.length;
  if (length <= 3) score += 23;
  else if (length === 4) score += 18;
  else if (length === 5) score += 12;
  else score += 6;
  const vowels = (name.match(/[aeiou]/g) || []).length;
  if (vowels >= 1 && vowels <= Math.ceil(length / 2) + 1) score += 9;
  if (/^[a-z]*[aeiou][a-z]*$/.test(name)) score += 3;
  if (/[aeiou]$/.test(name)) score += 5;
  if (WORD_SET.has(name)) score += 7;
  if (/([a-z])\1\1/.test(name)) score -= 22;
  else if (/([a-z])\1/.test(name)) score -= 6;
  if (/[qwxz]{3}/.test(name)) score -= 20;
  if (/[^aeiou]{4}/.test(name)) score -= 15;
  if (/[aeiou]{4}/.test(name)) score -= 11;
  if (/[qj]/.test(name)) score -= 5;
  score -=
    (name.match(/[0-9]/g) || []).length * 4 +
    (name.match(/[._]/g) || []).length * 7;
  return Math.max(10, Math.min(99, score));
}

/** Bounded batches; scores never imply availability. */
export function generateCandidates(options: GenerateOptions): Candidate[] {
  const o = validateOptions(options),
    results = new Map<string, Candidate>();
  const add = (name: string) => {
    if (matches(name, o) && !results.has(name))
      results.set(name, {
        username: name,
        score: brandScore(name),
        label: WORD_SET.has(name) ? "Dictionary word" : "Coined name",
        length: name.length,
        origin: o.style,
      });
  };
  const dictionary = WORD_BANK.filter((w) => matches(w, o));
  for (let i = dictionary.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dictionary[i], dictionary[j]] = [dictionary[j], dictionary[i]];
  }
  const target =
    o.style === "words"
      ? o.count
      : ["balanced", "og"].includes(o.style)
        ? Math.ceil(o.count / 3)
        : 0;
  dictionary.slice(0, target).forEach(add);
  if (o.style !== "words") {
    const choices = Array.from(
      { length: o.maxLength - o.minLength + 1 },
      (_, i) => ({
        length: o.minLength + i,
        templates: templates(o.minLength + i, o),
      }),
    ).filter((x) => x.templates.length);
    for (
      let attempt = 0;
      attempt < MAX_ATTEMPTS && results.size < o.count;
      attempt++
    ) {
      const { length, templates: forms } = choose(choices);
      const cells = [...choose(forms)];
      let seed =
        o.style === "aesthetic"
          ? choose(ONSETS) + choose(NUCLEI) + choose(TAILS)
          : o.style === "brand"
            ? choose(ONSETS) + choose(NUCLEI) + choose(TAILS) + choose(NUCLEI)
            : o.inspiration;
      if (!seed) seed = "";
      for (let i = 0; i < length; i++) {
        if (cells[i]) continue;
        if (o.pattern[i] === "#") {
          cells[i] = choose("0123456789".split(""));
          continue;
        }
        let alphabet =
          o.style === "random"
            ? "abcdefghijklmnopqrstuvwxyz"
            : i % 2
              ? VOWELS
              : CONSONANTS;
        if (o.pattern[i] !== "?") {
          if (o.allowNumbers) alphabet += "0123456789";
          if (o.allowUnderscores) alphabet += "_";
          if (o.allowDots && i > 0 && i < length - 1) alphabet += ".";
        }
        cells[i] =
          seed[i] && alphabet.includes(seed[i]) && Math.random() < 0.65
            ? seed[i]
            : choose(alphabet.split(""));
      }
      add(cells.join(""));
    }
  }
  return [...results.values()].sort(
    (a, b) => b.score - a.score || a.username.localeCompare(b.username),
  );
}
