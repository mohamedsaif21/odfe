import { NextResponse, type NextRequest } from "next/server"
import { createMiddlewareClient } from "@/lib/supabase/middleware"
import { isPublicPath, hasAccess, unauthorizedRedirect } from "@/lib/auth/guards"
import { getDefaultRedirect } from "@/lib/auth/role-mapper"
import type { AnyRole } from "@/types/database"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // eslint-disable-next-line prefer-const
  let response = NextResponse.next({ request })

  // Create Supabase client bound to this request (refreshes session cookie)
  const supabase = createMiddlewareClient(request, response)
  const { data: { session } } = await supabase.auth.getSession()

  // ── Public path → let through regardless of auth state ──────────────────
  if (isPublicPath(pathname)) {
    // If user is already logged in and hitting /login, redirect to their home
    if (session && (pathname === "/login" || pathname === "/register")) {
      const role = (session.user.user_metadata?.role ?? "cashier") as AnyRole
      return NextResponse.redirect(
        new URL(getDefaultRedirect(role), request.url)
      )
    }
    return response
  }

  // ── No session → redirect to login ───────────────────────────────────────
  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Check role access ────────────────────────────────────────────────────
  const role = (session.user.user_metadata?.role ?? "cashier") as AnyRole

  if (!hasAccess(pathname, role)) {
    return NextResponse.redirect(
      new URL(unauthorizedRedirect(role), request.url)
    )
  }

  // ── Root redirect → role home ────────────────────────────────────────────
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(getDefaultRedirect(role), request.url)
    )
  }

  return response
}

export const config = {
  // Run middleware on all routes except static files and API routes
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}