import {
  MINIMUM_AGE,
  ONBOARDING_STEPS,
  type OnboardingState,
  type OnboardingStep,
} from "./types";

/**
 * PURE LOGIC - the heart of this feature. No I/O, no async, no database.
 *
 * The whole onboarding flow is decided here. Every page asks "should this person
 * be on this screen?" and gets an answer from four booleans. That means the flow
 * is exhaustively testable without a browser, a session or a database - see
 * tests/onboarding/rules.test.ts.
 *
 * The alternative - scattering `if (!user.phone) redirect(...)` across five page
 * files - is how flows grow a step nobody can reach and a loop nobody escapes.
 */

/** The first gate this person has not yet cleared. */
export function nextStep(state: OnboardingState): OnboardingStep {
  if (!state.ageConfirmed) return "age-gate";
  if (!state.phoneVerified) return "phone";
  if (!state.hasAccount) return "profile";
  if (!state.hasConsented) return "consent";
  return "done";
}

export function isComplete(state: OnboardingState): boolean {
  return nextStep(state) === "done";
}

/**
 * May this person view this step?
 *
 * Yes for the step they are on, and yes for anything already cleared, so Back
 * works. No for anything ahead - that is how half-created accounts happen.
 */
export function canAccessStep(state: OnboardingState, step: OnboardingStep): boolean {
  return ONBOARDING_STEPS.indexOf(step) <= ONBOARDING_STEPS.indexOf(nextStep(state));
}

/** Where to send someone who asked for a step they have not reached. */
export function stepPath(step: OnboardingStep): string {
  return step === "age-gate" ? "/onboarding" : `/onboarding/${step}`;
}

/** The only fact worth keeping from a date of birth: are they old enough? */
export function isOldEnough(dateOfBirth: Date, now: Date = new Date()): boolean {
  let age = now.getFullYear() - dateOfBirth.getFullYear();

  const hasHadBirthdayThisYear =
    now.getMonth() > dateOfBirth.getMonth() ||
    (now.getMonth() === dateOfBirth.getMonth() && now.getDate() >= dateOfBirth.getDate());

  if (!hasHadBirthdayThisYear) age -= 1;

  return age >= MINIMUM_AGE;
}
