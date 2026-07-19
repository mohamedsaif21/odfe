import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"

export type ReportPeriod = "daily" | "weekly" | "monthly"

export type ReportData = {
  revenue: number
  ordersCount: number
  averageOrder: number
  taxTotal: number
  discountTotal: number
  revenueByMethod: Array<{ method: string; amount: number; count: number }>
  categorySales: Array<{ name: string; quantity: number; revenue: number }>
  employeeSales: Array<{ name: string; orders: number; revenue: number }>
  kitchenPerformance: { totalTickets: number; avgPrepSeconds: number; completedTickets: number }
  couponUsage: Array<{ code: string; used: number; discountGiven: number }>
  customerGrowth: number
  bestProducts: Array<{ name: string; quantity: number; revenue: number }>
}

function inPeriod(dateValue: string | null, period: ReportPeriod): boolean {
  if (!dateValue) return false
  const date = new Date(dateValue)
  const now = new Date()
  if (period === "daily") return date.toDateString() === now.toDateString()
  const days = (now.getTime() - date.getTime()) / 86400000
  if (period === "weekly") return days >= 0 && days < 7
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

export async function fetchReportData(period: ReportPeriod, cafeId?: string): Promise<ReportData> {
  const supabase = createClient()
  const activeCafeId = cafeId ?? (await getCafeId(supabase))

  const [ordersRes, paymentsRes, itemsRes, employeesRes, ticketsRes, couponsRes, customersRes] = await Promise.all([
    supabase.from("orders").select("*").eq("cafe_id", activeCafeId).order("created_at", { ascending: false }),
    supabase.from("payments").select("*, orders!inner(order_number)").eq("cafe_id", activeCafeId),
    supabase.from("order_items").select("*").eq("cafe_id", activeCafeId),
    supabase.from("employees").select("id, profile_id, profiles!inner(full_name)").eq("cafe_id", activeCafeId),
    supabase.from("kitchen_tickets").select("*").eq("cafe_id", activeCafeId),
    supabase.from("orders").select("coupon_code, total, discount_total, created_at, cafe_id").eq("cafe_id", activeCafeId).not("coupon_code", "is", null),
    supabase.from("customers").select("created_at").eq("cafe_id", activeCafeId),
  ])

  if (ordersRes.error) throw new Error(ordersRes.error.message)
  if (paymentsRes.error) throw new Error(paymentsRes.error.message)
  if (itemsRes.error) throw new Error(itemsRes.error.message)
  if (employeesRes.error) throw new Error(employeesRes.error.message)
  if (ticketsRes.error) throw new Error(ticketsRes.error.message)
  if (couponsRes.error) throw new Error(couponsRes.error.message)
  if (customersRes.error) throw new Error(customersRes.error.message)

  const allOrders = ordersRes.data ?? []
  const allPayments = paymentsRes.data ?? []
  const allItems = itemsRes.data ?? []
  const allEmployees = employeesRes.data ?? []
  const allTickets = ticketsRes.data ?? []
  const couponOrders = couponsRes.data ?? []
  const allCustomers = customersRes.data ?? []

  // Filter by period
  const scopedOrders = allOrders.filter((o) => inPeriod(o.created_at, period))
  const scopedPayments = allPayments.filter(
    (p) => p.status === "completed" && inPeriod(p.paid_at, period)
  )
  const scopedOrderIds = new Set(scopedOrders.map((o) => o.id))
  const scopedItems = allItems.filter((i) => scopedOrderIds.has(i.order_id))
  const scopedTickets = allTickets.filter((t) => inPeriod(t.created_at, period))

  // Revenue by payment method
  const methodMap = new Map<string, { amount: number; count: number }>()
  scopedPayments.forEach((p) => {
    const entry = methodMap.get(p.method) ?? { amount: 0, count: 0 }
    entry.amount += Number(p.amount)
    entry.count++
    methodMap.set(p.method, entry)
  })

  // Category sales (by product name as proxy)
  const catMap = new Map<string, { quantity: number; revenue: number }>()
  scopedItems.forEach((item) => {
    const entry = catMap.get(item.product_name) ?? { quantity: 0, revenue: 0 }
    entry.quantity += item.quantity
    entry.revenue += Number(item.line_total)
    catMap.set(item.product_name, entry)
  })

  // Employee sales
  const employeeNameMap = new Map<string, string>()
  allEmployees.forEach((emp) => {
    const profile = emp.profiles as unknown as { full_name: string }
    employeeNameMap.set(emp.id, profile?.full_name ?? "Unknown")
  })
  const empMap = new Map<string, { orders: number; revenue: number }>()
  scopedOrders.forEach((o) => {
    if (o.employee_id) {
      const entry = empMap.get(o.employee_id) ?? { orders: 0, revenue: 0 }
      entry.orders++
      entry.revenue += Number(o.total)
      empMap.set(o.employee_id, entry)
    }
  })

  // Kitchen performance
  const completedTickets = scopedTickets.filter((t) => t.stage === "completed")
  let avgPrepSeconds = 0
  if (completedTickets.length > 0) {
    const totalSeconds = completedTickets.reduce((sum, t) => {
      if (t.created_at && t.completed_at) {
        return sum + (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 1000
      }
      return sum
    }, 0)
    avgPrepSeconds = Math.round(totalSeconds / completedTickets.length)
  }

  // Coupon usage
  const couponMap = new Map<string, { used: number; discountGiven: number }>()
  couponOrders.forEach((o) => {
    if (o.coupon_code && inPeriod(o.created_at, period)) {
      const entry = couponMap.get(o.coupon_code) ?? { used: 0, discountGiven: 0 }
      entry.used++
      entry.discountGiven += Number(o.discount_total)
      couponMap.set(o.coupon_code, entry)
    }
  })

  // Customer growth
  const newCustomers = allCustomers.filter((c) => inPeriod(c.created_at, period))

  // Best products
  const productMap = new Map<string, { quantity: number; revenue: number }>()
  scopedItems.forEach((item) => {
    const entry = productMap.get(item.product_name) ?? { quantity: 0, revenue: 0 }
    entry.quantity += item.quantity
    entry.revenue += Number(item.line_total)
    productMap.set(item.product_name, entry)
  })

  const revenue = scopedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const taxTotal = scopedOrders.reduce((sum, o) => sum + Number(o.tax_total), 0)
  const discountTotal = scopedOrders.reduce((sum, o) => sum + Number(o.discount_total), 0)

  return {
    revenue,
    ordersCount: scopedOrders.length,
    averageOrder: scopedOrders.length ? revenue / scopedOrders.length : 0,
    taxTotal,
    discountTotal,
    revenueByMethod: Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
    })),
    categorySales: Array.from(catMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity),
    employeeSales: Array.from(empMap.entries())
      .map(([id, data]) => ({
        name: employeeNameMap.get(id) ?? "Unknown",
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue),
    kitchenPerformance: {
      totalTickets: scopedTickets.length,
      avgPrepSeconds,
      completedTickets: completedTickets.length,
    },
    couponUsage: Array.from(couponMap.entries()).map(([code, data]) => ({
      code,
      ...data,
    })),
    customerGrowth: newCustomers.length,
    bestProducts: Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
  }
}

export async function generateReportPdf(report: ReportData, period: ReportPeriod): Promise<void> {
  const jsPDF = (await import("jspdf")).default
  const doc = new jsPDF()
  const periodLabel = period.charAt(0).toUpperCase() + period.slice(1)

  doc.setFontSize(18)
  doc.text(`OdFe ${periodLabel} Report`, 14, 18)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 26)

  let y = 36
  const line = () => { doc.text("━".repeat(60), 14, y); y += 4 }

  // Summary
  doc.setFontSize(13)
  doc.text("Summary", 14, y); y += 6
  doc.setFontSize(10)
  doc.text(`Revenue:     Rs ${report.revenue.toFixed(2)}`, 14, y); y += 5
  doc.text(`Orders:      ${report.ordersCount}`, 14, y); y += 5
  doc.text(`Avg Order:   Rs ${report.averageOrder.toFixed(2)}`, 14, y); y += 5
  doc.text(`Tax Total:   Rs ${report.taxTotal.toFixed(2)}`, 14, y); y += 5
  doc.text(`Discounts:   Rs ${report.discountTotal.toFixed(2)}`, 14, y); y += 5

  // Payment methods
  y += 4; line()
  doc.setFontSize(13)
  doc.text("Payment Methods", 14, y); y += 6
  doc.setFontSize(10)
  report.revenueByMethod.forEach((m) => {
    doc.text(`${m.method.padEnd(12)} Rs ${m.amount.toFixed(2).padStart(10)} (${m.count} txns)`, 14, y); y += 5
  })

  // Best products
  if (report.bestProducts.length) {
    y += 4; line()
    doc.setFontSize(13)
    doc.text("Best Sellers", 14, y); y += 6
    doc.setFontSize(10)
    report.bestProducts.slice(0, 10).forEach((p, i) => {
      doc.text(`${i + 1}. ${p.name.slice(0, 30).padEnd(32)} ${p.quantity}x  Rs ${p.revenue.toFixed(2)}`, 14, y); y += 5
    })
  }

  // Coupon usage
  if (report.couponUsage.length) {
    y += 4; line()
    doc.setFontSize(13)
    doc.text("Coupon Usage", 14, y); y += 6
    doc.setFontSize(10)
    report.couponUsage.forEach((c) => {
      doc.text(`${c.code.padEnd(20)} ${c.used}x  Rs ${c.discountGiven.toFixed(2)} given`, 14, y); y += 5
    })
  }

  // Kitchen performance
  y += 4; line()
  doc.setFontSize(13)
  doc.text("Kitchen Performance", 14, y); y += 6
  doc.setFontSize(10)
  doc.text(`Total tickets:  ${report.kitchenPerformance.totalTickets}`, 14, y); y += 5
  doc.text(`Completed:      ${report.kitchenPerformance.completedTickets}`, 14, y); y += 5
  const avgMin = Math.floor(report.kitchenPerformance.avgPrepSeconds / 60)
  const avgSec = report.kitchenPerformance.avgPrepSeconds % 60
  doc.text(`Avg prep time:  ${avgMin}m ${avgSec}s`, 14, y); y += 5

  // Customer growth
  y += 4; line()
  doc.text(`New customers this ${period}: ${report.customerGrowth}`, 14, y); y += 8

  doc.save(`odfe-${period}-report.pdf`)
}

export async function generateReportXls(report: ReportData, period: ReportPeriod): Promise<void> {
  const { utils, writeFile } = await import("xlsx")

  const summary = [
    { Metric: "Period", Value: period },
    { Metric: "Revenue", Value: report.revenue },
    { Metric: "Orders", Value: report.ordersCount },
    { Metric: "Average Order", Value: report.averageOrder },
    { Metric: "Tax Total", Value: report.taxTotal },
    { Metric: "Discount Total", Value: report.discountTotal },
    { Metric: "New Customers", Value: report.customerGrowth },
  ]
  const methodRows = report.revenueByMethod.map((m) => ({
    Method: m.method,
    Amount: m.amount,
    Transactions: m.count,
  }))
  const productRows = report.bestProducts.map((p) => ({
    Product: p.name,
    Quantity: p.quantity,
    Revenue: p.revenue,
  }))
  const employeeRows = report.employeeSales.map((e) => ({
    Employee: e.name,
    Orders: e.orders,
    Revenue: e.revenue,
  }))
  const couponRows = report.couponUsage.map((c) => ({
    Coupon: c.code,
    Used: c.used,
    "Discount Given": c.discountGiven,
  }))
  const kitchenRow = [
    { Metric: "Total Tickets", Value: report.kitchenPerformance.totalTickets },
    { Metric: "Completed", Value: report.kitchenPerformance.completedTickets },
    { Metric: "Avg Prep Time (s)", Value: report.kitchenPerformance.avgPrepSeconds },
  ]

  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, utils.json_to_sheet(summary), "Summary")
  if (methodRows.length) utils.book_append_sheet(workbook, utils.json_to_sheet(methodRows), "Payments")
  if (productRows.length) utils.book_append_sheet(workbook, utils.json_to_sheet(productRows), "Best Sellers")
  if (employeeRows.length) utils.book_append_sheet(workbook, utils.json_to_sheet(employeeRows), "Employees")
  if (couponRows.length) utils.book_append_sheet(workbook, utils.json_to_sheet(couponRows), "Coupons")
  utils.book_append_sheet(workbook, utils.json_to_sheet(kitchenRow), "Kitchen")
  writeFile(workbook, `odfe-${period}-report.xlsx`)
}
