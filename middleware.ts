import { NextResponse, type NextRequest } from "next/server"
import { createMiddlewareClient } from "@/lib/supabase/middleware"
import { isPublicPath, hasAccess, unauthorizedRedirect, isQRPath } from "@/lib/auth/guards"
import { getDefaultRedirect } from "@/lib/auth/role-mapper"
import type { AnyRole } from "@/types/database"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // QR token paths are publicly accessible (menu display)
  if (isQRPath(pathname)) {
    return NextResponse.next()
  }

  if (process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true") {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (isPublicPath(pathname)) {
    if (session && (pathname === "/login" || pathname === "/register")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()

      if (profile?.role) {
        return NextResponse.redirect(
          new URL(getDefaultRedirect(profile.role as AnyRole), request.url)
        )
      }
    }
    return response
  }

  if (!session) {
    if (pathname.startsWith("/customer")) {
      const loginUrl = new URL("/customer/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", session.user.id)
    .single()

  if (!profile || !profile.is_active) {
    const url = new URL("/login", request.url)
    url.searchParams.set("error", "account_inactive")
    await supabase.auth.signOut()
    return NextResponse.redirect(url)
  }

  const role = profile.role as AnyRole

  if (!hasAccess(pathname, role)) {
    return NextResponse.redirect(new URL(unauthorizedRedirect(role), request.url))
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(getDefaultRedirect(role), request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
