import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

/** Label + input + hint. A primitive: no domain knowledge, no fetching. */
export function Field({ label, hint, id, className = "", ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`rounded-lg border border-gray-300 px-3 py-3 text-base ${className}`}
      />
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
