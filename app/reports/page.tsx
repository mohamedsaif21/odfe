"use client"

import { useEffect, useMemo, useState } from "react"
import jsPDF from "jspdf"
import * as XLSX from "xlsx"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "@/lib/services/_shared"
import type { Order, OrderItem, Payment } from "@/types/database"

type Period = "daily" | "weekly" | "monthly"

function inPeriod(dateValue: string | null, period: Period) {
  if (!dateValue) return false
  const date = new Date(dateValue)
  const now = new Date()
  if (period === "daily") return date.toDateString() === now.toDateString()
  const days = (now.getTime() - date.getTime()) / 86400000
  if (period === "weekly") return days >= 0 && days < 7
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("daily")
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const cafeId = await getCafeId(supabase)
        const [orderRows, paymentRows, itemRows] = await Promise.all([
          supabase.from("orders").select("*").eq("cafe_id", cafeId).order("created_at", { ascending: false }),
          supabase.from("payments").select("*").eq("cafe_id", cafeId).order("paid_at", { ascending: false }),
          supabase.from("order_items").select("*").eq("cafe_id", cafeId),
        ])
        if (orderRows.error) throw new Error(orderRows.error.message)
        if (paymentRows.error) throw new Error(paymentRows.error.message)
        if (itemRows.error) throw new Error(itemRows.error.message)
        setOrders(orderRows.data ?? [])
        setPayments(paymentRows.data ?? [])
        setItems(itemRows.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const report = useMemo(() => {
    const scopedOrders = orders.filter((order) => inPeriod(order.created_at, period))
    const scopedPayments = payments.filter((payment) => payment.status === "completed" && inPeriod(payment.paid_at, period))
    const scopedOrderIds = new Set(scopedOrders.map((order) => order.id))
    const productMap = new Map<string, { quantity: number; revenue: number }>()
    items.filter((item) => scopedOrderIds.has(item.order_id)).forEach((item) => {
      const current = productMap.get(item.product_name) ?? { quantity: 0, revenue: 0 }
      current.quantity += item.quantity
      current.revenue += Number(item.line_total)
      productMap.set(item.product_name, current)
    })
    return {
      revenue: scopedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      orders: scopedOrders.length,
      bestProducts: Array.from(productMap.entries())
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10),
    }
  }, [items, orders, payments, period])

  function exportPdf() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`OdFe ${period} report`, 14, 18)
    doc.setFontSize(11)
    doc.text(`Revenue: Rs ${report.revenue.toFixed(2)}`, 14, 32)
    doc.text(`Orders: ${report.orders}`, 14, 40)
    doc.text(`Average order: Rs ${report.orders ? (report.revenue / report.orders).toFixed(2) : "0.00"}`, 14, 48)
    doc.text("Best selling products", 14, 62)
    report.bestProducts.forEach((product, index) => {
      doc.text(`${index + 1}. ${product.name} - ${product.quantity} sold - Rs ${product.revenue.toFixed(2)}`, 14, 74 + index * 8)
    })
    doc.save(`odfe-${period}-report.pdf`)
  }

  function exportXls() {
    const summaryRows = [
      { metric: "Period", value: period },
      { metric: "Revenue", value: report.revenue },
      { metric: "Orders", value: report.orders },
      { metric: "Average order", value: report.orders ? report.revenue / report.orders : 0 },
    ]
    const productRows = report.bestProducts.map((product) => ({
      product: product.name,
      quantity: product.quantity,
      revenue: product.revenue,
    }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Summary")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productRows), "Best sellers")
    XLSX.writeFile(workbook, `odfe-${period}-report.xlsx`)
  }

  return (
    <AdminLayout title="Reports">
      <PageContainer>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader title="Reports" description="Revenue and performance analytics" />
          <div className="flex gap-2">
            <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="w-40">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
            <Button variant="outline" onClick={exportPdf} disabled={loading}>PDF</Button>
            <Button variant="outline" onClick={exportXls} disabled={loading}>XLS</Button>
          </div>
        </div>
        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-sm">Revenue</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{loading ? "..." : `₹${report.revenue.toFixed(2)}`}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Orders</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{loading ? "..." : report.orders}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Average order</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{loading || report.orders === 0 ? "₹0.00" : `₹${(report.revenue / report.orders).toFixed(2)}`}</CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Best selling products</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading products...</p>
            ) : report.bestProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product sales in this period</p>
            ) : (
              <div className="divide-y divide-cream-100">
                {report.bestProducts.map((product) => (
                  <div key={product.name} className="flex items-center justify-between py-3 text-sm">
                    <div><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.quantity} sold</p></div>
                    <span className="font-medium">₹{product.revenue.toFixed(2)}</span>
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
