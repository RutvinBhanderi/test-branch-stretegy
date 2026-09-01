import "server-only";

/**
 * Structured logging. One line of JSON per event, so a log aggregator can filter
 * on fields instead of grepping prose.
 *
 * Deliberately a thin wrapper over console: swapping in Sentry, Axiom or
 * Datadog later means editing this file only, not every call site.
 *
 * Never log a full row, a token, or anything from `serverEnv`. Log identifiers.
 */
type Level = "info" | "warn" | "error";

type Fields = Record<string, string | number | boolean | null | undefined>;

function emit(level: Level, message: string, fields: Fields = {}) {
  const line = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  // eslint-disable-next-line no-console -- this file is the one sanctioned console caller
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: Fields) => emit("info", message, fields),
  warn: (message: string, fields?: Fields) => emit("warn", message, fields),
  error: (message: string, fields?: Fields) => emit("error", message, fields),
};
