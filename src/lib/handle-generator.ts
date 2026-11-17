import { WORD_BANK, WORD_SET } from "./words";
import type { Candidate, GenerateOptions, GenerationStyle } from "./types";

const VOWELS = "aeiou";
const CONSONANTS = "bcdfghjklmnpqrstvwxyz";
const ONSETS = ["v", "z", "l", "n", "s", "m", "r", "k", "h", "f", "d", "t", "p", "c", "b", "y", "w", "br", "cl", "dr", "fl", "gl", "kr", "ny", "sh", "th", "vr", "zy"];
const NUCLEI = ["a", "e", "i", "o", "u", "ae", "ia", "io", "ei", "ou"];
const TAILS = ["n", "r", "s", "x", "l", "m", "v", "ly", "ra", "on", "en", "is", "io", "a", "e", "o"];
const MAX_ATTEMPTS = 18000;

const choose = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const isVowel = (value: string): boolean => VOWELS.includes(value.toLowerCase());

export function validateOptions(input: unknown): GenerateOptions {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid generation options.");
  const raw = input as Record<string, unknown>;
  const validStyles = ["balanced", "words", "invented", "minimal"];
  const minLength = Number(raw.minLength);
  const maxLength = Number(raw.maxLength);
  const count = Number(raw.count);
  const style = raw.style;
  if (![minLength, maxLength, count].every(Number.isInteger)) throw new Error("Length and count must be whole numbers.");
  if (minLength < 3 || maxLength > 6 || minLength > maxLength) throw new Error("Choose a length between 3 and 6.");
  if (count < 1 || count > 100) throw new Error("Generate between 1 and 100 names per request.");
  if (typeof style !== "string" || !validStyles.includes(style)) throw new Error("Invalid name style.");
  const field = (name: string, max: number): string => {
    if (typeof raw[name] !== "string" || raw[name].length > max) throw new Error(`Invalid ${name} value.`);
    const clean = (raw[name] as string).trim().toLowerCase();
    if (clean && !/^[a-z]+$/.test(clean)) throw new Error(`${name} must contain letters a–z only.`);
    return clean;
  };
  const inspiration = field("inspiration", 24);
  const startsWith = field("startsWith", 6);
  const contains = field("contains", 6);
  const endsWith = field("endsWith", 6);
  if (typeof raw.requireVowel !== "boolean") throw new Error("Invalid vowel preference.");
  if ([startsWith, contains, endsWith].some((value) => value.length > maxLength)) throw new Error("Your required text is longer than the maximum length.");
  // Early rejection of impossible combinations (e.g. an incompatible prefix and suffix for every allowed length).
  const possible = Array.from({ length: maxLength - minLength + 1 }, (_, i) => minLength + i).some((len) => {
    if (startsWith.length > len || endsWith.length > len || contains.length > len) return false;
    return canPlaceAll(len, startsWith, contains, endsWith);
  });
  if (!possible) throw new Error("Those prefix, contains, and suffix filters cannot fit together. Try fewer letters.");
  return { minLength, maxLength, count, style: style as GenerationStyle, inspiration, startsWith, contains, endsWith, requireVowel: raw.requireVowel };
}

function placeInto(length: number, prefix: string, infix: string, suffix: string, offset: number): string[] | null {
  const result = Array<string>(length).fill("");
  function write(text: string, start: number) {
    for (let i = 0; i < text.length; i++) {
      const index = start + i;
      if (index < 0 || index >= length || (result[index] && result[index] !== text[i])) return false;
      result[index] = text[i];
    }
    return true;
  }
  return write(prefix, 0) && write(suffix, length - suffix.length) && write(infix, offset) ? result : null;
}

function canPlaceAll(length: number, prefix: string, contains: string, suffix: string): boolean {
  for (let i = 0; i <= length - contains.length; i++) {
    if (placeInto(length, prefix, contains, suffix, i)) return true;
  }
  return false;
}

function constrainedName(length: number, options: GenerateOptions): string | null {
  const positions = Array.from({ length: length - options.contains.length + 1 }, (_, i) => i)
    .filter((position) => placeInto(length, options.startsWith, options.contains, options.endsWith, position) !== null);
  if (!positions.length) return null;
  const letters = placeInto(length, options.startsWith, options.contains, options.endsWith, choose(positions));
  if (!letters) return null;
  for (let i = 0; i < length; i++) {
    if (letters[i]) continue;
    const prev = letters[i - 1] || "";
    const next = letters[i + 1] || "";
    const vowelLikely = prev ? !isVowel(prev) : next ? !isVowel(next) : i % 2 === 1;
    letters[i] = choose((vowelLikely ? VOWELS : CONSONANTS).split(""));
  }
  return letters.join("");
}

function inventedName(): string {
  const pattern = Math.random();
  if (pattern < 0.36) return choose(ONSETS) + choose(NUCLEI) + choose(TAILS);
  if (pattern < 0.75) return choose(ONSETS) + choose(NUCLEI) + choose(ONSETS) + choose(NUCLEI);
  return choose(ONSETS) + choose(NUCLEI) + choose(TAILS) + choose(NUCLEI);
}

function minimalName(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const vowel = i % 2 === (Math.random() < 0.75 ? 1 : 0);
    result += choose((vowel ? VOWELS : CONSONANTS).split(""));
  }
  return result;
}

function inspiredName(seed: string): string {
  if (seed.length < 2) return inventedName();
  const positions = [0, 1, Math.max(0, seed.length - 2)];
  const piece = seed.slice(choose(positions), choose([2, 3, 4]));
  const readable = piece.length >= 2 ? piece : seed.slice(0, 2);
  return choose([readable + choose(NUCLEI) + choose(TAILS), choose(ONSETS) + choose(NUCLEI) + seed.slice(-2), readable + choose(TAILS) + choose(NUCLEI)]);
}

function matches(name: string, options: GenerateOptions): boolean {
  return name.length >= options.minLength && name.length <= options.maxLength
    && /^[a-z]+$/.test(name)
    && name.startsWith(options.startsWith)
    && name.includes(options.contains)
    && name.endsWith(options.endsWith)
    && (!options.requireVowel || /[aeiou]/.test(name));
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
  return Math.max(10, Math.min(99, score));
}

/** Generator never queries Instagram. It produces unverified candidates only. */
export function generateCandidates(options: GenerateOptions): Candidate[] {
  const { minLength, maxLength, style, count, inspiration } = options;
  const results = new Map<string, Candidate>();
  const hasConstraint = Boolean(options.startsWith || options.contains || options.endsWith);
  const dictionary = WORD_BANK.filter((word) => matches(word, options));
  // Randomize dictionary traversal so each batch can surface different names.
  for (let i = dictionary.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dictionary[i], dictionary[j]] = [dictionary[j], dictionary[i]];
  }
  const dictTarget = style === "words" ? count : style === "balanced" ? Math.ceil(count * 0.33) : 0;
  for (const word of dictionary.slice(0, dictTarget)) {
    results.set(word, { username: word, score: brandScore(word), label: "Dictionary word", length: word.length, origin: style });
  }
  if (style === "words") return [...results.values()].sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
  for (let attempt = 0; attempt < MAX_ATTEMPTS && results.size < count; attempt++) {
    const length = minLength + Math.floor(Math.random() * (maxLength - minLength + 1));
    let name: string;
    if (hasConstraint && Math.random() < 0.86) name = constrainedName(length, options) || "";
    else if (inspiration && Math.random() < 0.45) name = inspiredName(inspiration);
    else if (style === "minimal") name = minimalName(length);
    else name = inventedName();
    if (!matches(name, options) || results.has(name)) continue;
    results.set(name, { username: name, score: brandScore(name), label: WORD_SET.has(name) ? "Dictionary word" : "Coined name", length: name.length, origin: style });
  }
  return [...results.values()].sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
}
