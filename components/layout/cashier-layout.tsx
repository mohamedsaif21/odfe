"use client"

import Link from "next/link"
import { OdfeLogo } from "@/components/branding/odfe-logo"
import { CashierNav } from "./cashier-nav"
import { ProfileMenu } from "./profile-menu"
import type { AuthUser } from "@/types/app"

type CashierLayoutProps = {
  children: React.ReactNode
  user?: AuthUser | null
  title?: string
}

export function CashierLayout({ children, user, title }: CashierLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-white/10 bg-odfe-teal px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href="/pos" aria-label="Go to OdFe POS" className="shrink-0">
            <OdfeLogo variant="full" size="sm" priority />
          </Link>
          {title && <span className="hidden text-sm text-odfe-cream/50 sm:inline">/ {title}</span>}
        </div>
        <CashierNav variant="topbar" className="ml-auto" />
        <ProfileMenu user={user} />
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
