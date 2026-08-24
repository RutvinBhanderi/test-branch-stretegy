"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/feedback/FormMessage";
import { verifyCodeAction } from "../actions";
import { idleState } from "../formState";

/**
 * `phone` arrives as a prop from the server page - the client does not look it
 * up. It rides along in a hidden input so the action gets both values together.
 *
 * The hidden field is safe here because the phone is only used to match against
 * a code Supabase already issued; it is not an identity claim. Anything that IS
 * an identity claim gets re-derived from the session inside the action.
 */
export function VerifyForm({ phone }: { phone: string }) {
  const [state, action, pending] = useActionState(verifyCodeAction, idleState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="phone" value={phone} />

      <Field
        id="token"
        name="token"
        label="6-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Verify"}
      </Button>

      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}
