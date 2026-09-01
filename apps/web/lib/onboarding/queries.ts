import "server-only";

import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { findAccountByUserId } from "@/lib/accounts";
import { getConsents, hasRequiredConsents } from "@/lib/consent";
import { AGE_GATE_COOKIE, type OnboardingState } from "./types";

/**
 * Assembles the OnboardingState that rules.ts runs on.
 *
 * This is the ONLY place onboarding touches the outside world. It gathers four
 * booleans from four sources - a cookie, the session, the accounts table, the
 * consents table - and hands them to a pure function. All the branching lives in
 * rules.ts; none of it lives here.
 *
 * Note the cross-domain imports go through the barrels (@/lib/accounts), never
 * into another domain's internals (@/lib/accounts/queries).
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  const cookieStore = await cookies();
  const ageConfirmed = cookieStore.get(AGE_GATE_COOKIE)?.value === "1";

  const user = await getSessionUser();

  if (!user) {
    return { ageConfirmed, phoneVerified: false, hasAccount: false, hasConsented: false };
  }

  // Admin client: this runs before an account exists, so RLS policies keyed on
  // account ownership cannot help us. Every lookup below is scoped by an id that
  // came from the session, never from user input.
  const supabase = createAdminClient();

  const account = await findAccountByUserId(supabase, user.userId);

  if (!account) {
    return { ageConfirmed, phoneVerified: true, hasAccount: false, hasConsented: false };
  }

  const consents = await getConsents(supabase, account.id);

  return {
    ageConfirmed,
    phoneVerified: true,
    hasAccount: true,
    hasConsented: hasRequiredConsents(consents),
  };
}
