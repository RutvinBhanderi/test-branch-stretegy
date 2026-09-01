import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, ok, type Result } from "@/lib/errors";
import { findAccountByUserId } from "./queries";
import type { CreateAccountInput } from "./schema";
import type { Account } from "./types";

/**
 * Writes. The standard four steps: read, decide, refuse, write.
 *
 * Requires the ADMIN client - the schema defines no customer-facing INSERT
 * policy, so a write through the anon key is rejected by RLS. Because the admin
 * client bypasses RLS, `userId` must come from the session and never from input.
 */
export async function createAccount(
  supabase: SupabaseClient,
  userId: string,
  input: CreateAccountInput,
): Promise<Result<Account, never>> {
  // Idempotent: onboarding can be resumed, refreshed or double-submitted, and
  // must not produce two accounts. accounts.user_id has a unique index, but
  // returning the existing row is friendlier than surfacing a constraint error.
  const existing = await findAccountByUserId(supabase, userId);
  if (existing) return ok(existing);

  const { data, error } = await supabase
    .from("accounts")
    .insert({ user_id: userId, display_name: input.displayName })
    .select("id, user_id, display_name, created_at")
    .single();

  if (error) throw new AppError(`Failed to create account: ${error.message}`);

  return ok({
    id: data.id,
    userId: data.user_id,
    displayName: data.display_name,
    createdAt: data.created_at,
  });
}
