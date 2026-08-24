import Link from "next/link";
import { requireStep } from "@/lib/onboarding";

// STEP 5 complete. requireStep("done") only passes once every gate is cleared.
export default async function DonePage() {
  await requireStep("done");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">You&apos;re all set</h1>
        <p className="mt-1 text-sm text-gray-600">
          Scan your first receipt to start earning points.
        </p>
      </div>

      <Link
        href="/home"
        className="rounded-lg bg-emerald-800 px-4 py-3 text-center font-medium text-white"
      >
        Go to my wallet
      </Link>

      {/*
        NEXT: wallet pass issuance belongs here, once lib/wallet/ exists. It calls
        a provider adapter in lib/providers/ - the same four-step service shape as
        everything else. Left out on purpose: an Apple PassKit stub would teach
        the wrong thing.
      */}
    </div>
  );
}
