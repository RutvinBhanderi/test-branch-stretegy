/**
 * PUBLIC environment. Safe to import from client components.
 *
 * Each value is referenced as a full static literal - `process.env.NEXT_PUBLIC_X`
 * - because Next.js inlines these at build time by string substitution. Reading
 * them dynamically (process.env[key]) yields undefined in the browser.
 */
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name} - see .env.example`);
  }
  return value;
}

export const env = {
  supabaseUrl: required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ),
} as const;
