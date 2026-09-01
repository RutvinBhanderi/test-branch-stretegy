import "server-only";

import { z } from "zod";

/**
 * SECRET environment. Never importable from a client component - the
 * `server-only` import above turns that into a build error.
 *
 * Parsed once, at module load. A missing service-role key crashes the process on
 * boot with a readable message, instead of surfacing as `undefined` inside a
 * payout at 3am. That trade - fail early, fail loudly - is the whole point.
 */
const ServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Optional until the integrations are provisioned. Make them required as each
  // one ships, so a misconfigured deploy fails at boot rather than mid-flow.
  APPLE_PASS_TYPE_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  GOOGLE_WALLET_ISSUER_ID: z.string().optional(),
  PAYOUT_PROVIDER_API_KEY: z.string().optional(),
});

const parsed = ServerEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid server environment: ${missing} - see .env.example`);
}

export const serverEnv = parsed.data;
