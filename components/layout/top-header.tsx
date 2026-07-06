"use client"

import { Bell } from "lucide-react"
import { ProfileMenu } from "./profile-menu"
import { ThemeToggle } from "./theme-toggle"
import type { AuthUser } from "@/types/app"

interface TopHeaderProps {
  user?: AuthUser | null
  title?: string
}

export function TopHeader({ user, title }: TopHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      {/* Page title */}
      <div>
        {title && (
          <h1 className="text-base font-medium text-foreground">{title}</h1>
        )}
      </div>

      {/* Right-side controls */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-odfe-gold" />
        </button>

        {/* Profile */}
        <ProfileMenu user={user} />
      </div>
    </header>
  )
}