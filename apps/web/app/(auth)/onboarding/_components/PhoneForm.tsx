"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/feedback/FormMessage";
import { sendCodeAction } from "../actions";
import { idleState } from "../formState";

export function PhoneForm() {
  const [state, action, pending] = useActionState(sendCodeAction, idleState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        id="phone"
        name="phone"
        type="tel"
        label="Mobile number"
        hint="Include your country code, e.g. +14155550123"
        placeholder="+14155550123"
        required
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send code"}
      </Button>

      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}
