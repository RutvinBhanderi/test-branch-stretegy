import { requireStep } from "@/lib/onboarding";
import { CURRENT_POLICY_VERSION } from "@/lib/consent";
import { Button } from "@/components/ui/Button";
import { grantConsentAction } from "../actions";

// STEP 5 of 5 - consent.
export default async function ConsentPage() {
  await requireStep("consent");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">One last thing</h1>
        <p className="mt-1 text-sm text-gray-600">
          Accept the terms and privacy policy (version {CURRENT_POLICY_VERSION}) to
          finish setting up your account.
        </p>
      </div>

      {/*
        No client component here. A form whose only control is a submit button
        needs no state, so the page stays a Server Component and ships zero
        JavaScript for this step. Reach for "use client" when you need it, not by
        default. Note the action is passed directly to <form action={...}>.
      */}
      <form action={grantConsentAction}>
        <Button type="submit" className="w-full">
          Accept and continue
        </Button>
      </form>
    </div>
  );
}
