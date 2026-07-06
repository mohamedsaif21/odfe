import type { AnyRole, EmployeeRole } from "@/types/database"
import type { NavItem, RoleRedirect } from "@/types/app"

/**
 * After login, each role lands on a different page.
 * Employees come from the `employees` table; customers from `customers`.
 */
export const ROLE_REDIRECTS: RoleRedirect = {
  admin: "/dashboard",
  cashier: "/pos",
  kitchen: "/brew-bar",
  customer: "/self-order",
}

export function getDefaultRedirect(role: AnyRole): string {
  return ROLE_REDIRECTS[role] ?? "/login"
}

/**
 * All admin sidebar navigation items.
 * Roles array controls visibility — unused today, enforced in guards.
 */
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

/**
 * Determine a user's role from the profiles table.
 * Employees have a role of admin/cashier/kitchen; customers have "customer".
 */
export function isEmployeeRole(role: AnyRole): role is EmployeeRole {
  return role === "admin" || role === "cashier" || role === "kitchen"
}

export function isAdminRole(role: AnyRole): boolean {
  return role === "admin"
}

export function isCustomerRole(role: AnyRole): boolean {
  return role === "customer"
}

/**
 * Human-readable role labels for UI display.
 */
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