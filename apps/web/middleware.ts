import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/config/env";

/**
 * Runs before every matched request. Two jobs:
 *
 * 1. Refresh the Supabase session cookie. Server Components cannot write cookies,
 *    so without this the session expires and reads start failing - see the comment
 *    in lib/supabase/server.ts.
 * 2. Gate the /ops route group behind an admin_users row.
 *
 * The ops check here is a ROUTING decision only. It is not authorization. Every ops
 * operation must re-check the role server-side before it writes, because middleware
 * can be bypassed by anything that is not a browser navigation.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session as a side effect. Do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (path.startsWith("/ops")) {
    if (!user) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    const { data: admin } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!admin) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, images, and the PWA service worker.
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|workbox-.*\\.js).*)",
  ],
};
