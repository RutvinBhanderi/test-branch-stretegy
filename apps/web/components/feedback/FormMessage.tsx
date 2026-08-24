/** Renders the message a Server Action returned. Nothing else. */
export function FormMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message?: string;
}) {
  if (status === "idle" || !message) return null;

  return (
    <p
      role={status === "error" ? "alert" : "status"}
      className={status === "error" ? "text-sm text-red-600" : "text-sm text-emerald-700"}
    >
      {message}
    </p>
  );
}
