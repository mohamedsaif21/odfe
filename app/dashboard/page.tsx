"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "@/lib/services/_shared"
import type { CafeTable, Order, Payment } from "@/types/database"

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [tables, setTables] = useState<CafeTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const cafeId = await getCafeId(supabase)
        const [orderRows, paymentRows, tableRows] = await Promise.all([
          supabase.from("orders").select("*").eq("cafe_id", cafeId).order("created_at", { ascending: false }).limit(10),
          supabase.from("payments").select("*").eq("cafe_id", cafeId).order("paid_at", { ascending: false }),
          supabase.from("cafe_tables").select("*").eq("cafe_id", cafeId),
        ])
        if (orderRows.error) throw new Error(orderRows.error.message)
        if (paymentRows.error) throw new Error(paymentRows.error.message)
        if (tableRows.error) throw new Error(tableRows.error.message)
        setOrders(orderRows.data ?? [])
        setPayments(paymentRows.data ?? [])
        setTables(tableRows.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayOrders = orders.filter((order) => order.created_at.slice(0, 10) === todayKey)
  const todayRevenue = payments
    .filter((payment) => payment.status === "completed" && payment.paid_at?.slice(0, 10) === todayKey)
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
  const averageOrder = todayOrders.length ? todayOrders.reduce((sum, order) => sum + Number(order.total), 0) / todayOrders.length : 0
  const activeTables = tables.filter((table) => table.status === "occupied" || table.status === "reserved").length

  return (
    <AdminLayout title="Dashboard">
      <PageContainer>
        <PageHeader title="Dashboard" description="Today's cafe performance at a glance" />
        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-sm">Today's revenue</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{loading ? "..." : `₹${todayRevenue.toFixed(2)}`}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Today's orders</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{loading ? "..." : todayOrders.length}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Average order</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{loading ? "..." : `₹${averageOrder.toFixed(2)}`}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Active tables</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{loading ? "..." : activeTables}</CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent orders</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading recent orders...</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent orders</p>
            ) : (
              <div className="divide-y divide-cream-100">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-3 text-sm">
                    <div><p className="font-medium">{order.order_number}</p><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p></div>
                    <div className="flex items-center gap-3"><Badge>{order.status.replaceAll("_", " ")}</Badge><span className="font-medium">₹{Number(order.total).toFixed(2)}</span></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </AdminLayout>
  )
}
