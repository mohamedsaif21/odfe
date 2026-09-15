"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { BrandedLoader } from "@/components/branding/branded-loader"
import { OdfeLogo } from "@/components/branding/odfe-logo"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/store/auth-store"
import { useSelfOrderStore } from "@/store/self-order-store"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"
import { CustomerMenu } from "@/components/self-order/customer-menu"
import {
  fetchCustomerByProfileId,
  fetchPublicMenu,
  fetchSelfOrderSettings,
  resolveSelfOrderToken,
  type PublicMenuCategory,
  type SelfOrderMode,
} from "@/lib/services/self-order.service"
import type { Customer } from "@/types/database"

export default function SelfOrderPage() {
  const router = useRouter()
  const { user, setUser, clearUser } = useAuthStore()
  const { context, clearSelfOrderContext } = useSelfOrderStore()
  const [loading, setLoading] = useState(true)
  const [cafeName, setCafeName] = useState("")
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [menu, setMenu] = useState<PublicMenuCategory[]>([])
  const [mode, setMode] = useState<SelfOrderMode>("online_ordering")
  const [tableId, setTableId] = useState<string | null>(null)
  const [tableLabel, setTableLabel] = useState<string | null>(null)

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

        let restoredTableId: string | null = null
        let restoredTableLabel: string | null = null

        if (context && context.profileId === profile.id) {
          try {
            const resolved = await resolveSelfOrderToken(context.token, supabase)
            if (
              resolved.cafeId === context.cafeId &&
              resolved.cafeId === profile.cafeId &&
              resolved.tableId === context.tableId
            ) {
              restoredTableId = resolved.tableId
              restoredTableLabel = resolved.tableLabel
            } else {
              clearSelfOrderContext()
            }
          } catch {
            clearSelfOrderContext()
          }
        } else if (context) {
          clearSelfOrderContext()
        }

        setTableId(restoredTableId)
        setTableLabel(restoredTableLabel)

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
  }, [router, setUser, context, clearSelfOrderContext])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearUser()
    clearSelfOrderContext()
    router.push("/customer/login")
  }

  if (loading) {
    return <BrandedLoader fullScreen message="Loading..." />
  }

  return (
    <div className="flex min-h-screen flex-col bg-odfe-cream">
      <header className="bg-odfe-teal px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <OdfeLogo variant="full" size="sm" priority />
            {tableLabel && <p className="mt-1 text-sm text-odfe-cream/70">Ordering for Table {tableLabel}</p>}
            <p className="mt-1 text-sm text-odfe-cream/70">{customer?.name ?? user?.fullName}</p>
            <p className="text-xs text-odfe-cream/60">{customer?.email ?? user?.email}</p>
            <p className="text-xs text-odfe-gold">Loyalty points: {customer?.loyalty_points ?? 0}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/customer/orders")} className="rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10">My Orders</button>
            <button onClick={() => router.push("/customer/profile")} className="rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10">Profile</button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {customer && (
        <CustomerMenu
          cafeId={user?.cafeId ?? customer.cafe_id}
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
