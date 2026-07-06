import { AdminSidebar } from "./admin-sidebar"
import { TopHeader } from "./top-header"
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
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar role={role ?? user?.role ?? "admin"} cafeName={user?.cafeName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader user={user} title={title} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}