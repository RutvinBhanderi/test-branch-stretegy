import "server-only";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type Result } from "@/lib/errors";
import { logger } from "@/lib/observability/logger";
import type { OtpInput, PhoneInput } from "./schema";

/**
 * Writes for the auth domain: sending and checking one-time codes.
 *
 * Uses the USER-scoped client, not the admin client. Supabase Auth manages its
 * own tables and sets the session cookie as a side effect of verifyOtp - the
 * service role would bypass exactly the machinery we want running here.
 */

export type SendCodeError = "rate_limited" | "send_failed";
export type VerifyCodeError = "invalid_code" | "expired";

export async function sendLoginCode(
  input: PhoneInput,
): Promise<Result<null, SendCodeError>> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({ phone: input.phone });

  if (error) {
    // Never log the phone number itself - log that it happened, not to whom.
    logger.warn("otp_send_failed", { status: error.status ?? 0 });
    return fail(error.status === 429 ? "rate_limited" : "send_failed");
  }

  return ok(null);
}

/** On success Supabase sets the session cookie; the caller is now signed in. */
export async function verifyLoginCode(
  input: OtpInput,
): Promise<Result<{ userId: string }, VerifyCodeError>> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    phone: input.phone,
    token: input.token,
    type: "sms",
  });

  if (error || !data.user) {
    logger.info("otp_verify_rejected", { status: error?.status ?? 0 });
    return fail("invalid_code");
  }

  return ok({ userId: data.user.id });
}
