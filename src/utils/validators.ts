import { z } from "zod";

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function sanitizeText(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/\0/g, "").trim();
}

export function normalizeUrl(u: string): string {
  const v = u.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export const companyNameSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(
    z
      .string()
      .min(2, "Must be at least 2 characters")
      .max(100, "Must be 100 characters or fewer")
      .regex(/^[\p{L}\p{N} \-&'.]+$/u, "Only letters, numbers, spaces, - & ' . allowed")
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .regex(EMAIL_REGEX, "Please enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .refine((v) => !/\s/.test(v), "Password cannot contain spaces");

export const urlSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === "" || /^https?:\/\//i.test(v), {
    message: "Please enter a valid website URL starting with https://",
  })
  .refine((v) => !/^javascript:|^data:/i.test(v), { message: "Invalid URL" })
  .refine((v) => v.length <= 2048, { message: "URL is too long" });

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  company_name: z.string().max(100).optional().default(""),
  industry: z.string().optional().default(""),
  team_size: z.string().optional().default(""),
  website_url: urlSchema.optional().default(""),
});

export const otpSchema = z.object({
  email: emailSchema,
  token: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  type: z.enum(["signup", "email", "recovery"]),
});

export const checkEmailSchema = z.object({ email: emailSchema });
export const resetReqSchema = z.object({ email: emailSchema });
