import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Please enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export const otpSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email.");

export const buddyNameSchema = z
  .string()
  .trim()
  .min(1, "Give your Buddy a name.")
  .max(40, "Keep the name to 40 characters or fewer.");

export function firstError(result: z.ZodSafeParseResult<unknown>): string | null {
  return result.success ? null : (result.error.issues[0]?.message ?? "Invalid value.");
}
