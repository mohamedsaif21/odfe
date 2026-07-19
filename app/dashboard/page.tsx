"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DollarSign, ShoppingCart, TrendingUp, XCircle, Clock,
  Users, Table2, ChefHat,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { BrandedLoader } from "@/components/branding/branded-loader"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { fetchDashboardData, subscribeToDashboard } from "@/lib/services/dashboard.service"
import { getCafeId } from "@/lib/services/_shared"
import type { DashboardData } from "@/lib/services/dashboard.service"

const REFRESH_INTERVAL = 10000

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result = await fetchDashboardData()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    getCafeId().then((cafeId) => {
      cleanup = subscribeToDashboard(cafeId, load)
    }).catch(() => {})
    return () => cleanup?.()
  }, [load])

  if (loading && !data) return <AdminLayout title="Dashboard"><BrandedLoader fullScreen message="Loading dashboard..." /></AdminLayout>

  if (error && !data) return (
    <AdminLayout title="Dashboard">
      <PageContainer>
        <Alert type="error" message={error} onDismiss={() => setError(null)} />
        <button onClick={load} className="mt-4 rounded-lg bg-odfe-teal px-4 py-2 text-sm font-semibold text-white">Retry</button>
      </PageContainer>
    </AdminLayout>
  )

  if (!data) return null

  const kpiCards = [
    { title: "Today's Revenue", value: `₹${data.todayRevenue.toFixed(2)}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { title: "Today's Orders", value: data.todayOrders.toString(), icon: ShoppingCart, color: "text-odfe-teal", bg: "bg-odfe-teal/5" },
    { title: "Avg Order Value", value: `₹${data.averageOrder.toFixed(2)}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Cancelled", value: data.cancelledOrders.toString(), icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    { title: "Pending Orders", value: data.pendingOrders.toString(), icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Kitchen Queue", value: data.kitchenQueue.toString(), icon: ChefHat, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Active Tables", value: data.activeTables.toString(), icon: Table2, color: "text-odfe-gold", bg: "bg-odfe-gold/10" },
    { title: "Customers", value: data.currentCustomers.toString(), icon: Users, color: "text-teal-600", bg: "bg-teal-50" },
  ]

  return (
    <AdminLayout title="Dashboard">
      <PageContainer>
        <PageHeader title="Dashboard" description="Live cafe performance" />

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}

        {/* KPI Cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          {kpiCards.map((kpi) => (
            <Card key={kpi.title}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.bg}`}>
                  <kpi.icon size={20} className={kpi.color} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.title}</p>
                  <p className="text-xl font-bold">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Performing + Charts */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-sm">Today's Revenue (Hourly)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Top Performer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {data.topProduct && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Best Seller</p>
                  <p className="text-sm font-semibold">{data.topProduct.name}</p>
                  <p className="text-xs text-muted-foreground">{data.topProduct.sold} sold · ₹{data.topProduct.revenue.toFixed(2)}</p>
                </div>
              )}
              {data.mostActiveTable && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Most Active Table</p>
                  <p className="text-sm font-semibold">Table {data.mostActiveTable.label}</p>
                  <p className="text-xs text-muted-foreground">{data.mostActiveTable.orders} orders</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly & Monthly Charts */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">This Week's Sales</CardTitle></CardHeader>
            <CardContent>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueWeekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Monthly Sales (30 days)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.revenueMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Revenue"]}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders + Payments + Kitchen Queue */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Orders</CardTitle></CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              {data.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders</p>
              ) : (
                <div className="divide-y divide-cream-100">
                  {data.recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="font-medium text-xs">{order.orderNumber}</p>
                        <div className="flex items-center gap-1">
                          <Badge>{order.status.replaceAll("_", " ")}</Badge>
                          {order.tableLabel && <span className="text-[10px] text-muted-foreground">T{order.tableLabel}</span>}
                        </div>
                      </div>
                      <span className="font-semibold text-xs">₹{order.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Payments</CardTitle></CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              {data.recentPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments</p>
              ) : (
                <div className="divide-y divide-cream-100">
                  {data.recentPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="text-xs font-medium">{p.orderNumber}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{p.method}{p.reference ? ` (${p.reference})` : ""}</p>
                      </div>
                      <span className="font-semibold text-xs">₹{p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Kitchen Queue</CardTitle></CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              {data.kitchenTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">Queue empty</p>
              ) : (
                <div className="divide-y divide-cream-100">
                  {data.kitchenTickets.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="text-xs font-medium">{t.orderNumber}</p>
                        <div className="flex items-center gap-1">
                          <Badge>{t.stage.replaceAll("_", " ")}</Badge>
                          {t.tableLabel && <span className="text-[10px] text-muted-foreground">T{t.tableLabel}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{formatElapsed(t.elapsedSeconds)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
