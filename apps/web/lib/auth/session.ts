import "server-only";

import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import type { SessionAccount, SessionUser } from "./types";

/**
 * Resolving WHO is asking. Every page, action and ops operation starts here.
 *
 * Identity always comes from the session cookie, never from a form field, a query
 * string or a request body. A user can type any UUID into a form; they cannot
 * forge a session. This is the difference between "show me my balance" and "show
 * me anyone's balance".
 *
 * Uses the user-scoped client on purpose: RLS applies, so a wrong lookup still
 * cannot read someone else's row.
 */

/** Signed in, but may not have finished onboarding yet. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { userId: user.id, phone: user.phone ?? null };
}

/** Signed in AND has an account row. Null while onboarding is incomplete. */
export async function getSessionAccount(): Promise<SessionAccount | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new AppError(`Failed to resolve account: ${error.message}`);
  if (!data) return null;

  return { userId: user.id, accountId: data.id };
}

/**
 * Same, but throws when absent. Use inside Server Actions, where reaching the
 * function at all already implies an authenticated caller.
 */
export async function requireSessionAccount(): Promise<SessionAccount> {
  const account = await getSessionAccount();
  if (!account) throw new AppError("Not authenticated");
  return account;
}
