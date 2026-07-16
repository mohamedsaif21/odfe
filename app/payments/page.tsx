"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "@/lib/services/_shared"
import type { Order, Payment, PaymentMethodType } from "@/types/database"

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [orders, setOrders] = useState<Record<string, Order>>({})
  const [search, setSearch] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const cafeId = await getCafeId(supabase)
        const [paymentRows, orderRows] = await Promise.all([
          supabase.from("payments").select("*").eq("cafe_id", cafeId).order("paid_at", { ascending: false }),
          supabase.from("orders").select("*").eq("cafe_id", cafeId),
        ])
        if (paymentRows.error) throw new Error(paymentRows.error.message)
        if (orderRows.error) throw new Error(orderRows.error.message)
        setPayments(paymentRows.data ?? [])
        setOrders(Object.fromEntries((orderRows.data ?? []).map((row) => [row.id, row])))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payments")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const dailyRevenue = payments
    .filter((payment) => payment.status === "completed" && (!date || payment.paid_at?.slice(0, 10) === date))
    .reduce((sum, payment) => sum + Number(payment.amount), 0)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return payments.filter((payment) => {
      const orderNumber = orders[payment.order_id]?.order_number ?? ""
      const matchesSearch = !query || [orderNumber, payment.method, payment.reference ?? ""].some((value) => value.toLowerCase().includes(query))
      const matchesDate = !date || payment.paid_at?.slice(0, 10) === date
      const matchesMethod = !method || payment.method === method
      const matchesStatus = !status || payment.status === status
      return matchesSearch && matchesDate && matchesMethod && matchesStatus
    })
  }, [date, method, orders, payments, search, status])

  return (
    <AdminLayout title="Payments">
      <PageContainer>
        <PageHeader title="Payments" description="Payment history and revenue tracking" />
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-sm">Daily revenue</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">₹{dailyRevenue.toFixed(2)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Payments</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{payments.length}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Completed</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{payments.filter((p) => p.status === "completed").length}</CardContent></Card>
        </div>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-charcoal/40" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payments" className="pl-9" />
          </div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">All methods</option>
            {(["cash", "card", "upi"] satisfies PaymentMethodType[]).map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </Select>
        </div>
        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60">
              <tr><th className="px-4 py-3">Paid at</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Loading payments...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No payments found</td></tr>
              ) : filtered.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3">{payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3 font-medium">{orders[payment.order_id]?.order_number ?? payment.order_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 uppercase">{payment.method}</td>
                  <td className="px-4 py-3">{payment.reference ?? "-"}</td>
                  <td className="px-4 py-3"><Badge>{payment.status}</Badge></td>
                  <td className="px-4 py-3 text-right">₹{Number(payment.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
