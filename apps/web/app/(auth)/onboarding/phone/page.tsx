import { requireStep } from "@/lib/onboarding";
import { PhoneForm } from "../_components/PhoneForm";

// STEP 2 of 5 - phone number. Same three-part shape as every other step.
export default async function PhonePage() {
  await requireStep("phone");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">What&apos;s your number?</h1>
        <p className="mt-1 text-sm text-gray-600">
          We&apos;ll text you a 6-digit code to sign in.
        </p>
      </div>
      <PhoneForm />
    </div>
  );
}
