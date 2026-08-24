export type ConsentKind = "terms" | "privacy" | "marketing";

export interface Consent {
  kind: ConsentKind;
  granted: boolean;
  policyVersion: string;
  createdAt: string;
}

/**
 * Bump when the wording changes. Consent is recorded against a version, so an
 * updated policy means the existing consent no longer counts and is re-asked.
 */
export const CURRENT_POLICY_VERSION = "2026-01-01";

/** Consent that must be granted before an account can be used. */
export const REQUIRED_CONSENTS: ConsentKind[] = ["terms", "privacy"];
