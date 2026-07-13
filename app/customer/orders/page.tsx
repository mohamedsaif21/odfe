"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"
import { fetchCustomerByProfileId, fetchCustomerOrders } from "@/lib/services/self-order.service"

type OrderRow = Awaited<ReturnType<typeof fetchCustomerOrders>>[number]

export default function CustomerOrdersPage() {
  const router = useRouter()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = useCallback(async (id: string) => {
    const supabase = createClient()
    setOrders(await fetchCustomerOrders(id, supabase))
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push("/customer/login?redirect=/customer/orders")
          return
        }

        const profile = await resolveAuthenticatedProfile(session.user.id, supabase)
        if (profile.role !== "customer") {
          router.push("/dashboard")
          return
        }

        const customer = await fetchCustomerByProfileId(profile.id, supabase)
        setCustomerId(customer.id)
        await loadOrders(customer.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [loadOrders, router])

  useEffect(() => {
    if (!customerId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`customer-orders-${customerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${customerId}` },
        () => loadOrders(customerId).catch((err) => setError(err instanceof Error ? err.message : "Failed to refresh orders")),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [customerId, loadOrders])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-odfe-cream text-sm text-gray-500">Loading orders...</div>
  }

  return (
    <div className="min-h-screen bg-odfe-cream">
      <header className="bg-odfe-teal px-4 py-4">
        <h1 className="font-display text-2xl text-odfe-cream">My Orders</h1>
        <p className="mt-1 text-sm text-odfe-cream/70">Track your cafe orders</p>
      </header>
      <main className="p-4">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {orders.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center text-sm text-gray-400 shadow-sm">No orders yet.</div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => router.push(`/customer/orders/${order.id}`)}
                className="w-full rounded-xl bg-white p-4 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                    <p className="mt-1 text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
                    <p className="mt-1 text-xs text-gray-500">{order.tableLabel ? `Table ${order.tableLabel}` : "No table"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg text-odfe-gold">₹{Number(order.total).toFixed(2)}</p>
                    <p className="mt-1 text-xs capitalize text-odfe-teal">{order.status.replaceAll("_", " ")}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
