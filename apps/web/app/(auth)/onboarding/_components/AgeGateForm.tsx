"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/feedback/FormMessage";
import { confirmAgeAction } from "../actions";
import { idleState } from "../formState";

/**
 * A CLIENT COMPONENT - it needs "use client" because it has an input and pending
 * state, neither of which exists on the server.
 *
 * What it does NOT do: fetch anything, import Supabase, or decide anything. It
 * calls a Server Action and renders what comes back. There is no useEffect and no
 * API call in this file.
 *
 * useActionState gives you three things:
 *   state   - whatever the action returned last time
 *   action  - hand this straight to <form action={...}>
 *   pending - true while it is in flight
 */
export function AgeGateForm() {
  const [state, action, pending] = useActionState(confirmAgeAction, idleState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        id="dateOfBirth"
        name="dateOfBirth"
        type="date"
        label="Date of birth"
        required
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </Button>

      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}
