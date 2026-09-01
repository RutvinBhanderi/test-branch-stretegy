import { z } from "zod";

/** Everything entering the auth domain is parsed through these first. */

export const PhoneSchema = z.object({
  // E.164. Deliberately strict: a malformed number wastes an SMS and confuses
  // the user with a code that never arrives.
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Enter a phone number including country code, e.g. +14155550123"),
});

export const OtpSchema = PhoneSchema.extend({
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export type PhoneInput = z.infer<typeof PhoneSchema>;
export type OtpInput = z.infer<typeof OtpSchema>;
