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
  { label: "Bookings",         href: "/bookings",          icon: "CalendarDays",    roles: ["admin"] },
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveAuthenticatedProfile(userId: string, supabase: any): Promise<{ role: AnyRole; cafe_id: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, cafe_id, is_active")
    .eq("id", userId)
    .single()

  if (error || !data) throw new Error("Profile not found")
  if (!data.is_active) throw new Error("Account is inactive")
  if (!data.cafe_id) throw new Error("No cafe assigned")

  return { role: data.role as AnyRole, cafe_id: data.cafe_id }
}
