import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import type { Account } from "./types";

/**
 * Reads. Touches the database, makes no decisions.
 *
 * The Supabase client is a parameter, not an import: tests pass a stub, and the
 * caller has to choose which client - and therefore which security model.
 */
export async function findAccountByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<Account | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, user_id, display_name, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new AppError(`Failed to load account: ${error.message}`);
  if (!data) return null;

  // snake_case stops here. Column names never travel further into the app.
  return {
    id: data.id,
    userId: data.user_id,
    displayName: data.display_name,
    createdAt: data.created_at,
  };
}
