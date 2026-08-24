import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";

/**
 * User-scoped server client. Anon key plus THIS request's session cookie, so
 * Postgres knows who is asking and RLS policies apply.
 *
 * It is a function, not a shared constant, on purpose: it closes over the
 * current request's cookies. A module-level instance would be reused across
 * concurrent requests and serve one user's data to another.
 */
type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. Not an error: middleware
          // already refreshed the session for this request.
        }
      },
    },
  });
}
