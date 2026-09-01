import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import type { Consent } from "./types";

export async function getConsents(
  supabase: SupabaseClient,
  accountId: string,
): Promise<Consent[]> {
  const { data, error } = await supabase
    .from("consents")
    .select("kind, granted, policy_version, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) throw new AppError(`Failed to load consents: ${error.message}`);

  return (data ?? []).map((row) => ({
    kind: row.kind,
    granted: row.granted,
    policyVersion: row.policy_version,
    createdAt: row.created_at,
  }));
}
