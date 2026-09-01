import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/auth";
import { PointsBadge } from "@/components/ui/PointsBadge";

/**
 * Placeholder. Onboarding lands here, so it has to exist - but the balance,
 * payout progress, scan CTA and nearby offers are not built yet.
 *
 * When you build it, follow the shape in ARCHITECTURE.md section 5: resolve the
 * session, fetch through lib/<domain>/queries.ts, compute with pure functions,
 * hand plain props to client components.
 */
export default async function HomePage() {
  const account = await getSessionAccount();
  if (!account) redirect("/");

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Your wallet</h1>
      <PointsBadge points={0} />
      <p className="text-sm text-gray-600">
        Balance, scan and offers land here - see ARCHITECTURE.md section 5.
      </p>
    </main>
  );
}
