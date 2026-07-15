"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  fetchCustomerByProfileId,
  fetchPublicMenu,
  fetchSelfOrderSettings,
  resolveSelfOrderToken,
  type PublicMenuCategory,
  type SelfOrderMode,
} from "@/lib/services/self-order.service"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"
import { useAuthStore } from "@/store/auth-store"
import { CustomerMenu } from "@/components/self-order/customer-menu"
import type { Customer } from "@/types/database"

export default function QrSelfOrderPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const { setUser, clearUser } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cafeId, setCafeId] = useState("")
  const [cafeName, setCafeName] = useState("")
  const [tableId, setTableId] = useState("")
  const [tableLabel, setTableLabel] = useState("")
  const [menu, setMenu] = useState<PublicMenuCategory[]>([])
  const [mode, setMode] = useState<SelfOrderMode>("online_ordering")
  const [customer, setCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const token = params.token
        if (!token) throw new Error("Invalid QR code")

        const supabase = createClient()
        let resolved: Awaited<ReturnType<typeof resolveSelfOrderToken>>
        try {
          resolved = await resolveSelfOrderToken(token, supabase)
        } catch {
          throw new Error("Invalid or inactive table QR code.")
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push(`/customer/login?redirect=${encodeURIComponent(`/s/${token}`)}`)
          return
        }

        const profile = await resolveAuthenticatedProfile(session.user.id, supabase)
        if (profile.role !== "customer") {
          throw new Error("Please sign in with a customer account to use table ordering.")
        }

        const customerRow = await fetchCustomerByProfileId(profile.id, supabase)
        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          fullName: profile.fullName,
          cafeId: profile.cafeId,
          cafeName: "",
          avatarUrl: profile.avatarUrl,
        })

        setCustomer(customerRow)
        setCafeId(resolved.cafeId)
        setTableId(resolved.tableId)
        setTableLabel(resolved.tableLabel)

        const { data: cafe } = await supabase
          .from("cafes")
          .select("name")
          .eq("id", resolved.cafeId)
          .single()
        if (cafe) setCafeName(cafe.name)

        const [categories, settings] = await Promise.all([
          fetchPublicMenu(resolved.cafeId, supabase),
          fetchSelfOrderSettings(resolved.cafeId, supabase),
        ])
        setMenu(categories)
        setMode(settings.mode)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load menu")
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [params.token, router, setUser])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearUser()
    router.push("/customer/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-odfe-cream">
        <p className="text-sm text-gray-500">Loading menu...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-odfe-cream p-4">
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <p className="mt-2 text-xs text-gray-400">Please scan a valid QR code from your table.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-odfe-cream">
      <header className="bg-odfe-teal px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-odfe-cream">{cafeName || "OdFe"}</h1>
            <p className="mt-1 text-sm text-odfe-cream/70">Ordering for Table {tableLabel}</p>
            <p className="text-sm text-odfe-cream/80">{customer?.name}</p>
            <p className="text-xs text-odfe-cream/60">{customer?.email}</p>
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

      {customer && cafeId && (
        <CustomerMenu
          cafeId={cafeId}
          cafeName={cafeName || "OdFe"}
          tableId={tableId}
          tableLabel={tableLabel}
          customer={customer}
          menu={menu}
          mode={mode}
        />
      )}
    </div>
  )
}
