import { requireStep } from "@/lib/onboarding";
import { ProfileForm } from "../_components/ProfileForm";

// STEP 4 of 5 - name. This is the step that creates the accounts row.
export default async function ProfilePage() {
  await requireStep("profile");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">What should we call you?</h1>
        <p className="mt-1 text-sm text-gray-600">This shows on your wallet pass.</p>
      </div>
      <ProfileForm />
    </div>
  );
}
