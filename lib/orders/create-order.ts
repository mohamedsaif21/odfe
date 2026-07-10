"use client"

/**
 * createOrderWithKitchenTicket — inserts orders → order_items → kitchen_tickets → kitchen_ticket_items
 * createPaymentForOrder         — inserts payments, updates orders.status=paid, clears table
 *
 * Column names match types/database.ts exactly. No Prisma. No raw SQL.
 * Each helper creates its own typed Supabase client to avoid generic loss.
 */

import { createClient } from "@/lib/supabase/client"
import type { CartLine, CartTotals, AppliedCoupon } from "@/types/app"
import type { PaymentMethodType } from "@/types/database"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  cafeId: string
  employeeId: string | null
  tableId: string | null
  tableLabel: string | null
  customerId: string | null
  lines: CartLine[]
  totals: CartTotals
  coupon: AppliedCoupon | null
}

export interface CreateOrderResult {
  orderId: string
  orderNumber: string
  kitchenTicketId: string
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5)
  const rnd = Math.random().toString(36).toUpperCase().slice(2, 5)
  return `ORD-${ts}${rnd}`
}

// ─── Step 1: orders ───────────────────────────────────────────────────────────

export async function safeInsertOrder(input: CreateOrderInput): Promise<{ id: string; order_number: string }> {
  const supabase = createClient()
  const orderNumber = generateOrderNumber()

  const payload = {
    cafe_id:        input.cafeId,
    order_number:   orderNumber,
    status:         "sent_to_kitchen" as const,
    employee_id:    input.employeeId,
    table_id:       input.tableId,
    customer_id:    input.customerId,
    subtotal:       input.totals.subtotal,
    discount_total: input.totals.discountTotal,
    tax_total:      input.totals.taxTotal,
    total:          input.totals.total,
    coupon_code:    input.coupon?.code ?? null,
    notes:          null,
    session_id:     null,
  }

  console.log("Order payload", payload)

  const { data, error } = await (supabase.from("orders") as any)
    .insert(payload)
    .select("id, order_number")
    .single()

  if (error) {
    console.error("Order error", error)
    throw new Error(error.message)
  }

  return data
}

// ─── Step 2: order_items ──────────────────────────────────────────────────────

export async function safeInsertOrderItems(orderId: string, cafeId: string, lines: CartLine[]): Promise<void> {
  const supabase = createClient()

  const payload = lines.map((line) => ({
    cafe_id:      cafeId,
    order_id:     orderId,
    product_id:   line.productId,
    product_name: line.productName,
    unit_price:   line.unitPrice,
    quantity:     line.quantity,
    discount:     line.discount,
    tax_rate:     line.taxRate,
    line_total:   line.unitPrice * line.quantity,
    notes:        line.notes,
  }))

  console.log("Order items payload", payload)

  const { error } = await (supabase.from("order_items") as any).insert(payload)

  if (error) {
    console.error("Order items error", error)
    throw new Error(error.message)
  }
}

// ─── Step 3: kitchen_tickets ──────────────────────────────────────────────────

export async function safeInsertKitchenTicket(
  orderId: string,
  orderNumber: string,
  cafeId: string,
  tableLabel: string | null
): Promise<{ id: string }> {
  const supabase = createClient()

  const payload = {
    cafe_id:      cafeId,
    order_id:     orderId,
    order_number: orderNumber,
    table_label:  tableLabel,
    stage:        "to_cook" as const,
    priority:     1,
  }

  console.log("Kitchen ticket payload", payload)

  const { data, error } = await (supabase.from("kitchen_tickets") as any)
    .insert(payload)
    .select("id")
    .single()

  if (error) {
    console.error("Kitchen ticket error", error)
    throw new Error(error.message)
  }

  return data
}

// ─── Step 4: kitchen_ticket_items ─────────────────────────────────────────────

export async function safeInsertKitchenTicketItems(
  ticketId: string,
  cafeId: string,
  lines: CartLine[]
): Promise<void> {
  const supabase = createClient()

  const payload = lines.map((line) => ({
    cafe_id:      cafeId,
    ticket_id:    ticketId,
    product_name: line.productName,
    quantity:     line.quantity,
    notes:        line.notes,
  }))

  console.log("Kitchen ticket items payload", payload)

  const { error } = await (supabase.from("kitchen_ticket_items") as any).insert(payload)

  if (error) {
    console.error("Kitchen ticket items error", error)
    throw new Error(error.message)
  }
}

// ─── Main: createOrderWithKitchenTicket ───────────────────────────────────────

export async function createOrderWithKitchenTicket(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  if (input.lines.length === 0) {
    throw new Error("Cart is empty. Add items before sending to Brew Bar.")
  }
  if (!input.cafeId) {
    throw new Error("No cafe session found. Please log in again.")
  }

  const order   = await safeInsertOrder(input)
  await safeInsertOrderItems(order.id, input.cafeId, input.lines)
  const ticket  = await safeInsertKitchenTicket(order.id, order.order_number, input.cafeId, input.tableLabel)
  await safeInsertKitchenTicketItems(ticket.id, input.cafeId, input.lines)

  return { orderId: order.id, orderNumber: order.order_number, kitchenTicketId: ticket.id }
}

// ─── createPaymentForOrder ────────────────────────────────────────────────────

export async function createPaymentForOrder(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  if (input.method === "card" && !input.reference?.trim()) {
    throw new Error("Card payment requires a transaction reference number.")
  }

  const supabase = createClient()

  const paymentPayload = {
    cafe_id:   input.cafeId,
    order_id:  input.orderId,
    method:    input.method,
    amount:    input.amount,
    reference: input.reference ?? null,
    status:    "completed" as const,
    paid_at:   new Date().toISOString(),
  }

  console.log("Payment payload", paymentPayload)

  const { data: payment, error: paymentError } = await (supabase.from("payments") as any)
    .insert(paymentPayload)
    .select("id")
    .single()

  if (paymentError) {
    console.error("Payment error", paymentError)
    throw new Error(paymentError.message)
  }

  const { error: orderUpdateError } = await (supabase.from("orders") as any)
    .update({ status: "paid" })
    .eq("id", input.orderId)

  if (orderUpdateError) {
    console.error("Order status update error", orderUpdateError)
    throw new Error(orderUpdateError.message)
  }

  if (input.tableId) {
    const { error: tableError } = await (supabase.from("cafe_tables") as any)
      .update({ status: "available" })
      .eq("id", input.tableId)
    if (tableError) {
      // Non-fatal: log but don't block payment success
      console.error("Table status update error", tableError)
    }
  }

  return { paymentId: payment.id }
}