/**
 * Shared shape for what an onboarding Server Action returns.
 *
 * This lives OUTSIDE actions.ts on purpose. A file marked "use server" becomes a
 * remote-procedure surface: every export is turned into a callable endpoint, so
 * Next.js rejects any export that is not an async function. A plain constant
 * like `idleState` therefore cannot live there.
 *
 * Rule of thumb: "use server" files export actions and nothing else. Types and
 * constants that the client also needs go in a plain module like this one.
 */
export interface FormState {
  status: "idle" | "success" | "error";
  message?: string;
}

export const idleState: FormState = { status: "idle" };
