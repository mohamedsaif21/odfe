"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { BrandedLoader } from "@/components/branding/branded-loader"
import { OdfeLogo } from "@/components/branding/odfe-logo"
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

  function formatStatus(status: string) {
    const labels: Record<string, string> = {
      sent_to_kitchen: "Sent to Kitchen",
      to_cook: "To Cook",
      preparing: "Preparing",
      completed: "Completed",
      paid: "Paid",
      cancelled: "Cancelled",
    }
    return labels[status] ?? status.replaceAll("_", " ")
  }

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

  useEffect(() => {
    if (!customerId) return
    const refresh = () => {
      if (document.visibilityState === "visible") {
        loadOrders(customerId).catch((err) => setError(err instanceof Error ? err.message : "Failed to refresh orders"))
      }
    }
    document.addEventListener("visibilitychange", refresh)
    window.addEventListener("focus", refresh)
    return () => {
      document.removeEventListener("visibilitychange", refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [customerId, loadOrders])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/customer/login")
  }

  if (loading) {
    return <BrandedLoader fullScreen message="Loading orders..." />
  }

  return (
    <div className="min-h-screen bg-odfe-cream">
      <header className="bg-odfe-teal px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <OdfeLogo variant="full" size="sm" priority />
            <p className="mt-1 text-sm text-odfe-cream/70">My Orders</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/self-order")} className="rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10">Self Order</button>
            <button onClick={() => router.push("/customer/profile")} className="rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10">Profile</button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-full border border-odfe-cream/20 px-3 py-1.5 text-xs font-medium text-odfe-cream/80 hover:bg-white/10">
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="p-4">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {orders.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center text-sm text-gray-400 shadow-sm">
            <p>No orders yet.</p>
            <button onClick={() => router.push("/self-order")} className="mt-4 rounded-lg bg-odfe-teal px-4 py-2 text-sm font-medium text-white">
              Start an Order
            </button>
            <p className="mt-2 text-xs text-gray-400">For table ordering, scan the QR code at your table.</p>
          </div>
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
                    <p className="mt-1 text-xs capitalize text-gray-400">{order.source.replaceAll("_", " ")} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg text-odfe-gold">₹{Number(order.total).toFixed(2)}</p>
                    <p className="mt-1 text-xs text-odfe-teal">{formatStatus(order.status)}</p>
                    <p className="mt-2 text-xs font-medium text-odfe-teal underline">View Order</p>
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
