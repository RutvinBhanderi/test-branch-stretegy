// Stub for the `server-only` package during unit tests.
//
// `server-only` throws on import outside a React Server Component, by design -
// it is what stops lib/supabase/admin.ts leaking the service role key into a
// client bundle. Vitest is neither, so importing a barrel that re-exports a
// server-only module would blow up before a single assertion ran.
//
// Aliased in vitest.config.ts. This does NOT weaken the real guard: Next.js
// still enforces it at build time for application code.
export {};
