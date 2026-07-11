import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User, ChevronDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/utils/format"
import { ROLE_LABELS } from "@/lib/auth/role-mapper"
import { signOut } from "@/lib/auth/auth.service"
import { useAuthStore } from "@/store/auth-store"
import type { AuthUser } from "@/types/app"

interface ProfileMenuProps {
  user?: AuthUser | null
}

export function ProfileMenu({ user: userProp }: ProfileMenuProps) {
  const router   = useRouter()
  const storeUser = useAuthStore(s => s.user)
  const clearUser = useAuthStore(s => s.clearUser)
  const user = userProp ?? storeUser

  const [open, setOpen]         = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await signOut()
    } finally {
      clearUser()
      router.replace("/login")
    }
  }

  const displayName = user?.fullName ?? "Staff"
  const roleLabel   = user?.role ? ROLE_LABELS[user.role] : "Guest"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-odfe-teal text-[11px] font-bold text-odfe-cream">
          {initials(displayName)}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-xs font-medium leading-none text-foreground">{displayName}</p>
          <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">{roleLabel}</p>
        </div>
        <ChevronDown
          size={13}
          className={cn("text-muted-foreground transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-52 animate-fade-in rounded-lg border border-border bg-card shadow-md">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <p className="mt-1 text-[10px] capitalize text-muted-foreground">{roleLabel}</p>
          </div>
          <div className="p-1">
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <User size={15} className="text-muted-foreground" />
              Profile
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-odfe-danger transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              {loggingOut
                ? <Loader2 size={15} className="animate-spin" />
                : <LogOut size={15} />
              }
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}