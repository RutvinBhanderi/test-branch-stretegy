export { nextStep, isComplete, canAccessStep, stepPath, isOldEnough } from "./rules";
export { getOnboardingState } from "./queries";
export { requireStep } from "./guard";
export { AgeGateSchema } from "./schema";
export type { AgeGateInput } from "./schema";
export {
  ONBOARDING_STEPS,
  MINIMUM_AGE,
  AGE_GATE_COOKIE,
  type OnboardingStep,
  type OnboardingState,
} from "./types";
