"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/feedback/FormMessage";
import { createProfileAction } from "../actions";
import { idleState } from "../formState";

export function ProfileForm() {
  const [state, action, pending] = useActionState(createProfileAction, idleState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        id="displayName"
        name="displayName"
        label="Your name"
        autoComplete="name"
        maxLength={60}
        required
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </Button>

      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}
