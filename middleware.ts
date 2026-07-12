import { NextResponse, type NextRequest } from "next/server"
import { createMiddlewareClient } from "@/lib/supabase/middleware"
import {
  isPublicPath,
  hasAccess,
  unauthorizedRedirect,
  loginPageFor,
  REDIRECT_WHEN_AUTHED,
} from "@/lib/auth/guards"
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

  let response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)
  const { data: { session } } = await supabase.auth.getSession()

  if (pathname === "/") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    const role = await resolveRole(supabase, session.user.id)
    if (!role) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return NextResponse.redirect(new URL(getDefaultRedirect(role), request.url))
  }

  if (isPublicPath(pathname)) {
    if (session && REDIRECT_WHEN_AUTHED.includes(pathname)) {
      const role = await resolveRole(supabase, session.user.id)
      if (role) {
        return NextResponse.redirect(
          new URL(getDefaultRedirect(role), request.url)
        )
      }
    }
    return response
  }

  if (!session) {
    const loginUrl = new URL(loginPageFor(pathname), request.url)
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = await resolveRole(supabase, session.user.id)

  if (!role) {
    const url = new URL("/login", request.url)
    url.searchParams.set("error", "account_inactive")
    return NextResponse.redirect(url)
  }

  if (!hasAccess(pathname, role)) {
    const dest = unauthorizedRedirect(role)
    if (dest === pathname) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return response
}

async function resolveRole(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<AnyRole | null> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", userId)
      .single()

    if (!profile || !profile.is_active) return null
    return profile.role as AnyRole
  } catch {
    return null
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
