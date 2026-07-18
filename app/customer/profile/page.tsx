"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { BrandedLoader } from "@/components/branding/branded-loader"
import { OdfeLogo } from "@/components/branding/odfe-logo"
import { createClient } from "@/lib/supabase/client"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"
import { fetchCustomerByProfileId } from "@/lib/services/self-order.service"
import type { Customer } from "@/types/database"

export default function CustomerProfilePage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push("/customer/login?redirect=/customer/profile")
          return
        }

        const profile = await resolveAuthenticatedProfile(session.user.id, supabase)
        if (profile.role !== "customer") {
          router.push("/dashboard")
          return
        }

        setCustomer(await fetchCustomerByProfileId(profile.id, supabase))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/customer/login")
  }

  if (loading) {
    return <BrandedLoader fullScreen message="Loading profile..." />
  }

  return (
    <div className="min-h-screen bg-odfe-cream">
      <header className="bg-odfe-teal px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <OdfeLogo variant="full" size="sm" priority />
            <p className="mt-1 text-sm text-odfe-cream/70">{customer?.name ?? "Customer"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/self-order")} className="rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10">Self Order</button>
            <button onClick={() => router.push("/customer/orders")} className="rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10">My Orders</button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10">
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="p-4">
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {customer && (
          <div className="rounded-xl bg-white p-4 text-sm shadow-sm">
            <div className="border-b border-gray-100 py-3">
              <p className="text-xs text-gray-400">Name</p>
              <p className="font-medium text-gray-900">{customer.name}</p>
            </div>
            <div className="border-b border-gray-100 py-3">
              <p className="text-xs text-gray-400">Email</p>
              <p className="font-medium text-gray-900">{customer.email ?? "-"}</p>
            </div>
            <div className="border-b border-gray-100 py-3">
              <p className="text-xs text-gray-400">Phone</p>
              <p className="font-medium text-gray-900">{customer.phone ?? "-"}</p>
            </div>
            <div className="py-3">
              <p className="text-xs text-gray-400">Loyalty points</p>
              <p className="font-medium text-odfe-gold">{customer.loyalty_points}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
