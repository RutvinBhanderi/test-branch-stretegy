import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/config/env";

/**
 * Browser client. Anon key only - RLS policies in supabase/migrations are the
 * authorization boundary for anything called from here.
 *
 * Never import the service role key into client-facing code.
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
