"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/store/auth-store"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"

export default function SelfOrderPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [cafeName, setCafeName] = useState("")

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push("/customer/login?redirect=/self-order")
          return
        }

        const profile = await resolveAuthenticatedProfile(session.user.id, supabase)

        if (profile.role !== "customer") {
          router.push("/dashboard")
          return
        }

        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          fullName: profile.fullName,
          cafeId: profile.cafeId,
          cafeName: "",
          avatarUrl: profile.avatarUrl,
        })

        // Load cafe name
        const { data: cafe } = await supabase
          .from("cafes")
          .select("name")
          .eq("id", profile.cafeId)
          .single()

        if (cafe) setCafeName(cafe.name)
      } catch {
        router.push("/customer/login?redirect=/self-order")
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router, setUser])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-odfe-cream">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-odfe-cream">
      <header className="bg-odfe-teal px-4 py-4">
        <h1 className="font-display text-2xl text-odfe-cream">{cafeName || "OdFe"}</h1>
        <p className="mt-1 text-sm text-odfe-cream/70">Welcome, {user?.fullName}</p>
      </header>

      <main className="flex-1 p-4">
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
          <p className="text-lg font-display text-odfe-teal">Menu & Ordering</p>
          <p className="text-sm text-gray-500">
            Browse the menu and place your order. It will be sent directly to the Brew Bar.
          </p>
          <div className="rounded-xl border border-dashed border-odfe-sage/30 bg-white p-12 text-center w-full max-w-md">
            <p className="text-sm text-gray-400">
              Menu display — coming when products are configured in Supabase.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
