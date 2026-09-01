import "server-only";

import { redirect } from "next/navigation";
import { canAccessStep, nextStep, stepPath } from "./rules";
import type { OnboardingStep } from "./types";
import { getOnboardingState } from "./queries";

/**
 * One line at the top of every onboarding page.
 *
 *   export default async function PhonePage() {
 *     await requireStep("phone");
 *     ...
 *   }
 *
 * Reads the state, asks the pure rules, redirects if the answer is no. Every page
 * gets identical behaviour without repeating the branching, and the branching
 * itself stays testable because it lives in rules.ts.
 */
export async function requireStep(step: OnboardingStep): Promise<void> {
  const state = await getOnboardingState();

  if (!canAccessStep(state, step)) {
    redirect(stepPath(nextStep(state)));
  }
}
