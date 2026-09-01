import { redirect } from "next/navigation";
import { requireStep } from "@/lib/onboarding";
import { VerifyForm } from "../_components/VerifyForm";

/**
 * STEP 3 of 5 - enter the code.
 *
 * Guards on "phone", not "verify". Entering a number and typing the code are two
 * screens but one gate: you are either phone-verified or you are not. See the
 * note in lib/onboarding/types.ts.
 *
 * searchParams is a Promise in Next 15 - it must be awaited.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  await requireStep("phone");

  const { phone } = await searchParams;

  // Reached directly without a number to verify - send them back a step.
  if (!phone) redirect("/onboarding/phone");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Enter your code</h1>
        <p className="mt-1 text-sm text-gray-600">We sent a 6-digit code to {phone}.</p>
      </div>
      <VerifyForm phone={phone} />
    </div>
  );
}
