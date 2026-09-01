import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/config/env";
import { serverEnv } from "@/lib/config/serverEnv";

/**
 * Service-role client. THIS BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * Every write in the app goes through here, because the schema deliberately
 * defines no customer-facing INSERT/UPDATE policies - see the closing comment in
 * supabase/migrations/00000000000000_initial_schema.sql.
 *
 * Because RLS does not apply, it is NOT a safety net on this path. Any query you
 * write here must scope itself to the caller explicitly:
 *
 *   .eq("account_id", accountId)   <- you must write this; RLS will not add it
 *
 * Rules:
 * - Never import this from a client component. The `server-only` import above
 *   makes that a build error rather than a leaked key.
 * - Resolve the caller's identity from the session (lib/auth), never from a form
 *   field or a request body.
 */
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
