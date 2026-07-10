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

// ─── Main: createOrderWithKitchenTicket ───────────────────────────────────────

/**
 * Creates an order and kitchen ticket using the Supabase RPC.
 *
 * Expected Supabase function:
 *   create_order_with_kitchen_ticket(
 *     p_cafe_id UUID,
 *     p_employee_id UUID,
 *     p_customer_id UUID,
 *     p_table_id UUID,
 *     p_table_label TEXT,
 *     p_session_id UUID,
 *     p_lines JSONB,
 *     p_subtotal NUMERIC,
 *     p_discount_total NUMERIC,
 *     p_tax_total NUMERIC,
 *     p_total NUMERIC,
 *     p_coupon_code TEXT,
 *     p_notes TEXT
 *   ) RETURNS JSON { order_id, order_number, kitchen_ticket_id }
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

  const supabase = createClient()

  const { data, error } = await (supabase.rpc as any)("create_order_with_kitchen_ticket", {
    p_cafe_id: input.cafeId,
    p_employee_id: input.employeeId,
    p_customer_id: input.customerId,
    p_table_id: input.tableId,
    p_table_label: input.tableLabel,
    p_session_id: input.sessionId ?? null,
    p_lines: input.lines.map((l) => ({
      product_id: l.productId,
      product_name: l.productName,
      unit_price: l.unitPrice,
      quantity: l.quantity,
      tax_rate: l.taxRate,
      discount: l.discount,
      line_total: l.unitPrice * l.quantity,
      notes: l.notes,
    })),
    p_subtotal: input.totals.subtotal,
    p_discount_total: input.totals.discountTotal,
    p_tax_total: input.totals.taxTotal,
    p_total: input.totals.total,
    p_coupon_code: input.coupon?.code ?? null,
    p_notes: input.notes ?? null,
  })

  if (error) {
    if (error.message?.includes("function") && error.message?.includes("not found")) {
      throw new Error(
        "The order creation database function is not available. Apply the Supabase SQL migration first."
      )
    }
    throw new Error(error.message)
  }

  const result = data as unknown as CreateOrderResult

  return {
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    kitchenTicketId: result.kitchenTicketId,
  }
}

// ─── createPaymentForOrder ────────────────────────────────────────────────────

export async function createPaymentForOrder(
  input: CreatePaymentInput
): Promise<CreatePaymentResult> {
  if (input.method === "card" && !input.reference?.trim()) {
    throw new Error("Card payment requires a transaction reference number.")
  }

  const supabase = createClient()

  const { data, error } = await (supabase.rpc as any)("create_payment_for_order", {
    p_cafe_id: input.cafeId,
    p_order_id: input.orderId,
    p_table_id: input.tableId,
    p_method: input.method,
    p_amount: input.amount,
    p_reference: input.reference ?? null,
  })

  if (error) {
    if (error.message?.includes("function") && error.message?.includes("not found")) {
      throw new Error(
        "The payment creation database function is not available. Apply the Supabase SQL migration first."
      )
    }
    throw new Error(error.message)
  }

  const result = data as unknown as CreatePaymentResult

  return {
    paymentId: result.paymentId,
  }
}
