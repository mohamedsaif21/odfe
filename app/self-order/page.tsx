"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/store/auth-store"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"
import { CustomerMenu } from "@/components/self-order/customer-menu"
import {
  fetchCustomerByProfileId,
  fetchPublicMenu,
  fetchSelfOrderSettings,
  type PublicMenuCategory,
  type SelfOrderMode,
} from "@/lib/services/self-order.service"
import type { Customer } from "@/types/database"

export default function SelfOrderPage() {
  const router = useRouter()
  const { user, setUser, clearUser } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [cafeName, setCafeName] = useState("")
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [menu, setMenu] = useState<PublicMenuCategory[]>([])
  const [mode, setMode] = useState<SelfOrderMode>("online_ordering")

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

        const customerRow = await fetchCustomerByProfileId(profile.id, supabase)
        setCustomer(customerRow)

        const { data: cafe } = await supabase
          .from("cafes")
          .select("name")
          .eq("id", profile.cafeId)
          .single()

        if (cafe) setCafeName(cafe.name)

        const [categories, settings] = await Promise.all([
          fetchPublicMenu(profile.cafeId, supabase),
          fetchSelfOrderSettings(profile.cafeId, supabase),
        ])
        setMenu(categories)
        setMode(settings.mode)
      } catch {
        router.push("/customer/login?redirect=/self-order")
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router, setUser])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearUser()
    router.push("/customer/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-odfe-cream">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-odfe-cream">
      <header className="bg-odfe-teal px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-odfe-cream">{cafeName || "OdFe"}</h1>
            <p className="mt-1 text-sm text-odfe-cream/70">{customer?.name ?? user?.fullName}</p>
            <p className="text-xs text-odfe-cream/60">{customer?.email ?? user?.email}</p>
            <p className="text-xs text-odfe-gold">Loyalty points: {customer?.loyalty_points ?? 0}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10"
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </header>

      {customer && (
        <CustomerMenu
          cafeId={user?.cafeId ?? customer.cafe_id}
          cafeName={cafeName || "OdFe"}
          tableId={null}
          tableLabel={null}
          customer={customer}
          menu={menu}
          mode={mode}
        />
      )}
    </div>
  )
}
