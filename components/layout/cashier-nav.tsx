"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ClipboardList, CreditCard, LogOut, Menu, Monitor, ShoppingCart, User, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/auth/auth.service"
import { useAuthStore } from "@/store/auth-store"

const CASHIER_LINKS = [
  { label: "POS", href: "/pos", icon: ShoppingCart },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Customer Display", href: "/customer-display", icon: Monitor },
  { label: "Payments", href: "/payments", icon: CreditCard },
]

type CashierNavProps = {
  variant?: "dropdown" | "topbar"
  className?: string
}

export function CashierNav({ variant = "dropdown", className }: CashierNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const clearUser = useAuthStore((state) => state.clearUser)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleLogout() {
    await signOut()
    clearUser()
    router.replace("/login")
  }

  function isActive(href: string) {
    return href === "/pos" ? pathname === href : pathname.startsWith(href)
  }

  const links = CASHIER_LINKS.map((item) => {
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive(item.href)
            ? "bg-odfe-gold text-odfe-charcoal"
            : variant === "topbar"
              ? "text-odfe-cream/75 hover:bg-white/10 hover:text-odfe-cream"
              : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <Icon size={15} />
        {item.label}
      </Link>
    )
  })

  if (variant === "topbar") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="hidden items-center gap-1 lg:flex">{links}</div>
        <div ref={ref} className="relative lg:hidden">
          <button
            onClick={() => setOpen((value) => !value)}
            className="flex items-center gap-1.5 rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10"
          >
            {open ? <X size={14} /> : <Menu size={14} />}
            Menu
          </button>
          {open && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
              {CASHIER_LINKS.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive(item.href) ? "bg-odfe-gold text-odfe-charcoal" : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <Icon size={15} />
                    {item.label}
                  </Link>
                )
              })}
              <div className="mt-2 border-t border-gray-100 pt-2">
                <p className="px-3 text-xs font-medium text-gray-900">{user?.fullName ?? "Cashier"}</p>
                <p className="px-3 text-[11px] text-gray-500">{user?.email}</p>
                <button onClick={handleLogout} className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10"
      >
        {open ? <X size={14} /> : <Menu size={14} />}
        Menu
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          {links}
          <div className="mt-2 border-t border-gray-100 pt-2">
            <div className="flex items-start gap-2 px-3 py-2">
              <User size={15} className="mt-0.5 text-gray-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{user?.fullName ?? "Cashier"}</p>
                <p className="truncate text-xs text-gray-500">{user?.email}</p>
                <p className="text-[11px] capitalize text-gray-400">{user?.role ?? "cashier"}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
