"use client"

import { useState } from "react"
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

export function AdminLayout({ children, user, title, role }: AdminLayoutProps) {
  const storeUser = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const effectiveUser = user ?? storeUser
  const effectiveRole = role ?? effectiveUser?.role
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!effectiveRole && isLoading) {
    return <BrandedLoader fullScreen message="Loading..." />
  }

  if (effectiveRole === "cashier") {
    return <CashierLayout user={effectiveUser} title={title}>{children}</CashierLayout>
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        role={effectiveRole ?? "admin"}
        cafeName={effectiveUser?.cafeName}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader user={effectiveUser} title={title} onMenuClick={() => setSidebarOpen((v) => !v)} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
