import type { AnyRole } from "@/types/database"

/**
 * Route access matrix.
 * Key: route prefix. Value: roles that may access it.
 */
export const ROUTE_ACCESS: Record<string, AnyRole[]> = {
  "/dashboard": ["admin"],
  "/products": ["admin"],
  "/categories": ["admin"],
  "/tables": ["admin"],
  "/employees": ["admin"],
  "/payments": ["admin"],
  "/coupons": ["admin"],
  "/reports": ["admin"],
  "/settings": ["admin"],
  "/pos": ["admin", "cashier"],
  "/orders": ["admin", "cashier"],
  "/customers": ["admin", "cashier"],
  "/customer-display": ["admin", "cashier"],
  "/brew-bar": ["admin", "kitchen"],
  "/self-order": ["customer"],
  "/customer/orders": ["customer"],
  "/customer/profile": ["customer"],
}

/**
 * Paths that are always public.
 */
export const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/customer/login",
  "/customer/register",
  "/s",
  "/api/health",
  "/api/public",
  "/_next",
  "/favicon",
]

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export function isQRPath(pathname: string): boolean {
  return /^\/s\/[^/]+$/.test(pathname)
}

export function hasAccess(pathname: string, role: AnyRole): boolean {
  if (role === "admin") return true

  if (isQRPath(pathname) || isPublicPath(pathname)) return true

  const matchedKey = Object.keys(ROUTE_ACCESS)
    .filter((prefix) => pathname.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0]

  if (!matchedKey) return false

  return ROUTE_ACCESS[matchedKey].includes(role)
}

export function unauthorizedRedirect(role: AnyRole): string {
  const fallbacks: Record<AnyRole, string> = {
    admin: "/dashboard",
    cashier: "/pos",
    kitchen: "/brew-bar",
    customer: "/self-order",
  }
  return fallbacks[role] ?? "/login"
}
