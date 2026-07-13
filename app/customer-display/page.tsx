"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "@/lib/services/_shared"
import type { Order, OrderItem, Payment } from "@/types/database"

export default function CustomerDisplayPage() {
  const [cafeId, setCafeId] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDisplay = useCallback(async (id?: string) => {
    const supabase = createClient()
    const activeCafeId = id ?? cafeId ?? await getCafeId(supabase)
    setCafeId(activeCafeId)

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("cafe_id", activeCafeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (orderError) throw new Error(orderError.message)
    setOrder(orderRow)

    if (!orderRow) {
      setItems([])
      setPayments([])
      return
    }

    const [itemRows, paymentRows] = await Promise.all([
      supabase.from("order_items").select("*").eq("order_id", orderRow.id).eq("cafe_id", activeCafeId).order("created_at"),
      supabase.from("payments").select("*").eq("order_id", orderRow.id).eq("cafe_id", activeCafeId).order("created_at"),
    ])
    if (itemRows.error) throw new Error(itemRows.error.message)
    if (paymentRows.error) throw new Error(paymentRows.error.message)
    setItems(itemRows.data ?? [])
    setPayments(paymentRows.data ?? [])
  }, [cafeId])

  useEffect(() => {
    async function init() {
      setLoading(true)
      setError(null)
      try {
        await loadDisplay()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load display")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [loadDisplay])

  useEffect(() => {
    if (!cafeId) return
    const supabase = createClient()
    const refresh = () => loadDisplay(cafeId).catch((err) => setError(err instanceof Error ? err.message : "Failed to refresh display"))
    const channel = supabase
      .channel(`customer-display-${cafeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `cafe_id=eq.${cafeId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items", filter: `cafe_id=eq.${cafeId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `cafe_id=eq.${cafeId}` }, refresh)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cafeId, loadDisplay])

  const paidTotal = payments.filter((payment) => payment.status === "completed").reduce((sum, payment) => sum + Number(payment.amount), 0)
  const completed = order?.status === "paid"
  const upiPayment = payments.find((payment) => payment.method === "upi")

  return (
    <AdminLayout title="Customer Display">
      <PageContainer>
        <PageHeader title="Customer Display" description="Second-screen billing display" />
        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        <Card>
          <CardHeader><CardTitle className="text-base">Current checkout</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading display...</p>
            ) : !order ? (
              <p className="text-sm text-muted-foreground">No active order to display</p>
            ) : completed ? (
              <div className="py-10 text-center">
                <p className="font-display text-3xl text-odfe-teal">Payment successful</p>
                <p className="mt-2 text-sm text-muted-foreground">Thank you for visiting OdFe.</p>
                <p className="mt-4 text-sm font-medium">{order.order_number}</p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <Badge>{order.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <div className="divide-y divide-cream-100">
                    {items.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No items on this order</p>
                    ) : items.map((item) => (
                      <div key={item.id} className="flex justify-between py-3 text-sm">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} x ₹{Number(item.unit_price).toFixed(2)}</p>
                        </div>
                        <span>₹{Number(item.line_total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 border-t pt-4 text-sm">
                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{Number(order.subtotal).toFixed(2)}</span></div>
                    <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{Number(order.discount_total).toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>₹{Number(order.tax_total).toFixed(2)}</span></div>
                    <div className="flex justify-between border-t pt-2 text-lg font-semibold"><span>Total</span><span>₹{Number(order.total).toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="rounded-xl border border-cream-200 p-4">
                  <p className="text-sm font-semibold">Payment</p>
                  {payments.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">Waiting for payment</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between text-sm">
                          <span className="uppercase">{payment.method}{payment.reference ? ` (${payment.reference})` : ""}</span>
                          <span>₹{Number(payment.amount).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t pt-3 text-sm font-semibold">
                        <span>Paid</span>
                        <span>₹{paidTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {upiPayment && (
                    <div className="mt-4 rounded-lg border border-dashed border-odfe-teal/40 p-4 text-center">
                      <div className="mx-auto flex h-28 w-28 items-center justify-center rounded bg-odfe-teal/10 text-xs font-semibold text-odfe-teal">
                        UPI QR
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Scan to pay with UPI</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </AdminLayout>
  )
}
