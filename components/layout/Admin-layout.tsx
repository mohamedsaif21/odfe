"use client"

import { AdminSidebar } from "./admin-sidebar"
import { CashierLayout } from "./cashier-layout"
import { TopHeader } from "./top-header"
import { BrandedLoader } from "@/components/branding/branded-loader"
import { useAuthStore } from "@/store/auth-store"
import type { AuthUser } from "@/types/app"
import type { AnyRole } from "@/types/database"

interface AdminLayoutProps {
  children: React.ReactNode
  user?: AuthUser | null
  title?: string
  role?: AnyRole
}

/**
 * Top-level layout shell for all staff-facing pages
 * (admin, cashier, kitchen views).
 *
 * Structure:
 *   ┌──────────────────────────────────┐
 *   │  Sidebar (64px)  │  Top header  │
 *   │                  │  ──────────  │
 *   │                  │  Page content│
 *   └──────────────────────────────────┘
 */
export function AdminLayout({ children, user, title, role }: AdminLayoutProps) {
  const storeUser = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const effectiveUser = user ?? storeUser
  const effectiveRole = role ?? effectiveUser?.role

  if (!effectiveRole && isLoading) {
    return <BrandedLoader fullScreen message="Loading..." />
  }

  if (effectiveRole === "cashier") {
    return <CashierLayout user={effectiveUser} title={title}>{children}</CashierLayout>
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar role={effectiveRole ?? "admin"} cafeName={effectiveUser?.cafeName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader user={effectiveUser} title={title} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
