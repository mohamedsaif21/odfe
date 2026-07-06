"use client"

import { Bell, Sun, Moon } from "lucide-react"
import { useState } from "react"
import { ProfileMenu } from "./ProfileMenu"
import { cn } from "@/lib/utils"
import type { AuthUser } from "@/types/app"

interface TopHeaderProps {
  user?: AuthUser | null
  title?: string
}

export function TopHeader({ user, title }: TopHeaderProps) {
  const [darkMode, setDarkMode] = useState(false)

  function toggleTheme() {
    setDarkMode((d) => !d)
    document.documentElement.classList.toggle("dark")
  }

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
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground",
            "transition-colors hover:bg-muted hover:text-foreground"
          )}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

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