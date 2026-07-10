import { createClient } from "@/lib/supabase/client"
import type { AnyRole, EmployeeRole } from "@/types/database"
import type { NavItem, RoleRedirect } from "@/types/app"

export const ROLE_REDIRECTS: RoleRedirect = {
  admin: "/dashboard",
  cashier: "/pos",
  kitchen: "/brew-bar",
  customer: "/self-order",
}

export function getDefaultRedirect(role: AnyRole): string {
  return ROLE_REDIRECTS[role] ?? "/login"
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",        href: "/dashboard",         icon: "LayoutDashboard", roles: ["admin"] },
  { label: "POS",              href: "/pos",               icon: "ShoppingCart",    roles: ["admin", "cashier"] },
  { label: "Orders",           href: "/orders",            icon: "ClipboardList",   roles: ["admin", "cashier"] },
  { label: "Products",         href: "/products",          icon: "Package",         roles: ["admin"] },
  { label: "Categories",       href: "/categories",        icon: "Tag",             roles: ["admin"] },
  { label: "Tables",           href: "/tables",            icon: "LayoutGrid",      roles: ["admin"] },
  { label: "Customers",        href: "/customers",         icon: "Users",           roles: ["admin", "cashier"] },
  { label: "Employees",        href: "/employees",         icon: "UserCheck",       roles: ["admin"] },
  { label: "Payments",         href: "/payments",          icon: "CreditCard",      roles: ["admin"] },
  { label: "Coupons",          href: "/coupons",           icon: "Percent",         roles: ["admin"] },
  { label: "Brew Bar",         href: "/brew-bar",          icon: "Coffee",          roles: ["admin", "kitchen"] },
  { label: "Reports",          href: "/reports",           icon: "BarChart2",       roles: ["admin"] },
  { label: "Settings",         href: "/settings",          icon: "Settings",        roles: ["admin"] },
]

export function getNavItemsForRole(role: AnyRole): NavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role))
}

export function isEmployeeRole(role: AnyRole): role is EmployeeRole {
  return role === "admin" || role === "cashier" || role === "kitchen"
}

export function isAdminRole(role: AnyRole): boolean {
  return role === "admin"
}

export function isCustomerRole(role: AnyRole): boolean {
  return role === "customer"
}

export const ROLE_LABELS: Record<AnyRole, string> = {
  admin: "Admin",
  cashier: "Cashier",
  kitchen: "Kitchen",
  customer: "Customer",
}

export const ROLE_COLORS: Record<AnyRole, string> = {
  admin: "bg-odfe-teal text-odfe-cream",
  cashier: "bg-odfe-sage text-odfe-charcoal",
  kitchen: "bg-odfe-gold text-odfe-charcoal",
  customer: "bg-odfe-charcoal-light text-odfe-cream",
}

// ─── Profile resolution ──────────────────────────────────────────────────

export interface ResolvedProfile {
  id: string
  cafeId: string
  role: AnyRole
  fullName: string
  email: string
  avatarUrl: string | null
  isActive: boolean
}

export async function resolveAuthenticatedProfile(
  userId: string,
  client?: ReturnType<typeof createClient>
): Promise<ResolvedProfile> {
  const supabase = client ?? createClient()

  const { data: profile, error } = await (supabase
    .from("profiles") as any)
    .select("id, cafe_id, role, full_name, email, avatar_url, is_active")
    .eq("id", userId)
    .single()

  if (error || !profile) {
    throw new Error("Profile not found")
  }

  if (!profile.is_active) {
    throw new Error("Account inactive")
  }

  const role = profile.role as AnyRole
  if (!isEmployeeRole(role) && !isCustomerRole(role)) {
    throw new Error("Unsupported role")
  }

  if (!profile.cafe_id) {
    throw new Error("Missing cafe assignment")
  }

  return {
    id: profile.id,
    cafeId: profile.cafe_id,
    role,
    fullName: profile.full_name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    isActive: profile.is_active,
  }
}
