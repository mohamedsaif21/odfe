import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"

// ─── Date Range Types ────────────────────────────────────────────────────

export type DateRange = {
  start: string
  end: string
  label: string
}

export function getDateRange(preset: string): DateRange {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  switch (preset) {
    case "today":
      return { start: today, end: today, label: "Today" }
    case "yesterday": {
      const d = new Date(now)
      d.setDate(d.getDate() - 1)
      const ds = d.toISOString().slice(0, 10)
      return { start: ds, end: ds, label: "Yesterday" }
    }
    case "last_7": {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return { start: d.toISOString().slice(0, 10), end: today, label: "Last 7 Days" }
    }
    case "last_30": {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      return { start: d.toISOString().slice(0, 10), end: today, label: "Last 30 Days" }
    }
    case "this_month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: first.toISOString().slice(0, 10), end: today, label: "This Month" }
    }
    default:
      return { start: today, end: today, label: "Today" }
  }
}

// ─── RPC Types ───────────────────────────────────────────────────────────

export type DashboardKPIs = {
  revenue: number
  orders_count: number
  avg_order_value: number
  cancelled_orders: number
  net_profit: number
}

export type SalesTrendPoint = {
  period_date: string
  revenue: number
  orders_count: number
}

export type TopProduct = {
  product_id: string
  product_name: string
  quantity_sold: number
  revenue: number
}

export type CategorySalesPoint = {
  category_name: string
  quantity_sold: number
  revenue: number
}

export type CustomerAnalytics = {
  total_customers: number
  repeat_customers: number
  top_customers: Array<{
    name: string
    lifetime_spend: number
    visit_count: number
    loyalty_points: number
  }>
  tier_distribution: Array<{
    tier_name: string
    customer_count: number
  }>
  total_points_earned: number
  total_points_redeemed: number
}

export type InventorySummary = {
  total_items: number
  low_stock: number
  out_of_stock: number
  inventory_value: number
  recent_movements: Array<{
    item_id: string
    item_name: string
    quantity: number
    type: string
    note: string | null
    is_wastage: boolean
    created_at: string
  }>
}

export type PurchaseSummary = {
  total_spend: number
  status_breakdown: Array<{
    status: string
    count: number
    total: number
  }>
  supplier_spend: Array<{
    supplier_name: string | null
    total: number
  }>
  purchase_trend: Array<{
    period_date: string
    count: number
    total: number
  }>
}

export type ExpenseSummary = {
  total_expenses: number
  categories: Array<{
    category: string
    total: number
  }>
  trend: Array<{
    period_date: string
    total: number
  }>
}

export type KitchenSummary = {
  pending: number
  preparing: number
  ready: number
  completed_today: number
  avg_completion_seconds: number
}

export type PosSummary = {
  table_stats: Array<{
    table_label: string
    order_count: number
    revenue: number
  }>
  order_type_breakdown: Array<{
    order_type: string
    count: number
    revenue: number
  }>
  payment_method_breakdown: Array<{
    method: string
    count: number
    total: number
  }>
}

export type ProfitLossData = {
  total_revenue: number
  total_expenses: number
  net_profit: number
  expense_breakdown: Array<{
    category: string
    total: number
  }>
}

// ─── Service Functions ───────────────────────────────────────────────────

function rpc<T>(fn: string, params: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  return new Promise(async (resolve) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc(fn, params)
      if (error) {
        resolve({ data: null, error: error.message })
      } else {
        resolve({ data: data as T, error: null })
      }
    } catch (err) {
      resolve({ data: null, error: err instanceof Error ? err.message : "Unknown error" })
    }
  })
}

export async function getDashboardKPIs(range: DateRange): Promise<{ data: DashboardKPIs | null; error: string | null }> {
  const supabase = createClient()
  const cafeId = await getCafeId(supabase)
  return rpc<DashboardKPIs>("get_dashboard_kpis", {
    p_cafe_id: cafeId,
    p_start_date: range.start,
    p_end_date: range.end,
  })
}

export async function getSalesTrend(range: DateRange, granularity: "day" | "week" | "month" = "day") {
  const supabase = createClient()
  const cafeId = await getCafeId(supabase)
  return rpc<SalesTrendPoint[]>("get_sales_trend", {
    p_cafe_id: cafeId,
    p_start_date: range.start,
    p_end_date: range.end,
    p_granularity: granularity,
  })
}

export async function getTopProducts(range: DateRange, limit = 10) {
  const supabase = createClient()
  const cafeId = await getCafeId(supabase)
  return rpc<TopProduct[]>("get_top_products", {
    p_cafe_id: cafeId,
    p_start_date: range.start,
    p_end_date: range.end,
    p_limit: limit,
  })
}

export async function getCategorySales(range: DateRange) {
  const supabase = createClient()
  const cafeId = await getCafeId(supabase)
  return rpc<CategorySalesPoint[]>("get_category_sales", {
    p_cafe_id: cafeId,
    p_start_date: range.start,
    p_end_date: range.end,
  })
}

export async function getCustomerAnalytics() {
  const supabase = createClient()
  const cafeId = await getCafeId(supabase)
  return rpc<CustomerAnalytics>("get_customer_analytics", {
    p_cafe_id: cafeId,
  })
}

export async function getInventorySummary() {
  const supabase = createClient()
  const cafeId = await getCafeId(supabase)
  return rpc<InventorySummary>("get_inventory_summary", {
    p_cafe_id: cafeId,
  })
}

export async function getPurchaseSummary(range: DateRange) {
  const supabase = createClient()
  const cafeId = await getCafeId(supabase)
  return rpc<PurchaseSummary>("get_purchase_summary", {
    p_cafe_id: cafeId,
    p_start_date: range.start,
    p_end_date: range.end,
  })
}

export async function getExpenseSummary(range: DateRange) {
  const supabase = createClient()
  const cafeId = await getCafeId(supabase)
  return rpc<ExpenseSummary>("get_expense_summary", {
    p_cafe_id: cafeId,
    p_start_date: range.start,
    p_end_date: range.end,
  })
}

export async function getKitchenSummary() {
  const supabase = createClient()
  const cafeId = await getCafeId(supabase)
  return rpc<KitchenSummary>("get_kitchen_summary", {
    p_cafe_id: cafeId,
  })
}

export async function getPosSummary(range: DateRange) {
  const supabase = createClient()
  const cafeId = await getCafeId(supabase)
  return rpc<PosSummary>("get_pos_summary", {
    p_cafe_id: cafeId,
    p_start_date: range.start,
    p_end_date: range.end,
  })
}

export async function getProfitLoss(range: DateRange) {
  const supabase = createClient()
  const cafeId = await getCafeId(supabase)
  return rpc<ProfitLossData>("get_profit_loss", {
    p_cafe_id: cafeId,
    p_start_date: range.start,
    p_end_date: range.end,
  })
}
