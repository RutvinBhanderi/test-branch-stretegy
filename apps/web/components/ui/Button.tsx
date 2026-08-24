import type { ButtonHTMLAttributes } from "react";

/**
 * A primitive. Props in, markup out - no data fetching, no business rules, no
 * knowledge of any domain. That is what makes it reusable across routes.
 *
 * Note: no "use client". A component only needs that directive if it uses hooks
 * or handlers itself. This one just forwards props, so it can render inside a
 * Server Component OR a client one.
 */
export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg bg-emerald-800 px-4 py-3 font-medium text-white transition hover:bg-emerald-900 disabled:opacity-50 ${className}`}
    />
  );
}
