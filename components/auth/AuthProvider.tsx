"use client"

import { useEffect, useRef } from "react"
import { useAuthStore } from "@/store/auth-store"
import { restoreSession } from "@/lib/auth/auth.service"

/**
 * Mount once at the root layout.
 * Restores AuthUser from existing Supabase session on every hard refresh.
 * Does NOT redirect — middleware handles that.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    setLoading(true)
    restoreSession()
      .then((user) => setUser(user))
      .catch(() => setUser(null))
  }, [setUser, setLoading])

  return <>{children}</>
}