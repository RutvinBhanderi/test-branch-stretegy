import { redirect } from "next/navigation";
import { getOnboardingState, nextStep, stepPath, isComplete } from "@/lib/onboarding";

/**
 * The root route decides where you belong.
 *
 * Note it holds no branching of its own: it fetches state and asks the pure rules
 * in lib/onboarding/rules.ts. Every routing decision in this flow is made by one
 * tested function, not scattered across pages.
 */
export default async function RootPage() {
  const state = await getOnboardingState();

  if (isComplete(state)) redirect("/home");

  redirect(stepPath(nextStep(state)));
}
