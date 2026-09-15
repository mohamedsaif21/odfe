"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { BrandedLoader } from "@/components/branding/branded-loader"
import { OdfeLogo } from "@/components/branding/odfe-logo"
import { createClient } from "@/lib/supabase/client"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"
import { subscribeToCustomerOrder } from "@/lib/orders/realtime"
import { fetchCustomerByProfileId, fetchCustomerOrder } from "@/lib/services/self-order.service"
import { RazorpayCheckoutClosedError, openRazorpayCheckout } from "@/lib/services/razorpay-checkout"

type OrderView = NonNullable<Awaited<ReturnType<typeof fetchCustomerOrder>>>
const timeline = ["to_cook", "preparing", "completed", "paid"] as const

function stageReached(order: OrderView, stage: (typeof timeline)[number]) {
  if (stage === "paid") return order.status === "paid"
  const current = order.status === "paid" ? "paid" : order.kitchenStage ?? order.status
  return timeline.indexOf(current as (typeof timeline)[number]) >= timeline.indexOf(stage)
}

function paymentErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Please sign in to continue."
    case 403:
      return "You are not authorised to pay for this order."
    case 404:
      return "This order could not be found."
    case 400:
      return "This order cannot be paid right now."
    case 502:
    case 503:
      return "The payment service is temporarily unavailable. Please try again shortly."
    default:
      return "Something went wrong while preparing your payment. Please try again."
  }
}

function completeErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Please sign in to continue."
    case 403:
      return "You are not authorised to pay for this order."
    case 404:
      return "This order could not be found."
    case 400:
      return "Payment could not be completed. Please contact the cafe if you were charged."
    case 409:
      return "Your payment could not be applied to this order. Please contact the cafe."
    case 502:
    case 503:
      return "The payment service is temporarily unavailable. Please try again shortly."
    default:
      return "Something went wrong. Please try again."
  }
}

export default function CustomerOrderDetailPage() {
  const params = useParams<{ orderId: string }>()
  const router = useRouter()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [cafeId, setCafeId] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customerPrefill, setCustomerPrefill] = useState<{ name: string; email?: string; contact?: string } | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [payNotice, setPayNotice] = useState<string | null>(null)
  const paymentInFlight = useRef(false)

  const loadOrder = useCallback(async (id: string, activeCafeId: string) => {
    const supabase = createClient()
    const orderRow = await fetchCustomerOrder(params.orderId, id, activeCafeId, supabase)
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
        setCafeId(profile.cafeId)
        setCustomerPrefill({
          name: customer.name,
          ...(customer.email ? { email: customer.email } : {}),
          ...(customer.phone ? { contact: customer.phone } : {}),
        })
        await loadOrder(customer.id, profile.cafeId)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [loadOrder, params.orderId, router])

  useEffect(() => {
    if (!customerId || !cafeId) return
    const supabase = createClient()
    const refresh = () => loadOrder(customerId, cafeId).catch((err) => setError(err instanceof Error ? err.message : "Failed to refresh order"))
    const channel = subscribeToCustomerOrder(
      params.orderId,
      refresh,
      (err) => setError(err instanceof Error ? err.message : "Realtime connection failed.")
    )

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [cafeId, customerId, loadOrder, params.orderId])

  async function handlePayOnline() {
    if (!order || paymentInFlight.current) return

    paymentInFlight.current = true
    setPaying(true)
    setPayError(null)
    setPayNotice(null)

    try {
      const response = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      })

      const body = (await response.json().catch(() => null)) as {
        data?: { order_id?: string; amount?: number; currency?: string; key_id?: string }
      } | null
      const checkoutData = body?.data

      if (
        !response.ok ||
        !checkoutData ||
        !checkoutData.order_id ||
        typeof checkoutData.amount !== "number" ||
        !checkoutData.currency ||
        !checkoutData.key_id
      ) {
        setPayError(paymentErrorMessage(response.status))
        return
      }

      const result = await openRazorpayCheckout({
        keyId: checkoutData.key_id,
        amountPaise: Math.round(checkoutData.amount * 100),
        currency: checkoutData.currency,
        orderId: checkoutData.order_id,
        name: "ODFE",
        description: "Customer Order Payment",
        prefill: customerPrefill ?? undefined,
      })

      if (!result.razorpay_payment_id || !result.razorpay_order_id || !result.razorpay_signature) {
        setPayError("Unable to verify payment. Please try again.")
        return
      }

      const completeResponse = await fetch("/api/payments/razorpay/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpayOrderId: result.razorpay_order_id,
          razorpaySignature: result.razorpay_signature,
        }),
      })

      const completeBody = (await completeResponse.json().catch(() => null)) as {
        data?: { completed?: boolean }
      } | null

      if (completeResponse.ok && completeBody?.data?.completed) {
        if (process.env.NODE_ENV === "development") {
          console.debug("Razorpay payment completed:", completeBody.data)
        }
        setPayNotice("Payment completed successfully. Your order is now marked as paid.")
      } else {
        setPayError(completeErrorMessage(completeResponse.status))
      }
    } catch (err) {
      if (err instanceof RazorpayCheckoutClosedError) {
        setPayNotice("Payment window closed. No payment was recorded.")
      } else {
        setPayError(err instanceof Error ? err.message : "Unable to open payment. Please try again.")
      }
    } finally {
      paymentInFlight.current = false
      setPaying(false)
      if (customerId && cafeId) {
        loadOrder(customerId, cafeId).catch((err) => setError(err instanceof Error ? err.message : "Failed to refresh order"))
      }
    }
  }

  if (loading) {
    return <BrandedLoader fullScreen message="Loading order..." />
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
        <OdfeLogo variant="full" size="sm" priority />
        <h1 className="mt-2 text-sm font-medium text-odfe-cream">Order {order.orderNumber}</h1>
        <p className="mt-1 text-sm capitalize text-odfe-cream/70">{order.status.replaceAll("_", " ")}</p>
        <p className="text-xs text-odfe-cream/60">{order.tableLabel ? `Table ${order.tableLabel}` : "No table"}</p>
        <p className="text-xs text-odfe-cream/60">{new Date(order.createdAt).toLocaleString()}</p>
        {order.status === "paid" && (
          <p className="mt-2 text-sm font-medium text-odfe-gold">Payment completed · Receipt {order.orderNumber}</p>
        )}
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
              <div key={`${item.productName}-${index}`} className="py-3 text-sm">
                <div className="flex justify-between">
                  <span>{item.quantity} x {item.productName}</span>
                  <span>₹{(item.quantity * item.unitPrice).toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Unit ₹{Number(item.unitPrice).toFixed(2)} · Discount {Number(item.discount).toFixed(2)}% · Tax {Number(item.taxRate).toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{Number(order.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{Number(order.discountTotal).toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Tax</span><span>₹{Number(order.taxTotal).toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 text-lg font-semibold"><span>Total</span><span>₹{Number(order.total).toFixed(2)}</span></div>
          </div>
          {order.status === "paid" && (
            <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              <p>Payment completed for ₹{Number(order.total).toFixed(2)}. Reference: {order.orderNumber}</p>
              <p className="mt-1">Amount due: ₹0.00</p>
            </div>
          )}
          {order.status !== "cancelled" && order.status !== "paid" && order.remaining > 0 && (
            <div className="mt-4 rounded-lg bg-odfe-gold/10 px-3 py-3 text-odfe-charcoal">
              <p className="text-xs">Amount due</p>
              <p className="text-lg font-semibold">₹{Number(order.remaining).toFixed(2)}</p>
              <button
                onClick={handlePayOnline}
                disabled={paying}
                className="mt-2 w-full rounded-lg bg-odfe-gold py-3 text-sm font-semibold text-odfe-charcoal disabled:opacity-50"
              >
                {paying ? "Preparing payment..." : `Pay Online ₹${Number(order.remaining).toFixed(2)}`}
              </button>
              {payError && <p className="mt-2 text-xs text-red-600">{payError}</p>}
              {payNotice && <p className="mt-2 text-xs">{payNotice}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
