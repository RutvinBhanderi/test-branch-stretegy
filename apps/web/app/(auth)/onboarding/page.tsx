import { requireStep } from "@/lib/onboarding";
import { AgeGateForm } from "./_components/AgeGateForm";

// =============================================================================
// STEP 1 of 5 - age gate
//
// THE SHAPE EVERY ONBOARDING PAGE FOLLOWS:
//
//   1. await requireStep("<this step>")   guard - redirects if they can't be here
//   2. fetch anything the screen needs    via lib/, if applicable
//   3. render a client form               plain props down, Server Action up
//
// The page is a Server Component. It never has "use client", never fetches over
// HTTP, and never contains a business rule - the rule about being 21 lives in
// lib/onboarding/rules.ts.
// =============================================================================

export default async function AgeGatePage() {
  await requireStep("age-gate");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Confirm your age</h1>
        <p className="mt-1 text-sm text-gray-600">
          You must be 21 or older. We keep the answer, not your date of birth.
        </p>
      </div>
      <AgeGateForm />
    </div>
  );
}
