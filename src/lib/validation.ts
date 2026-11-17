import { z } from "zod";
export const normalizeUsername = (name: string) =>
  name.trim().replace(/^@/, "").toLowerCase();
export const isValidUsername = (name: string) =>
  typeof name === "string" &&
  /^[a-z0-9._]{2,10}$/.test(name) &&
  !name.startsWith(".") &&
  !name.endsWith(".") &&
  !name.includes("..");
export const usernameSchema = z
  .string()
  .max(32)
  .transform(normalizeUsername)
  .refine(
    isValidUsername,
    "Use 2–10 letters, numbers, dots or underscores; no edge or consecutive dots.",
  );
const filter = z
  .string()
  .trim()
  .toLowerCase()
  .max(10)
  .regex(/^[a-z0-9._]*$/, "Use letters a–z, numbers, dots or underscores.")
  .default("");
export const generationSchema = z
  .object({
    minLength: z.number().int().min(2).max(10),
    maxLength: z.number().int().min(2).max(10),
    count: z
      .number()
      .int()
      .min(1)
      .max(100, "Generate between 1 and 100 names per request."),
    style: z.enum([
      "balanced",
      "words",
      "invented",
      "minimal",
      "aesthetic",
      "brand",
      "random",
      "og",
    ]),
    inspiration: z
      .string()
      .trim()
      .toLowerCase()
      .max(24)
      .regex(/^[a-z]*$/, "Inspiration must contain letters a–z only.")
      .default(""),
    startsWith: filter,
    contains: filter,
    endsWith: filter,
    requireVowel: z.boolean(),
    allowNumbers: z.boolean().default(false),
    allowUnderscores: z.boolean().default(false),
    allowDots: z.boolean().default(false),
    pattern: z
      .string()
      .trim()
      .toLowerCase()
      .max(10)
      .regex(
        /^[a-z0-9._?#]*$/,
        "Pattern uses literals, ? for a letter and # for a digit.",
      )
      .default(""),
    keyword: filter,
  })
  .strict();
export const candidateSchema = z
  .object({
    username: usernameSchema,
    score: z.number().int().min(10).max(99),
    length: z.number().int().min(2).max(10),
    label: z.enum(["Dictionary word", "Coined name"]),
    origin: generationSchema.shape.style,
  })
  .strict()
  .refine((c) => c.length === c.username.length, "Incorrect username length");
export const statusSchema = z.enum([
  "UNVERIFIED",
  "NEEDS_RECHECK",
  "REPORTED_AVAILABLE",
  "REPORTED_UNAVAILABLE",
  "RESERVED_OR_UNKNOWN",
  "CLAIMED",
]);
export const verificationSchema = z
  .object({
    username: usernameSchema,
    status: statusSchema,
    note: z.string().trim().max(280).default(""),
    method: z.literal("instagram_manual"),
  })
  .strict();
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  exact: z.enum(["0", "1"]).default("0"),
  search: z
    .string()
    .max(32)
    .regex(/^[a-zA-Z0-9._]*$/)
    .default(""),
});
