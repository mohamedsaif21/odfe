import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"

export type DashboardData = {
  todayRevenue: number
  todayOrders: number
  averageOrder: number
  cancelledOrders: number
  pendingOrders: number
  kitchenQueue: number
  topProduct: { name: string; sold: number; revenue: number } | null
  topCategory: { name: string; sold: number; revenue: number } | null
  mostActiveTable: { label: string; orders: number } | null
  currentCustomers: number
  activeTables: number
  revenueChart: Array<{ label: string; revenue: number; orders: number }>
  revenueWeekly: Array<{ label: string; revenue: number }>
  revenueMonthly: Array<{ label: string; revenue: number }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    status: string
    total: number
    createdAt: string
    tableLabel: string | null
    paymentMethods: string
  }>
  recentPayments: Array<{
    id: string
    orderNumber: string
    method: string
    amount: number
    reference: string | null
    status: string
    paidAt: string
  }>
  kitchenTickets: Array<{
    id: string
    orderNumber: string
    tableLabel: string | null
    stage: string
    elapsedSeconds: number
    items: Array<{ name: string; qty: number }>
  }>
}

export async function fetchDashboardData(cafeId?: string): Promise<DashboardData> {
  const supabase = createClient()
  const activeCafeId = cafeId ?? (await getCafeId(supabase))

  const today = new Date()
  const todayStart = today.toISOString().slice(0, 10)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(today)
  monthAgo.setDate(monthAgo.getDate() - 30)

  const [
    ordersResult,
    paymentsResult,
    tablesResult,
    kitchenResult,
    orderItemsResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, table_id, employee_id")
      .eq("cafe_id", activeCafeId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("payments")
      .select("id, order_id, method, amount, reference, status, paid_at")
      .eq("cafe_id", activeCafeId)
      .order("paid_at", { ascending: false })
      .limit(50),
    supabase
      .from("cafe_tables")
      .select("id, label, status")
      .eq("cafe_id", activeCafeId),
    supabase
      .from("kitchen_tickets")
      .select("id, order_number, table_label, stage, created_at, preparing_at, completed_at")
      .eq("cafe_id", activeCafeId)
      .in("stage", ["to_cook", "preparing"])
      .order("created_at", { ascending: true }),
    supabase
      .from("order_items")
      .select("product_name, quantity, line_total, order_id")
      .eq("cafe_id", activeCafeId)
      .gte("created_at", monthAgo.toISOString()),
  ])

  if (ordersResult.error) throw new Error(ordersResult.error.message)
  if (paymentsResult.error) throw new Error(paymentsResult.error.message)
  if (tablesResult.error) throw new Error(tablesResult.error.message)
  if (kitchenResult.error) throw new Error(kitchenResult.error.message)
  if (orderItemsResult.error) throw new Error(orderItemsResult.error.message)

  const orders = ordersResult.data ?? []
  const payments = paymentsResult.data ?? []
  const tables = tablesResult.data ?? []
  const kitchenTickets = kitchenResult.data ?? []
  const orderItems = orderItemsResult.data ?? []

  const todayOrders = orders.filter((o) => o.created_at?.slice(0, 10) === todayStart)
  const todayPaymentSum = payments
    .filter((p) => p.status === "completed" && p.paid_at?.slice(0, 10) === todayStart)
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const todayOrderTotal = todayOrders.reduce((sum, o) => sum + Number(o.total), 0)
  const averageOrder = todayOrders.length ? todayOrderTotal / todayOrders.length : 0
  const cancelledOrders = todayOrders.filter((o) => o.status === "cancelled").length
  const pendingOrders = todayOrders.filter((o) =>
    ["draft", "sent_to_kitchen", "to_cook", "preparing"].includes(o.status)
  ).length
  const activeTables = tables.filter((t) => t.status === "occupied" || t.status === "reserved").length

  // Table usage
  const tableOrderCount = new Map<string, number>()
  orders.forEach((o) => {
    if (o.table_id) {
      tableOrderCount.set(o.table_id, (tableOrderCount.get(o.table_id) ?? 0) + 1)
    }
  })
  let mostActiveTable: { label: string; orders: number } | null = null
  let maxOrders = 0
  tableOrderCount.forEach((count, tableId) => {
    if (count > maxOrders) {
      maxOrders = count
      const table = tables.find((t) => t.id === tableId)
      mostActiveTable = { label: table?.label ?? "Unknown", orders: count }
    }
  })

  // Top product
  const productSales = new Map<string, { name: string; sold: number; revenue: number }>()
  orderItems.forEach((item) => {
    const existing = productSales.get(item.product_name) ?? {
      name: item.product_name,
      sold: 0,
      revenue: 0,
    }
    existing.sold += item.quantity
    existing.revenue += Number(item.line_total)
    productSales.set(item.product_name, existing)
  })
  let topProduct: { name: string; sold: number; revenue: number } | null = null
  let maxSold = 0
  productSales.forEach((p) => {
    if (p.sold > maxSold) {
      maxSold = p.sold
      topProduct = p
    }
  })

  // Top category (simplified — from products)
  const categorySales = new Map<string, { name: string; sold: number; revenue: number }>()
  orderItems.forEach((item) => {
    const existing = categorySales.get(item.product_name) ?? {
      name: item.product_name,
      sold: 0,
      revenue: 0,
    }
    existing.sold += item.quantity
    existing.revenue += Number(item.line_total)
    categorySales.set(item.product_name, existing)
  })
  let topCategory: { name: string; sold: number; revenue: number } | null = null
  let maxCatSold = 0
  categorySales.forEach((p) => {
    if (p.sold > maxCatSold) {
      maxCatSold = p.sold
      topCategory = p
    }
  })

  // Current customers: unique customer_ids in recent orders
  const customerIds = new Set(orders.filter((o) => o.employee_id).map((o) => o.employee_id))

  // Hourly revenue chart (today)
  const hourlyMap = new Map<string, { revenue: number; orders: number }>()
  for (let h = 0; h < 24; h++) {
    const label = `${h.toString().padStart(2, "0")}:00`
    hourlyMap.set(label, { revenue: 0, orders: 0 })
  }
  todayOrders.forEach((o) => {
    if (o.created_at) {
      const hour = o.created_at.slice(11, 13)
      const label = `${hour}:00`
      const entry = hourlyMap.get(label)
      if (entry) {
        entry.orders++
        entry.revenue += Number(o.total)
      }
    }
  })
  const revenueChart = Array.from(hourlyMap.entries()).map(([label, data]) => ({
    label,
    revenue: Math.round(data.revenue * 100) / 100,
    orders: data.orders,
  }))

  // Weekly revenue
  const weeklyMap = new Map<string, number>()
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const weekPayments = payments.filter(
    (p) => p.status === "completed" && p.paid_at && p.paid_at >= weekAgo.toISOString()
  )
  weekPayments.forEach((p) => {
    if (p.paid_at) {
      const day = new Date(p.paid_at).getDay()
      const label = dayNames[day]
      weeklyMap.set(label, (weeklyMap.get(label) ?? 0) + Number(p.amount))
    }
  })
  const revenueWeekly = dayNames.map((name) => ({
    label: name,
    revenue: Math.round((weeklyMap.get(name) ?? 0) * 100) / 100,
  }))

  // Monthly revenue
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const monthlyMap = new Map<string, number>()
  const monthPayments = payments.filter(
    (p) => p.status === "completed" && p.paid_at && p.paid_at >= monthAgo.toISOString()
  )
  monthPayments.forEach((p) => {
    if (p.paid_at) {
      const d = new Date(p.paid_at)
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      monthlyMap.set(label, (monthlyMap.get(label) ?? 0) + Number(p.amount))
    }
  })
  const revenueMonthly = Array.from(monthlyMap.entries()).map(([label, revenue]) => ({
    label,
    revenue: Math.round(revenue * 100) / 100,
  }))

  // Recent payments
  const paidPayments = payments.filter((p) => p.status === "completed").slice(0, 10)
  const recentPayments = paidPayments.map((p) => {
    const order = orders.find((o) => o.id === p.order_id)
    return {
      id: p.id,
      orderNumber: order?.order_number ?? p.order_id.slice(0, 8),
      method: p.method,
      amount: Number(p.amount),
      reference: p.reference,
      status: p.status,
      paidAt: p.paid_at ?? "",
    }
  })

  // Kitchen tickets
  const kitchenTicketsWithItems = kitchenTickets.map((t) => {
    const elapsed = t.created_at
      ? Math.floor(
          (Date.now() - new Date(t.created_at).getTime()) / 1000
        )
      : 0
    return {
      id: t.id,
      orderNumber: t.order_number,
      tableLabel: t.table_label,
      stage: t.stage,
      elapsedSeconds: elapsed,
      items: [],
    }
  })

  // Recent orders with payment methods
  const recentOrders = orders.slice(0, 10).map((o) => {
    const orderPayments = payments.filter((p) => p.order_id === o.id)
    const methods = orderPayments.map((p) => p.method).filter(Boolean)
    return {
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      total: Number(o.total),
      createdAt: o.created_at,
      tableLabel: tables.find((t) => t.id === o.table_id)?.label ?? null,
      paymentMethods: methods.length ? methods.join(", ") : "",
    }
  })

  return {
    todayRevenue: Math.round(todayPaymentSum * 100) / 100,
    todayOrders: todayOrders.length,
    averageOrder: Math.round(averageOrder * 100) / 100,
    cancelledOrders,
    pendingOrders,
    kitchenQueue: kitchenTickets.length,
    topProduct,
    topCategory,
    mostActiveTable,
    currentCustomers: customerIds.size,
    activeTables,
    revenueChart,
    revenueWeekly,
    revenueMonthly,
    recentOrders,
    recentPayments,
    kitchenTickets: kitchenTicketsWithItems,
  }
}

export function subscribeToDashboard(
  cafeId: string,
  onUpdate: () => void
) {
  const supabase = createClient()

  const channel = supabase
    .channel(`dashboard-${cafeId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `cafe_id=eq.${cafeId}` },
      () => onUpdate()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "payments", filter: `cafe_id=eq.${cafeId}` },
      () => onUpdate()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cafe_tables", filter: `cafe_id=eq.${cafeId}` },
      () => onUpdate()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "kitchen_tickets", filter: `cafe_id=eq.${cafeId}` },
      () => onUpdate()
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
