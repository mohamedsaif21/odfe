import { NextResponse, type NextRequest } from "next/server"
import { createMiddlewareClient } from "@/lib/supabase/middleware"
import { isPublicPath, hasAccess, unauthorizedRedirect } from "@/lib/auth/guards"
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

  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (isPublicPath(pathname)) {
    if (session && (pathname === "/login" || pathname === "/register")) {
      const role = (session.user.user_metadata?.role ?? "cashier") as AnyRole
      return NextResponse.redirect(new URL(getDefaultRedirect(role), request.url))
    }
    return response
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = (session.user.user_metadata?.role ?? "cashier") as AnyRole

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
    "/((?!_next/static|_next/image|favicon.ico|api/public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
