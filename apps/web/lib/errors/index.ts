/**
 * One failure shape for the whole app.
 *
 * The distinction that matters:
 *
 *   EXPECTED failure  -> return a Result. The UI has to render it.
 *                        "you're under 21", "that code expired"
 *
 *   UNEXPECTED failure -> throw. The error boundary catches it.
 *                        "the database is unreachable"
 *
 * Without a shared type here, every domain invents its own `{ success, message }`
 * and the action layer ends up translating six different shapes.
 */

export type Result<T, E extends string = string> =
  | { ok: true; data: T }
  | { ok: false; error: E; message?: string };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function fail<E extends string>(error: E, message?: string): Result<never, E> {
  return { ok: false, error, message };
}

/** Thrown for genuine faults. Never for a business rule saying no. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
