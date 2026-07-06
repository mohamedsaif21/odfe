import type { UserRole } from "./role-mapper"

type RouteAccess = Record<string, UserRole[]>

const routeAccess: RouteAccess = {
  "/dashboard": ["admin"],
  "/pos": ["admin", "cashier"],
  "/orders": ["admin", "cashier"],
  "/products": ["admin"],
  "/categories": ["admin"],
  "/customers": ["admin", "cashier"],
  "/tables": ["admin"],
  "/payments": ["admin"],
  "/coupons": ["admin"],
  "/employees": ["admin"],
  "/brew-bar": ["admin", "kitchen"],
  "/customer-display": ["admin", "cashier"],
  "import type { AnyRole } from "@/types/database"

/**
 * Route access matrix.
 * Key: route prefix. Value: roles that may access it.
 *
 * Checked in middleware.ts on every navigation.
 * An empty array means "authenticated only, any role".
 */
export const ROUTE_ACCESS: Record<string, AnyRole[]> = {
  // Admin-only
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

  // Cashier and admin
  "/pos":               ["admin", "cashier"],
  "/orders":            ["admin", "cashier"],
  "/customers":         ["admin", "cashier"],
  "/customer-display":  ["admin", "cashier"],

  // Kitchen and admin
  "/brew-bar":          ["admin", "kitchen"],

  // Customer only
  "/self-order":        ["customer"],
  "/account":           ["customer"],
  "/s":                 ["customer"],   // /s/[token] self-order QR

  // Public — no auth check needed
  "/login":             [],
  "/register":          [],
}

/**
 * Public paths that skip all auth middleware.
 */
export const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/s/",     // QR self-order landing (auth happens inside the page)
  "/_next",
  "/favicon",
  "/api/public",
]

/**
 * Returns true if the given path is fully public (no session needed).
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

/**
 * Returns true if the given role has access to the given pathname.
 * Walks the ROUTE_ACCESS map looking for the longest matching prefix.
 */
export function hasAccess(pathname: string, role: AnyRole): boolean {
  // Find the most specific matching route prefix
  const matchedKey = Object.keys(ROUTE_ACCESS)
    .filter((prefix) => pathname.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0]   // longest match wins

  if (!matchedKey) return true   // no rule = allow (catch-all)

  const allowed = ROUTE_ACCESS[matchedKey]
  if (allowed.length === 0) return true   // any authenticated user

  return allowed.includes(role)
}

/**
 * Returns the redirect path when a role tries to access a protected route.
 */
export function unauthorizedRedirect(role: AnyRole): string {
  const fallbacks: Record<AnyRole, string> = {
    admin:    "/dashboard",
    cashier:  "/pos",
    kitchen:  "/brew-bar",
    customer: "/self-order",
  }
  return fallbacks[role] ?? "/login"
}/self-order": ["customer"],
  "/reports": ["admin"],
  "/settings": ["admin"],
}

export function hasAccess(role: UserRole, path: string): boolean {
  const allowed = routeAccess[path]
  if (!allowed) return false
  return allowed.includes(role)
}

export function getAccessibleRoutes(role: UserRole): string[] {
  return Object.entries(routeAccess)
    .filter(([, roles]) => roles.includes(role))
    .map(([route]) => route)
}
