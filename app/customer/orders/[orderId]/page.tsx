"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"
import { subscribeToCustomerOrder } from "@/lib/orders/realtime"
import { fetchCustomerByProfileId, fetchCustomerOrder } from "@/lib/services/self-order.service"

type OrderView = NonNullable<Awaited<ReturnType<typeof fetchCustomerOrder>>>
const timeline = ["to_cook", "preparing", "completed", "paid"] as const

function stageReached(order: OrderView, stage: (typeof timeline)[number]) {
  if (stage === "paid") return order.status === "paid"
  const current = order.status === "paid" ? "paid" : order.kitchenStage ?? order.status
  return timeline.indexOf(current as (typeof timeline)[number]) >= timeline.indexOf(stage)
}

export default function CustomerOrderDetailPage() {
  const params = useParams<{ orderId: string }>()
  const router = useRouter()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrder = useCallback(async (id: string) => {
    const supabase = createClient()
    const orderRow = await fetchCustomerOrder(params.orderId, id, supabase)
    if (!orderRow) throw new Error("Order not found")
    setOrder(orderRow)
  }, [params.orderId])

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push(`/customer/login?redirect=/customer/orders/${params.orderId}`)
          return
        }

        const profile = await resolveAuthenticatedProfile(session.user.id, supabase)
        if (profile.role !== "customer") {
          router.push("/dashboard")
          return
        }

        const customer = await fetchCustomerByProfileId(profile.id, supabase)
        setCustomerId(customer.id)
        await loadOrder(customer.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [loadOrder, params.orderId, router])

  useEffect(() => {
    if (!customerId) return
    const supabase = createClient()
    const refresh = () => loadOrder(customerId).catch((err) => setError(err instanceof Error ? err.message : "Failed to refresh order"))
    const channel = subscribeToCustomerOrder(
      params.orderId,
      refresh,
      (err) => setError(err instanceof Error ? err.message : "Realtime connection failed.")
    )

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [customerId, loadOrder, params.orderId])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-odfe-cream text-sm text-gray-500">Loading order...</div>
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-odfe-cream p-4">
        <div className="text-center">
          <p className="text-sm text-red-600">{error ?? "Order not found"}</p>
          <button onClick={() => router.push("/customer/orders")} className="mt-3 text-sm text-odfe-teal underline">Back to orders</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-odfe-cream">
      <header className="bg-odfe-teal px-4 py-4">
        <h1 className="font-display text-2xl text-odfe-cream">Order {order.orderNumber}</h1>
        <p className="mt-1 text-sm capitalize text-odfe-cream/70">{order.status.replaceAll("_", " ")}</p>
        <p className="text-xs text-odfe-cream/60">{order.tableLabel ? `Table ${order.tableLabel}` : "No table"}</p>
      </header>
      <main className="space-y-4 p-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-gray-900">Order status</p>
          <div className="grid grid-cols-4 gap-2">
            {timeline.map((stage) => {
              const reached = stageReached(order, stage)
              return (
                <div key={stage} className="text-center">
                  <div className={`mx-auto h-3 w-3 rounded-full ${reached ? "bg-odfe-teal" : "bg-gray-200"}`} />
                  <p className={`mt-2 text-[11px] capitalize ${reached ? "text-odfe-teal" : "text-gray-400"}`}>{stage.replaceAll("_", " ")}</p>
                </div>
              )
            })}
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="divide-y divide-gray-100">
            {order.items.map((item, index) => (
              <div key={`${item.productName}-${index}`} className="flex justify-between py-3 text-sm">
                <span>{item.quantity} x {item.productName}</span>
                <span>₹{(item.quantity * item.unitPrice).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{Number(order.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{Number(order.discountTotal).toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Tax</span><span>₹{Number(order.taxTotal).toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 text-lg font-semibold"><span>Total</span><span>₹{Number(order.total).toFixed(2)}</span></div>
          </div>
        </div>
      </main>
    </div>
  )
}
