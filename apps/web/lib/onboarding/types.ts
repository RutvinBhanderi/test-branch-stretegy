/**
 * The gates of onboarding, in order.
 *
 * Note there is no "verify" entry. Entering a phone number and typing the code
 * are two SCREENS but one gate - you are either phone-verified or you are not.
 * Ordering screens instead of gates is how flows end up with states that are
 * unreachable from the data. The /onboarding/verify route guards on "phone".
 */
export const ONBOARDING_STEPS = [
  "age-gate",
  "phone",
  "profile",
  "consent",
  "done",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * Everything known about a person's progress. Deliberately a plain data bag with
 * no methods and no database types - it is the input to a pure function.
 */
export interface OnboardingState {
  ageConfirmed: boolean;
  phoneVerified: boolean;
  hasAccount: boolean;
  hasConsented: boolean;
}

/** Minimum legal age for cannabis retail. */
export const MINIMUM_AGE = 21;

/** Cookie holding the age-gate answer. Pre-account, so there is nowhere else. */
export const AGE_GATE_COOKIE = "gb_age_ok";
