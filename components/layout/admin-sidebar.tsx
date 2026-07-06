"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Package,
  Tag, LayoutGrid, Users, UserCheck, CreditCard, Percent,
  CalendarDays, Coffee, BarChart2, Settings, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { NavItem } from "@/types/app"
import type { AnyRole } from "@/types/database"
import { getNavItemsForRole } from "@/lib/auth/role-mapper"

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard, ShoppingCart, ClipboardList, Package,
  Tag, LayoutGrid, Users, UserCheck, CreditCard, Percent,
  CalendarDays, Coffee, BarChart2, Settings,
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
  cafeName = "OdFe Cafe",
}: AdminSidebarProps) {
  const pathname = usePathname()
  const navItems = getNavItemsForRole(role)

  // Group items for visual separation
  const coreItems = navItems.filter((i) =>
    ["/dashboard", "/pos", "/orders"].includes(i.href)
  )
  const catalogItems = navItems.filter((i) =>
    ["/products", "/categories", "/tables"].includes(i.href)
  )
  const peopleItems = navItems.filter((i) =>
    ["/customers", "/employees", "/bookings"].includes(i.href)
  )
  const financeItems = navItems.filter((i) =>
    ["/payments", "/coupons"].includes(i.href)
  )
  const opsItems = navItems.filter((i) =>
    ["/brew-bar", "/reports", "/settings"].includes(i.href)
  )

  const groups = [
    { label: null,        items: coreItems },
    { label: "Catalogue", items: catalogItems },
    { label: "People",    items: peopleItems },
    { label: "Finance",   items: financeItems },
    { label: "Ops",       items: opsItems },
  ].filter((g) => g.items.length > 0)

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-odfe-teal">
      {/* Logo mark — the design signature: Anton type + gold underline rule */}
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-end gap-1.5">
          <span
            className="font-display text-2xl leading-none tracking-wide text-odfe-cream"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            OdFe
          </span>
          <span className="mb-0.5 text-[10px] uppercase tracking-[0.2em] text-odfe-sage-light">
            POS
          </span>
        </div>
        {/* Gold rule — the one deliberate design risk: a single 2px gold line
            under the logo. Too thin to shout, too precise to ignore. */}
        <div className="mt-2 h-0.5 w-8 rounded-full bg-odfe-gold" />
        <p className="mt-2 truncate text-xs text-odfe-cream/50">{cafeName}</p>
      </div>

      {/* Nav */}
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

      {/* Footer hint */}
      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-[10px] text-odfe-cream/25">
          Premium Cafe POS · Day 1
        </p>
      </div>
    </aside>
  )
}