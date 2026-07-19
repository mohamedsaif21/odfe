"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DollarSign, ShoppingCart, TrendingUp, Percent, BadgePercent,
  UtensilsCrossed, Users, ChefHat, FileDown, FileSpreadsheet,
  Receipt, Wallet,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { fetchReportData, generateReportPdf, generateReportXls } from "@/lib/services/reports.service"
import type { ReportData, ReportPeriod } from "@/lib/services/reports.service"

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("daily")
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchReportData(period)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports")
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    load()
  }, [load])

  function formatSeconds(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s}s`
  }

  const exportBtnClass = "flex items-center gap-1.5 rounded-lg border border-cream-200 px-3 py-2 text-xs font-medium text-charcoal/70 hover:bg-cream disabled:opacity-50"

  return (
    <AdminLayout title="Reports">
      <PageContainer>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader title="Reports" description="Revenue and performance analytics" />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)} className="w-32">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
            <button onClick={async () => { if (data) { try { await generateReportPdf(data, period) } catch {} } }} disabled={loading || !data} className={exportBtnClass}>
              <FileDown size={14} />PDF
            </button>
            <button onClick={async () => { if (data) { try { await generateReportXls(data, period) } catch {} } }} disabled={loading || !data} className={exportBtnClass}>
              <FileSpreadsheet size={14} />Excel
            </button>
          </div>
        </div>

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}

        {loading && !data ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading reports...</div>
        ) : !data ? null : (
          <>
            {/* Summary Cards */}
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50"><DollarSign size={18} className="text-green-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-bold">₹{data.revenue.toFixed(2)}</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-odfe-teal/5"><ShoppingCart size={18} className="text-odfe-teal" /></div>
                  <div><p className="text-xs text-muted-foreground">Orders</p><p className="text-lg font-bold">{data.ordersCount}</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50"><TrendingUp size={18} className="text-blue-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Avg Order</p><p className="text-lg font-bold">₹{data.averageOrder.toFixed(2)}</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50"><Percent size={18} className="text-purple-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Tax</p><p className="text-lg font-bold">₹{data.taxTotal.toFixed(2)}</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50"><BadgePercent size={18} className="text-orange-600" /></div>
                  <div><p className="text-xs text-muted-foreground">Discounts</p><p className="text-lg font-bold">₹{data.discountTotal.toFixed(2)}</p></div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              {/* Revenue by Method */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2"><Wallet size={15} className="text-odfe-teal" /><CardTitle className="text-sm">Revenue by Payment Method</CardTitle></CardHeader>
                <CardContent>
                  {data.revenueByMethod.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments</p>
                  ) : (
                    <div className="divide-y divide-cream-100">
                      {data.revenueByMethod.map((m) => (
                        <div key={m.method} className="flex items-center justify-between py-2.5 text-sm">
                          <span className="font-medium capitalize">{m.method}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">{m.count} txns</span>
                            <span className="font-semibold">₹{m.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Best Sellers */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2"><UtensilsCrossed size={15} className="text-odfe-teal" /><CardTitle className="text-sm">Best Selling Products</CardTitle></CardHeader>
                <CardContent>
                  {data.bestProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sales</p>
                  ) : (
                    <div className="divide-y divide-cream-100">
                      {data.bestProducts.map((p) => (
                        <div key={p.name} className="flex items-center justify-between py-2 text-sm">
                          <div><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-muted-foreground">{p.quantity} sold</p></div>
                          <span className="font-semibold">₹{p.revenue.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              {/* Employee Sales */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2"><Users size={15} className="text-odfe-teal" /><CardTitle className="text-sm">Employee Sales</CardTitle></CardHeader>
                <CardContent className="max-h-48 overflow-y-auto">
                  {data.employeeSales.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data</p>
                  ) : (
                    <div className="divide-y divide-cream-100">
                      {data.employeeSales.map((e) => (
                        <div key={e.name} className="flex items-center justify-between py-2 text-sm">
                          <span className="text-sm">{e.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{e.orders} orders</span>
                            <span className="font-semibold text-sm">₹{e.revenue.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Kitchen Performance */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2"><ChefHat size={15} className="text-odfe-teal" /><CardTitle className="text-sm">Kitchen Performance</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total tickets</span><span className="font-semibold">{data.kitchenPerformance.totalTickets}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Completed</span><span className="font-semibold">{data.kitchenPerformance.completedTickets}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg prep time</span><span className="font-semibold">{formatSeconds(data.kitchenPerformance.avgPrepSeconds)}</span></div>
                </CardContent>
              </Card>

              {/* Coupon Usage */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2"><Receipt size={15} className="text-odfe-teal" /><CardTitle className="text-sm">Coupon Usage</CardTitle></CardHeader>
                <CardContent className="max-h-48 overflow-y-auto">
                  {data.couponUsage.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No coupons used</p>
                  ) : (
                    <div className="divide-y divide-cream-100">
                      {data.couponUsage.map((c) => (
                        <div key={c.code} className="flex items-center justify-between py-2 text-sm">
                          <span className="font-mono text-xs">{c.code}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{c.used}x</span>
                            <span className="font-semibold text-xs">-₹{c.discountGiven.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Customer Growth */}
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                  <Users size={20} className="text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">New Customers this {period}</p>
                  <p className="text-xl font-bold">{data.customerGrowth}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </PageContainer>
    </AdminLayout>
  )
}
