import { CURRENT_POLICY_VERSION, REQUIRED_CONSENTS, type Consent } from "./types";

/**
 * Pure logic. No I/O, no async, no database - give it an array, get an answer.
 * This is the most heavily tested kind of file in the codebase.
 */

/** Has this person granted everything required, under the CURRENT policy? */
export function hasRequiredConsents(consents: Consent[]): boolean {
  return REQUIRED_CONSENTS.every((kind) =>
    consents.some(
      (consent) =>
        consent.kind === kind &&
        consent.granted &&
        consent.policyVersion === CURRENT_POLICY_VERSION,
    ),
  );
}
