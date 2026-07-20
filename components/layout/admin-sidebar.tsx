"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Package,
  Tag, LayoutGrid, Users, UserCheck, CreditCard, Percent,
  Coffee, BarChart2, Settings, ChevronRight, Monitor, Archive,
  Building2, Truck, CalendarDays,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { OdfeLogo } from "@/components/branding/odfe-logo"
import { cn } from "@/lib/utils"
import { getNavItemsForRole } from "@/lib/auth/role-mapper"
import type { NavItem } from "@/types/app"
import type { AnyRole } from "@/types/database"

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, ShoppingCart, ClipboardList, Package,
  Tag, LayoutGrid, Users, UserCheck, CreditCard, Percent,
  Coffee, BarChart2, Settings, Monitor, Archive,
  Building2, Truck, CalendarDays,
}

interface AdminSidebarProps {
  role?: AnyRole
  cafeName?: string
  collapsed?: boolean
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-odfe-gold text-odfe-charcoal shadow-sm"
          : "text-odfe-cream/70 hover:bg-white/8 hover:text-odfe-cream"
      )}
    >
      <Icon
        size={18}
        className={cn(
          "shrink-0 transition-colors",
          isActive ? "text-odfe-charcoal" : "text-odfe-cream/50 group-hover:text-odfe-cream"
        )}
      />
      <span className="truncate">{item.label}</span>
      {isActive && (
        <ChevronRight size={14} className="ml-auto shrink-0 text-odfe-charcoal/60" />
      )}
    </Link>
  )
}

export function AdminSidebar({
  role = "admin",
  cafeName = "Premium Cafe POS",
  collapsed = false,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const navItems = getNavItemsForRole(role)

  const coreItems = navItems.filter((i) =>
    ["/dashboard", "/pos", "/orders"].includes(i.href)
  )
  const catalogItems = navItems.filter((i) =>
    ["/products", "/categories", "/tables"].includes(i.href)
  )
  const inventoryItems = navItems.filter((i) =>
    ["/inventory", "/suppliers", "/purchases"].includes(i.href)
  )
  const peopleItems = navItems.filter((i) =>
    ["/customers", "/customer-display", "/employees"].includes(i.href)
  )
  const financeItems = navItems.filter((i) =>
    ["/payments", "/coupons"].includes(i.href)
  )
  const opsItems = navItems.filter((i) =>
    ["/brew-bar", "/reports", "/settings", "/bookings"].includes(i.href)
  )

  const groups = [
    { label: null,        items: coreItems },
    { label: "Catalogue", items: catalogItems },
    { label: "Inventory", items: inventoryItems },
    { label: "People",    items: peopleItems },
    { label: "Finance",   items: financeItems },
    { label: "Ops",       items: opsItems },
  ].filter((g) => g.items.length > 0)

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-odfe-teal">
      <div className="border-b border-white/10 px-5 py-4">
        <Link
          href={role === "cashier" ? "/pos" : "/dashboard"}
          aria-label={role === "cashier" ? "Go to OdFe POS" : "Go to OdFe dashboard"}
          className="block"
        >
          <div className="flex h-16 items-center justify-center">
            <OdfeLogo variant={collapsed ? "icon" : "full"} size={collapsed ? "sm" : "sm"} priority />
          </div>
        </Link>
        <p className="mt-1.5 truncate text-center text-xs text-odfe-cream/50">{cafeName}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-4")}>
            {group.label && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-odfe-cream/30">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={
                    item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname.startsWith(item.href)
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-[10px] text-odfe-cream/25">
          Premium Cafe POS
        </p>
      </div>
    </aside>
  )
}
