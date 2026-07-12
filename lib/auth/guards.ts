import type { AnyRole } from "@/types/database"

export const ROUTE_ACCESS: Record<string, AnyRole[]> = {
  "/dashboard":         ["admin"],
  "/products":          ["admin"],
  "/categories":        ["admin"],
  "/tables":            ["admin"],
  "/employees":         ["admin"],
  "/payments":          ["admin"],
  "/coupons":           ["admin"],
  "/bookings":          ["admin"],
  "/reports":           ["admin"],
  "/settings":          ["admin"],

  "/pos":               ["admin", "cashier"],
  "/orders":            ["admin", "cashier"],
  "/customers":         ["admin", "cashier"],
  "/customer-display":  ["admin", "cashier"],

  "/brew-bar":          ["admin", "kitchen"],

  "/self-order":        ["customer"],
  "/customer/orders":   ["customer"],
  "/customer/profile":  ["customer"],
}

export const PUBLIC_PATHS: string[] = [
  "/",
  "/login",
  "/register",
  "/customer/login",
  "/customer/register",
  "/s/",
  "/_next",
  "/favicon",
  "/api/public",
]

export function loginPageFor(pathname: string): string {
  if (
    pathname.startsWith("/self-order") ||
    pathname.startsWith("/customer/")
  ) {
    return "/customer/login"
  }
  return "/login"
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export function hasAccess(pathname: string, role: AnyRole): boolean {
  const matchedKey = Object.keys(ROUTE_ACCESS)
    .filter((prefix) => pathname.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0]

  if (!matchedKey) return true

  const allowed = ROUTE_ACCESS[matchedKey]
  if (allowed.length === 0) return true

  return allowed.includes(role)
}

export function unauthorizedRedirect(role: AnyRole): string {
  const homes: Record<AnyRole, string> = {
    admin:    "/dashboard",
    cashier:  "/pos",
    kitchen:  "/brew-bar",
    customer: "/self-order",
  }
  return homes[role] ?? "/login"
}

export const REDIRECT_WHEN_AUTHED: string[] = [
  "/login",
  "/register",
  "/customer/login",
  "/customer/register",
]
