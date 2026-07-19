"use client"

import { createClient } from "@/lib/supabase/client"
import type { AppliedCoupon, CartLine } from "@/types/app"
import type { PaymentMethodType } from "@/types/database"

export type OrderSource = "pos" | "self_order"

type CreateOrderRpcRow = {
  order_id: string
  order_number: string
  ticket_id: string
  subtotal: number
  discount_total: number
  tax_total: number
  total: number
}

export interface CreateOrderInput {
  cafeId: string
  employeeId: string | null
  customerId: string | null
  tableId: string | null
  sessionId?: string | null
  lines: CartLine[]
  coupon: AppliedCoupon | null
  notes?: string | null
  source: OrderSource
}

export interface CreateOrderResult {
  orderId: string
  orderNumber: string
  ticketId: string
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
}

export interface CreatePaymentInput {
  cafeId: string
  orderId: string
  method: PaymentMethodType
  amount: number
  reference: string | null
}

export interface CreatePaymentResult {
  paymentId: string
  orderId: string
  amountPaid: number
  totalPaid: number
  orderTotal: number
  remaining: number
  fullyPaid: boolean
  orderStatus: "draft" | "sent_to_kitchen" | "to_cook" | "preparing" | "completed" | "paid" | "cancelled"
}

function isMissingRpcError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const message = error.message?.toLowerCase() ?? ""
  return (
    error.code === "PGRST202" ||
    (message.includes("function") &&
      (message.includes("not found") ||
        message.includes("does not exist") ||
        message.includes("could not find")))
  )
}

export async function createOrderWithKitchenTicket(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  if (input.lines.length === 0) {
    throw new Error("Cart is empty. Add items before sending to Brew Bar.")
  }
  if (!input.cafeId) {
    throw new Error("No cafe session found. Please log in again.")
  }
  if (!input.employeeId && !input.customerId) {
    throw new Error("Order must be linked to an employee or customer.")
  }
  if (input.source === "pos" && !input.employeeId) {
    throw new Error("Employee session is required to create a POS order.")
  }
  if (input.source === "self_order" && !input.customerId) {
    throw new Error("Customer session is required to place an order.")
  }
  if (input.source === "self_order" && !input.tableId) {
    throw new Error("Table is required to place a self-order.")
  }

  const supabase = createClient()
  const { data, error } = await supabase.rpc("create_order_with_kitchen_ticket", {
    p_cafe_id: input.cafeId,
    p_table_id: input.tableId,
    p_customer_id: input.customerId,
    p_employee_id: input.employeeId,
    p_session_id: input.sessionId ?? null,
    p_coupon_code: input.coupon?.code ?? null,
    p_notes: input.notes ?? null,
    p_source: input.source,
    p_items: input.lines.map((line) => ({
      product_id: line.productId,
      quantity: line.quantity,
      notes: line.notes ?? null,
    })),
  })

  if (error) {
    if (isMissingRpcError(error)) {
      throw new Error("Order processing function is not configured.")
    }
    throw new Error(error.message)
  }

  if (process.env.NODE_ENV === "development") {
    console.log("Raw create order RPC response:", data)
  }

  const row = (Array.isArray(data) ? data[0] : data) as CreateOrderRpcRow | undefined

  if (!row?.order_id) {
    if (process.env.NODE_ENV === "development") {
      console.error("Invalid create order RPC response:", data)
    }
    throw new Error("Order was created but no order ID was returned.")
  }

  return {
    orderId: row.order_id,
    orderNumber: row.order_number,
    ticketId: row.ticket_id,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    taxTotal: Number(row.tax_total),
    total: Number(row.total),
  }
}

export async function createPaymentForOrder(
  input: CreatePaymentInput
): Promise<CreatePaymentResult> {
  if (input.amount <= 0) {
    throw new Error("Payment amount must be greater than zero.")
  }
  if (input.method === "card" && !input.reference?.trim()) {
    throw new Error("Card payment requires a transaction reference number.")
  }
  if (input.method === "upi" && !input.reference?.trim()) {
    throw new Error("UPI payment requires a transaction reference number.")
  }
  if (input.method === "split") {
    throw new Error("Split payments must be saved as cash, card, or UPI payment rows.")
  }

  const supabase = createClient()

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, cafe_id, table_id, status, total")
    .eq("id", input.orderId)
    .eq("cafe_id", input.cafeId)
    .single()

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Order not found.")
  }
  if (order.status === "paid") {
    throw new Error("Order is already paid.")
  }
  if (order.status === "cancelled") {
    throw new Error("Cancelled orders cannot be paid.")
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      cafe_id: input.cafeId,
      order_id: input.orderId,
      method: input.method,
      amount: input.amount,
      reference: input.reference?.trim() || null,
      status: "completed",
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (paymentError || !payment) {
    throw new Error(paymentError?.message ?? "Failed to save payment.")
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount")
    .eq("order_id", input.orderId)
    .eq("cafe_id", input.cafeId)
    .eq("status", "completed")

  if (paymentsError) throw new Error(paymentsError.message)

  const paidTotal = (payments ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
  const orderTotal = Number(order.total)
  const remaining = Math.max(orderTotal - paidTotal, 0)
  const fullyPaid = paidTotal + 0.001 >= orderTotal
  let orderStatus: CreatePaymentResult["orderStatus"] = order.status as CreatePaymentResult["orderStatus"]

  if (fullyPaid) {
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", input.orderId)
      .eq("cafe_id", input.cafeId)

    if (updateOrderError) throw new Error(updateOrderError.message)
    orderStatus = "paid"

    if (order.table_id) {
      const { error: tableError } = await supabase
        .from("cafe_tables")
        .update({ status: "available" })
        .eq("id", order.table_id)
        .eq("cafe_id", input.cafeId)

      if (tableError) throw new Error(tableError.message)
    }

    // Auto-deduct inventory stock for this order (fire-and-forget)
    import("@/lib/services/inventory.service").then(({ deductStockForOrder }) => {
      deductStockForOrder(input.orderId).catch((err) =>
        console.error("Auto-deduction failed for order", input.orderId, err)
      )
    })
  }

  return {
    paymentId: payment.id,
    orderId: input.orderId,
    amountPaid: input.amount,
    totalPaid: paidTotal,
    orderTotal,
    remaining,
    fullyPaid,
    orderStatus,
  }
}

export async function cancelOrderAndReleaseTable(input: {
  cafeId: string
  orderId: string
}): Promise<void> {
  const supabase = createClient()

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, table_id, status")
    .eq("id", input.orderId)
    .eq("cafe_id", input.cafeId)
    .single()

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Order not found.")
  }
  if (order.status === "paid") {
    throw new Error("Paid orders cannot be cancelled.")
  }

  const { error: cancelError } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", input.orderId)
    .eq("cafe_id", input.cafeId)

  if (cancelError) throw new Error(cancelError.message)

  if (order.table_id) {
    const { error: tableError } = await supabase
      .from("cafe_tables")
      .update({ status: "available" })
      .eq("id", order.table_id)
      .eq("cafe_id", input.cafeId)

    if (tableError) throw new Error(tableError.message)
  }
}
