"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DollarSign, ShoppingCart, TrendingUp, XCircle, Clock,
  Users, Table2, ChefHat, Package, AlertTriangle, TrendingDown,
  ShoppingBag, Truck, Receipt, Wallet, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart as PieIcon, RefreshCw,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts"
import { AdminLayout } from "@/components/layout/admin-layout"
import { BrandedLoader } from "@/components/branding/branded-loader"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { fetchDashboardData, subscribeToDashboard } from "@/lib/services/dashboard.service"
import { getCafeId } from "@/lib/services/_shared"
import type { DashboardData } from "@/lib/services/dashboard.service"
import {
  getDateRange,
  getDashboardKPIs, getSalesTrend, getTopProducts, getCategorySales,
  getCustomerAnalytics, getInventorySummary, getPurchaseSummary,
  getExpenseSummary, getProfitLoss, getKitchenSummary, getPosSummary,
} from "@/lib/services/analytics.service"
import type {
  DateRange, DashboardKPIs, SalesTrendPoint, TopProduct,
  CategorySalesPoint, CustomerAnalytics, InventorySummary,
  PurchaseSummary, ExpenseSummary, ProfitLossData,
  KitchenSummary, PosSummary,
} from "@/lib/services/analytics.service"

const REFRESH_INTERVAL = 30000
const PIE_COLORS = ["#0d9488", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1"]

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function formatCurrency(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ─── Section Error Boundary ──────────────────────────────────────────────

function SectionFallback({
  title,
  error,
  onRetry,
}: {
  title: string
  error: string
  onRetry?: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle size={24} className="mb-2 text-red-500" />
          <p className="text-sm text-muted-foreground mb-2">Failed to load {title.toLowerCase()}</p>
          <p className="text-xs text-red-500 mb-3">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw size={14} className="mr-1" /> Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SectionLoading({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-odfe-teal border-t-transparent" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const [datePreset, setDatePreset] = useState("last_30")
  const [range, setRange] = useState<DateRange>(getDateRange("last_30"))

  const [liveData, setLiveData] = useState<DashboardData | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [kpiError, setKpiError] = useState<string | null>(null)

  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[] | null>(null)
  const [trendError, setTrendError] = useState<string | null>(null)

  const [topProducts, setTopProducts] = useState<TopProduct[] | null>(null)
  const [productsError, setProductsError] = useState<string | null>(null)

  const [categorySales, setCategorySales] = useState<CategorySalesPoint[] | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const [customerData, setCustomerData] = useState<CustomerAnalytics | null>(null)
  const [customerError, setCustomerError] = useState<string | null>(null)

  const [inventory, setInventory] = useState<InventorySummary | null>(null)
  const [inventoryError, setInventoryError] = useState<string | null>(null)

  const [purchases, setPurchases] = useState<PurchaseSummary | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  const [expenses, setExpenses] = useState<ExpenseSummary | null>(null)
  const [expenseError, setExpenseError] = useState<string | null>(null)

  const [profitLoss, setProfitLoss] = useState<ProfitLossData | null>(null)
  const [plError, setPlError] = useState<string | null>(null)

  const [kitchen, setKitchen] = useState<KitchenSummary | null>(null)
  const [kitchenError, setKitchenError] = useState<string | null>(null)

  const [posData, setPosData] = useState<PosSummary | null>(null)
  const [posError, setPosError] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const r = getDateRange(datePreset)
    setRange(r)
    setLoading(true)

    const [
      live,
      kpiRes, trendRes, prodRes, catRes, custRes,
      invRes, purchRes, expRes, plRes, kitRes, posRes,
    ] = await Promise.allSettled([
      fetchDashboardData(),
      getDashboardKPIs(r),
      getSalesTrend(r),
      getTopProducts(r),
      getCategorySales(r),
      getCustomerAnalytics(),
      getInventorySummary(),
      getPurchaseSummary(r),
      getExpenseSummary(r),
      getProfitLoss(r),
      getKitchenSummary(),
      getPosSummary(r),
    ])

    // Live operational data
    if (live.status === "fulfilled") { setLiveData(live.value); setLiveError(null) }
    else { setLiveError(live.reason?.message ?? "Failed to load") }

    // KPIs
    if (kpiRes.status === "fulfilled" && kpiRes.value.data) { setKpis(kpiRes.value.data); setKpiError(null) }
    else { setKpiError(kpiRes.status === "fulfilled" ? (kpiRes.value.error ?? "Unknown") : kpiRes.reason?.message ?? "Failed") }

    // Sales Trend
    if (trendRes.status === "fulfilled" && trendRes.value.data) { setSalesTrend(trendRes.value.data); setTrendError(null) }
    else { setTrendError(trendRes.status === "fulfilled" ? (trendRes.value.error ?? "Unknown") : trendRes.reason?.message ?? "Failed") }

    // Top Products
    if (prodRes.status === "fulfilled" && prodRes.value.data) { setTopProducts(prodRes.value.data); setProductsError(null) }
    else { setProductsError(prodRes.status === "fulfilled" ? (prodRes.value.error ?? "Unknown") : prodRes.reason?.message ?? "Failed") }

    // Category Sales
    if (catRes.status === "fulfilled" && catRes.value.data) { setCategorySales(catRes.value.data); setCategoryError(null) }
    else { setCategoryError(catRes.status === "fulfilled" ? (catRes.value.error ?? "Unknown") : catRes.reason?.message ?? "Failed") }

    // Customer Analytics
    if (custRes.status === "fulfilled" && custRes.value.data) { setCustomerData(custRes.value.data); setCustomerError(null) }
    else { setCustomerError(custRes.status === "fulfilled" ? (custRes.value.error ?? "Unknown") : custRes.reason?.message ?? "Failed") }

    // Inventory
    if (invRes.status === "fulfilled" && invRes.value.data) { setInventory(invRes.value.data); setInventoryError(null) }
    else { setInventoryError(invRes.status === "fulfilled" ? (invRes.value.error ?? "Unknown") : invRes.reason?.message ?? "Failed") }

    // Purchases
    if (purchRes.status === "fulfilled" && purchRes.value.data) { setPurchases(purchRes.value.data); setPurchaseError(null) }
    else { setPurchaseError(purchRes.status === "fulfilled" ? (purchRes.value.error ?? "Unknown") : purchRes.reason?.message ?? "Failed") }

    // Expenses
    if (expRes.status === "fulfilled" && expRes.value.data) { setExpenses(expRes.value.data); setExpenseError(null) }
    else { setExpenseError(expRes.status === "fulfilled" ? (expRes.value.error ?? "Unknown") : expRes.reason?.message ?? "Failed") }

    // Profit & Loss
    if (plRes.status === "fulfilled" && plRes.value.data) { setProfitLoss(plRes.value.data); setPlError(null) }
    else { setPlError(plRes.status === "fulfilled" ? (plRes.value.error ?? "Unknown") : plRes.reason?.message ?? "Failed") }

    // Kitchen
    if (kitRes.status === "fulfilled" && kitRes.value.data) { setKitchen(kitRes.value.data); setKitchenError(null) }
    else { setKitchenError(kitRes.status === "fulfilled" ? (kitRes.value.error ?? "Unknown") : kitRes.reason?.message ?? "Failed") }

    // POS
    if (posRes.status === "fulfilled" && posRes.value.data) { setPosData(posRes.value.data); setPosError(null) }
    else { setPosError(posRes.status === "fulfilled" ? (posRes.value.error ?? "Unknown") : posRes.reason?.message ?? "Failed") }

    setLoading(false)
  }, [datePreset])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    getCafeId().then((cafeId) => {
      cleanup = subscribeToDashboard(cafeId, refresh)
    }).catch(() => {})
    return () => cleanup?.()
  }, [refresh])

  if (loading && !liveData && !kpis) {
    return <AdminLayout title="Dashboard"><BrandedLoader fullScreen message="Loading dashboard..." /></AdminLayout>
  }

  const revenueChange = kpis && kpis.orders_count > 0 ? kpis.net_profit : 0

  return (
    <AdminLayout title="Dashboard">
      <PageContainer>
        {/* Header + Date Filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader title="Dashboard" description="Cafe performance analytics" />
          <div className="flex items-center gap-2">
            <Select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-40"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7">Last 7 Days</option>
              <option value="last_30">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </Select>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {liveError && !liveData && <div className="mb-4"><Alert type="error" message={liveError} onDismiss={() => setLiveError(null)} /></div>}

        {/* ═══════════ ROW 1: KPI Cards ═══════════ */}
        {kpiError ? (
          <SectionFallback title="Key Metrics" error={kpiError} onRetry={refresh} />
        ) : !kpis ? (
          <SectionLoading title="Key Metrics" />
        ) : (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                  <DollarSign size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-xl font-bold">{formatCurrency(kpis.revenue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-odfe-teal/5">
                  <ShoppingCart size={20} className="text-odfe-teal" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-xl font-bold">{kpis.orders_count}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Order Value</p>
                  <p className="text-xl font-bold">{formatCurrency(kpis.avg_order_value)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpis.net_profit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                  {kpis.net_profit >= 0
                    ? <ArrowUpRight size={20} className="text-green-600" />
                    : <ArrowDownRight size={20} className="text-red-600" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                  <p className={`text-xl font-bold ${kpis.net_profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(kpis.net_profit)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════ ROW 2: Revenue Trend ═══════════ */}
        {trendError ? (
          <SectionFallback title="Revenue Trend" error={trendError} onRetry={refresh} />
        ) : !salesTrend ? (
          <SectionLoading title="Revenue Trend" />
        ) : (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-sm">Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="period_date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v?.slice(5) ?? ""}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value, name) => [
                        name === "revenue" ? formatCurrency(Number(value)) : value,
                        name === "revenue" ? "Revenue" : "Orders",
                      ]}
                      labelFormatter={(l) => `Date: ${l}`}
                    />
                    <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════ ROW 3: Top Products + Category Sales ═══════════ */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {productsError ? (
            <SectionFallback title="Top Products" error={productsError} onRetry={refresh} />
          ) : !topProducts ? (
            <SectionLoading title="Top Products" />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Top Products</CardTitle></CardHeader>
              <CardContent className="max-h-72 overflow-y-auto">
                {topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No product data</p>
                ) : (
                  <div className="space-y-2">
                    {topProducts.map((p, i) => (
                      <div key={p.product_id} className="flex items-center justify-between rounded-lg border border-cream-100 p-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-odfe-teal/10 text-[10px] font-bold text-odfe-teal">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-xs font-medium">{p.product_name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.quantity_sold} sold</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold">{formatCurrency(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {categoryError ? (
            <SectionFallback title="Sales by Category" error={categoryError} onRetry={refresh} />
          ) : !categorySales ? (
            <SectionLoading title="Sales by Category" />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Sales by Category</CardTitle></CardHeader>
              <CardContent>
                {categorySales.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No category data</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categorySales}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="revenue"
                          nameKey="category_name"
                          label={(props) =>
                            `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {categorySales.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══════════ ROW 4: Customer Analytics + Loyalty ═══════════ */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {customerError ? (
            <SectionFallback title="Customer Analytics" error={customerError} onRetry={refresh} />
          ) : !customerData ? (
            <SectionLoading title="Customer Analytics" />
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-sm">Customer Overview</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="rounded-lg border border-cream-100 p-3">
                      <p className="text-[10px] text-muted-foreground">Total Customers</p>
                      <p className="text-lg font-bold">{customerData.total_customers}</p>
                    </div>
                    <div className="rounded-lg border border-cream-100 p-3">
                      <p className="text-[10px] text-muted-foreground">Repeat Customers</p>
                      <p className="text-lg font-bold">{customerData.repeat_customers}</p>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <p className="text-[10px] uppercase text-muted-foreground mb-2">Top Customers</p>
                    {customerData.top_customers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No customers</p>
                    ) : (
                      <div className="space-y-1">
                        {customerData.top_customers.slice(0, 5).map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground">{formatCurrency(c.lifetime_spend)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Loyalty Program</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="rounded-lg border border-cream-100 p-3">
                      <p className="text-[10px] text-muted-foreground">Points Earned</p>
                      <p className="text-lg font-bold">{customerData.total_points_earned.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-cream-100 p-3">
                      <p className="text-[10px] text-muted-foreground">Points Redeemed</p>
                      <p className="text-lg font-bold">{customerData.total_points_redeemed.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <p className="text-[10px] uppercase text-muted-foreground mb-2">Tier Distribution</p>
                    {customerData.tier_distribution.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No tiers configured</p>
                    ) : (
                      <div className="space-y-1">
                        {customerData.tier_distribution.map((t, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-medium">{t.tier_name}</span>
                            <Badge variant="outline">{t.customer_count} customers</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ═══════════ ROW 5: Inventory Alerts + Purchase Summary ═══════════ */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {inventoryError ? (
            <SectionFallback title="Inventory Status" error={inventoryError} onRetry={refresh} />
          ) : !inventory ? (
            <SectionLoading title="Inventory Status" />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Inventory Status</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg border border-cream-100 p-3">
                    <p className="text-[10px] text-muted-foreground">Total Items</p>
                    <p className="text-lg font-bold">{inventory.total_items}</p>
                  </div>
                  <div className="rounded-lg border border-cream-100 p-3">
                    <p className="text-[10px] text-muted-foreground">Inventory Value</p>
                    <p className="text-lg font-bold">{formatCurrency(inventory.inventory_value)}</p>
                  </div>
                  <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-3">
                    <div className="flex items-center gap-1">
                      <AlertTriangle size={12} className="text-yellow-600" />
                      <p className="text-[10px] text-yellow-700">Low Stock</p>
                    </div>
                    <p className="text-lg font-bold text-yellow-700">{inventory.low_stock}</p>
                  </div>
                  <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                    <div className="flex items-center gap-1">
                      <XCircle size={12} className="text-red-600" />
                      <p className="text-[10px] text-red-700">Out of Stock</p>
                    </div>
                    <p className="text-lg font-bold text-red-700">{inventory.out_of_stock}</p>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  <p className="text-[10px] uppercase text-muted-foreground mb-2">Recent Movements</p>
                  {inventory.recent_movements.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No recent movements</p>
                  ) : (
                    <div className="space-y-1">
                      {inventory.recent_movements.slice(0, 5).map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            {m.type === "in" ? (
                              <ArrowUpRight size={10} className="text-green-600" />
                            ) : (
                              <ArrowDownRight size={10} className="text-red-600" />
                            )}
                            <span className="font-medium">{m.item_name}</span>
                          </div>
                          <span className={m.type === "in" ? "text-green-600" : "text-red-600"}>
                            {m.type === "in" ? "+" : "-"}{m.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {purchaseError ? (
            <SectionFallback title="Purchase Summary" error={purchaseError} onRetry={refresh} />
          ) : !purchases ? (
            <SectionLoading title="Purchase Summary" />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Purchase Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-lg border border-cream-100 p-3 mb-4">
                  <p className="text-[10px] text-muted-foreground">Total Spend</p>
                  <p className="text-lg font-bold">{formatCurrency(purchases.total_spend)}</p>
                </div>
                <div className="mb-4">
                  <p className="text-[10px] uppercase text-muted-foreground mb-2">By Status</p>
                  <div className="space-y-1">
                    {purchases.status_breakdown.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <Badge variant={s.status === "received" ? "success" : s.status === "cancelled" ? "danger" : "outline"}>
                          {s.status}
                        </Badge>
                        <span className="text-muted-foreground">{s.count} orders · {formatCurrency(s.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-2">Top Suppliers</p>
                  <div className="space-y-1">
                    {purchases.supplier_spend.slice(0, 3).map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="font-medium">{s.supplier_name ?? "Unknown"}</span>
                        <span className="text-muted-foreground">{formatCurrency(s.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══════════ ROW 6: Expenses + Profit & Loss ═══════════ */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {expenseError ? (
            <SectionFallback title="Expenses" error={expenseError} onRetry={refresh} />
          ) : !expenses ? (
            <SectionLoading title="Expenses" />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-lg border border-cream-100 p-3 mb-4">
                  <p className="text-[10px] text-muted-foreground">Total Expenses</p>
                  <p className="text-lg font-bold">{formatCurrency(expenses.total_expenses)}</p>
                </div>
                {expenses.categories.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] uppercase text-muted-foreground mb-2">By Category</p>
                    <div className="space-y-1">
                      {expenses.categories.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{c.category}</span>
                          <span className="text-muted-foreground">{formatCurrency(c.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {expenses.trend.length > 0 && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenses.trend}>
                        <XAxis dataKey="period_date" tick={{ fontSize: 8 }} tickFormatter={(v) => v?.slice(5) ?? ""} />
                        <YAxis tick={{ fontSize: 8 }} />
                        <Tooltip
                          contentStyle={{ fontSize: 10, borderRadius: 6 }}
                          formatter={(value) => [formatCurrency(Number(value)), "Expenses"]}
                        />
                        <Bar dataKey="total" fill="#ef4444" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {plError ? (
            <SectionFallback title="Profit & Loss" error={plError} onRetry={refresh} />
          ) : !profitLoss ? (
            <SectionLoading title="Profit & Loss" />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Profit & Loss</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-cream-100 p-3">
                    <span className="text-xs text-muted-foreground">Revenue</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(profitLoss.total_revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-cream-100 p-3">
                    <span className="text-xs text-muted-foreground">Expenses</span>
                    <span className="text-sm font-bold text-red-600">-{formatCurrency(profitLoss.total_expenses)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border-2 border-odfe-teal/20 bg-odfe-teal/5 p-3">
                    <span className="text-xs font-semibold">Net Profit</span>
                    <span className={`text-sm font-bold ${profitLoss.net_profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(profitLoss.net_profit)}
                    </span>
                  </div>
                </div>
                {profitLoss.expense_breakdown && profitLoss.expense_breakdown.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] uppercase text-muted-foreground mb-2">Expense Breakdown</p>
                    <div className="space-y-1">
                      {profitLoss.expense_breakdown.map((e, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{e.category}</span>
                          <span className="text-muted-foreground">{formatCurrency(e.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══════════ ROW 7: Kitchen + POS Operations ═══════════ */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {kitchenError ? (
            <SectionFallback title="Kitchen Operations" error={kitchenError} onRetry={refresh} />
          ) : !kitchen ? (
            <SectionLoading title="Kitchen Operations" />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Kitchen Operations</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg border border-cream-100 p-3">
                    <div className="flex items-center gap-1">
                      <Clock size={10} className="text-orange-500" />
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                    </div>
                    <p className="text-lg font-bold">{kitchen.pending}</p>
                  </div>
                  <div className="rounded-lg border border-cream-100 p-3">
                    <div className="flex items-center gap-1">
                      <ChefHat size={10} className="text-blue-500" />
                      <p className="text-[10px] text-muted-foreground">Preparing</p>
                    </div>
                    <p className="text-lg font-bold">{kitchen.preparing}</p>
                  </div>
                  <div className="rounded-lg border border-cream-100 p-3">
                    <div className="flex items-center gap-1">
                      <Package size={10} className="text-green-500" />
                      <p className="text-[10px] text-muted-foreground">Ready</p>
                    </div>
                    <p className="text-lg font-bold">{kitchen.ready}</p>
                  </div>
                  <div className="rounded-lg border border-cream-100 p-3">
                    <div className="flex items-center gap-1">
                      <BarChart3 size={10} className="text-odfe-teal" />
                      <p className="text-[10px] text-muted-foreground">Completed (7d)</p>
                    </div>
                    <p className="text-lg font-bold">{kitchen.completed_today}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-cream-100 p-3">
                  <p className="text-[10px] text-muted-foreground">Avg Completion Time (7d)</p>
                  <p className="text-lg font-bold">{formatElapsed(kitchen.avg_completion_seconds)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {posError ? (
            <SectionFallback title="POS & Tables" error={posError} onRetry={refresh} />
          ) : !posData ? (
            <SectionLoading title="POS & Tables" />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">POS & Table Operations</CardTitle></CardHeader>
              <CardContent>
                {/* Order Type Breakdown */}
                <div className="mb-4">
                  <p className="text-[10px] uppercase text-muted-foreground mb-2">Order Type</p>
                  <div className="space-y-1">
                    {posData.order_type_breakdown.map((o, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          {o.order_type === "pos" ? <ShoppingBag size={10} /> : <Truck size={10} />}
                          <span className="font-medium capitalize">{o.order_type.replace("_", " ")}</span>
                        </div>
                        <span className="text-muted-foreground">{o.count} orders · {formatCurrency(o.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="mb-4">
                  <p className="text-[10px] uppercase text-muted-foreground mb-2">Payment Methods</p>
                  <div className="space-y-1">
                    {posData.payment_method_breakdown.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="font-medium capitalize">{p.method}</span>
                        <span className="text-muted-foreground">{p.count} txns · {formatCurrency(p.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Table Stats */}
                {posData.table_stats.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground mb-2">Table Performance</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {posData.table_stats.filter(t => t.order_count > 0).slice(0, 5).map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <Table2 size={10} />
                            <span className="font-medium">Table {t.table_label}</span>
                          </div>
                          <span className="text-muted-foreground">{t.order_count} orders · {formatCurrency(t.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══════════ Live Operational Data (Existing) ═══════════ */}
        {liveData && (
          <>
            {/* Live KPIs */}
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                    <Clock size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Orders</p>
                    <p className="text-xl font-bold">{liveData.pendingOrders}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                    <ChefHat size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kitchen Queue</p>
                    <p className="text-xl font-bold">{liveData.kitchenQueue}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-odfe-gold/10">
                    <Table2 size={20} className="text-odfe-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active Tables</p>
                    <p className="text-xl font-bold">{liveData.activeTables}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                    <XCircle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cancelled Today</p>
                    <p className="text-xl font-bold">{liveData.cancelledOrders}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Revenue + Weekly/Monthly Charts */}
            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-sm">Today&apos;s Revenue (Hourly)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={liveData.revenueChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
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
                  {liveData.topProduct && (
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Best Seller</p>
                      <p className="text-sm font-semibold">{liveData.topProduct.name}</p>
                      <p className="text-xs text-muted-foreground">{liveData.topProduct.sold} sold · {formatCurrency(liveData.topProduct.revenue)}</p>
                    </div>
                  )}
                  {liveData.mostActiveTable && (
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Most Active Table</p>
                      <p className="text-sm font-semibold">Table {liveData.mostActiveTable.label}</p>
                      <p className="text-xs text-muted-foreground">{liveData.mostActiveTable.orders} orders</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Weekly + Monthly Charts */}
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-sm">This Week&apos;s Sales</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={liveData.revenueWeekly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
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
                      <LineChart data={liveData.revenueMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
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
                  {liveData.recentOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders</p>
                  ) : (
                    <div className="divide-y divide-cream-100">
                      {liveData.recentOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between py-2 text-sm">
                          <div>
                            <p className="font-medium text-xs">{order.orderNumber}</p>
                            <div className="flex items-center gap-1">
                              <Badge>{order.status.replaceAll("_", " ")}</Badge>
                              {order.tableLabel && <span className="text-[10px] text-muted-foreground">T{order.tableLabel}</span>}
                            </div>
                          </div>
                          <span className="font-semibold text-xs">{formatCurrency(order.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Recent Payments</CardTitle></CardHeader>
                <CardContent className="max-h-64 overflow-y-auto">
                  {liveData.recentPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments</p>
                  ) : (
                    <div className="divide-y divide-cream-100">
                      {liveData.recentPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                          <div>
                            <p className="text-xs font-medium">{p.orderNumber}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{p.method}{p.reference ? ` (${p.reference})` : ""}</p>
                          </div>
                          <span className="font-semibold text-xs">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Kitchen Queue</CardTitle></CardHeader>
                <CardContent className="max-h-64 overflow-y-auto">
                  {liveData.kitchenTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Queue empty</p>
                  ) : (
                    <div className="divide-y divide-cream-100">
                      {liveData.kitchenTickets.map((t) => (
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
          </>
        )}
      </PageContainer>
    </AdminLayout>
  )
}
