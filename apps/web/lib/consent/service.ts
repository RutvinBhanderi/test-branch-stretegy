import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, ok, type Result } from "@/lib/errors";
import { CURRENT_POLICY_VERSION, REQUIRED_CONSENTS } from "./types";

/**
 * Writes. Consent rows are append-only by intent: withdrawing consent inserts a
 * new row with granted = false rather than editing the old one. The history is
 * the evidence of what someone agreed to and when.
 */
export async function grantRequiredConsents(
  supabase: SupabaseClient,
  accountId: string,
): Promise<Result<null, never>> {
  const rows = REQUIRED_CONSENTS.map((kind) => ({
    account_id: accountId,
    kind,
    granted: true,
    policy_version: CURRENT_POLICY_VERSION,
  }));

  const { error } = await supabase.from("consents").insert(rows);

  if (error) throw new AppError(`Failed to record consent: ${error.message}`);

  return ok(null);
}
