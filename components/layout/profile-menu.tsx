"use client"

import { useState, useRef, useEffect } from "react"
import { LogOut, User, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/utils/format"
import { ROLE_LABELS } from "@/lib/auth/role-mapper"
import type { AuthUser } from "@/types/app"

interface ProfileMenuProps {
  user?: AuthUser | null
}

export function ProfileMenu({ user }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const displayName = user?.fullName ?? "Staff"
  const roleLabel = user?.role ? ROLE_LABELS[user.role] : "Guest"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
      >
        {/* Avatar */}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-odfe-teal text-[11px] font-bold text-odfe-cream">
          {initials(displayName)}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-xs font-medium leading-none text-foreground">
            {displayName}
          </p>
          <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">
            {roleLabel}
          </p>
        </div>
        <ChevronDown
          size={13}
          className={cn(
            "text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-52 animate-fade-in rounded-lg border border-border bg-card shadow-md">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="p-1">
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <User size={15} className="text-muted-foreground" />
              Profile
            </button>
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-odfe-danger transition-colors hover:bg-destructive/10">
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}