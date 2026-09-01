/**
 * Shared chrome for every onboarding screen. A layout is a Server Component and
 * does not re-render when you move between the steps inside it.
 *
 * (auth) is a ROUTE GROUP - the parentheses mean it groups files without adding
 * a URL segment. These pages live at /onboarding, not /auth/onboarding.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 p-6">
      <header>
        <p className="text-sm font-medium text-emerald-800">Greenback Cash</p>
      </header>
      {children}
    </main>
  );
}
