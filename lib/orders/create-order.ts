"use client"

import { createClient } from "@/lib/supabase/client"
import type { CartLine, CartTotals, AppliedCoupon } from "@/types/app"
import type { PaymentMethodType } from "@/types/database"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  cafeId: string
  employeeId: string | null
  customerId: string | null
  tableId: string | null
  tableLabel: string | null
  sessionId?: string | null
  lines: CartLine[]
  totals: CartTotals
  coupon: AppliedCoupon | null
  notes?: string | null
}

export interface CreateOrderResult {
  orderId: string
  orderNumber: string
  ticketId: string
}

export interface CreatePaymentInput {
  cafeId: string
  orderId: string
  tableId: string | null
  method: PaymentMethodType
  amount: number
  reference: string | null
}

export interface CreatePaymentResult {
  paymentId: string
  fullyPaid: boolean
}

function generateOrderNumber(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ORD-${datePart}-${randomPart}`
}

// ─── Main: createOrderWithKitchenTicket ───────────────────────────────────────

/**
 * Creates an order end-to-end: orders → order_items → kitchen_tickets →
 * kitchen_ticket_items, as four sequential Supabase inserts.
 *
 * There is no `create_order_with_kitchen_ticket` Postgres function in this
 * project (confirmed against types/database.ts Functions block — it's empty),
 * so this does the equivalent work as ordinary table inserts instead of an RPC.
 *
 * Because these are separate inserts rather than one transaction, a failure
 * partway through triggers compensating deletes of whatever already succeeded,
 * so a failed order never gets left half-written. This is a best-effort
 * client-side rollback, not real transactional atomicity — if you need that
 * guarantee (e.g. under concurrent load), this should move into an actual
 * Postgres function/RPC later.
 */
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

  const supabase = createClient()
  const orderNumber = generateOrderNumber()

  // 1. Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      cafe_id: input.cafeId,
      employee_id: input.employeeId,
      customer_id: input.customerId,
      table_id: input.tableId,
      session_id: input.sessionId ?? null,
      order_number: orderNumber,
      status: "sent_to_kitchen",
      subtotal: input.totals.subtotal,
      discount_total: input.totals.discountTotal,
      tax_total: input.totals.taxTotal,
      total: input.totals.total,
      coupon_code: input.coupon?.code ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Failed to create order.")
  }

  if (input.tableId) {
    await supabase
      .from("cafe_tables")
      .update({ status: "occupied" })
      .eq("id", input.tableId)
      .eq("cafe_id", input.cafeId)
  }

  // 2. Insert order_items
  const orderItemsPayload = input.lines.map((l) => ({
    cafe_id: input.cafeId,
    order_id: order.id,
    product_id: l.productId,
    product_name: l.productName,
    unit_price: l.unitPrice,
    quantity: l.quantity,
    discount: l.discount,
    tax_rate: l.taxRate,
    line_total: l.unitPrice * l.quantity,
    notes: l.notes,
  }))

  const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload)

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", order.id)
    throw new Error(itemsError.message)
  }

  // 3. Insert kitchen_ticket
  const { data: ticket, error: ticketError } = await supabase
    .from("kitchen_tickets")
    .insert({
      cafe_id: input.cafeId,
      order_id: order.id,
      order_number: order.order_number,
      table_label: input.tableLabel,
      stage: "to_cook",
      priority: 0,
    })
    .select()
    .single()

  if (ticketError || !ticket) {
    await supabase.from("order_items").delete().eq("order_id", order.id)
    await supabase.from("orders").delete().eq("id", order.id)
    throw new Error(ticketError?.message ?? "Failed to create kitchen ticket.")
  }

  // 4. Insert kitchen_ticket_items
  const ticketItemsPayload = input.lines.map((l) => ({
    cafe_id: input.cafeId,
    ticket_id: ticket.id,
    product_name: l.productName,
    quantity: l.quantity,
    notes: l.notes,
  }))

  const { error: ticketItemsError } = await supabase.from("kitchen_ticket_items").insert(ticketItemsPayload)

  if (ticketItemsError) {
    await supabase.from("kitchen_tickets").delete().eq("id", ticket.id)
    await supabase.from("order_items").delete().eq("order_id", order.id)
    await supabase.from("orders").delete().eq("id", order.id)
    throw new Error(ticketItemsError.message)
  }

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    ticketId: ticket.id,
  }
}

// ─── createPaymentForOrder ────────────────────────────────────────────────────
// Unchanged in this pass — still calls the create_payment_for_order RPC.
// Out of scope for Sprint 2 Part 1 (order creation only). This RPC's existence
// hasn't been verified the way create_order_with_kitchen_ticket was — worth the
// same grep check before Part 2/3 of this sprint touches payments.

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
    .select("id, total")
    .eq("id", input.orderId)
    .eq("cafe_id", input.cafeId)
    .single()

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Order not found.")
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
  const fullyPaid = paidTotal + 0.001 >= Number(order.total)

  if (fullyPaid) {
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", input.orderId)
      .eq("cafe_id", input.cafeId)

    if (updateOrderError) throw new Error(updateOrderError.message)

    if (input.tableId) {
      const { error: tableError } = await supabase
        .from("cafe_tables")
        .update({ status: "available" })
        .eq("id", input.tableId)
        .eq("cafe_id", input.cafeId)

      if (tableError) throw new Error(tableError.message)
    }
  }

  return {
    paymentId: payment.id,
    fullyPaid,
  }
}
