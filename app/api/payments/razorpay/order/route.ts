import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import { env, serverEnv } from "@/lib/config/env"
import {
  GatewayApiError,
  GatewayConfigurationError,
  createRazorpayOrder,
} from "@/lib/services/payment-gateway.service"

const bodySchema = z.object({
  orderId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse("Authentication required", 401)
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, cafe_id, role, is_active")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return errorResponse("Customer profile not found", 403)
    }

    if (!profile.is_active) {
      return errorResponse("Account is inactive", 403)
    }

    if (profile.role !== "customer") {
      return errorResponse("Customer account required", 403)
    }

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("Invalid order ID", 400, { issues: parsed.error.issues })
    }

    const orderId = parsed.data.orderId

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("profile_id", user.id)
      .eq("cafe_id", profile.cafe_id)
      .single()

    if (customerError || !customer) {
      return errorResponse("Customer record not found", 403)
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, cafe_id, customer_id, status, total, order_number")
      .eq("id", orderId)
      .eq("customer_id", customer.id)
      .eq("cafe_id", profile.cafe_id)
      .single()

    if (orderError || !order) {
      return errorResponse("Order not found", 404)
    }

    if (order.cafe_id !== profile.cafe_id || order.customer_id !== customer.id) {
      return errorResponse("Order not found", 404)
    }

    if (order.status === "cancelled") {
      return errorResponse("Cancelled orders cannot be paid", 400)
    }

    if (order.status === "paid") {
      return errorResponse("Order is already paid", 400)
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("amount")
      .eq("order_id", order.id)
      .eq("cafe_id", profile.cafe_id)
      .eq("status", "completed")

    if (paymentsError) {
      return errorResponse("Unable to determine the outstanding balance", 500)
    }

    const paidTotal = (payments ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
    const remaining = Number(order.total) - paidTotal

    if (remaining <= 0) {
      return errorResponse("This order has no outstanding balance", 400)
    }

    const razorpayOrder = await createRazorpayOrder({
      amountPaise: Math.round(remaining * 100),
      receipt: `odf-${order.order_number}`,
    })

    return successResponse({
      order_id: razorpayOrder.id,
      amount: remaining,
      currency: razorpayOrder.currency,
      key_id: env.razorpayKeyId || serverEnv.razorpayKeyId,
    })
  } catch (err) {
    if (err instanceof GatewayConfigurationError) {
      return errorResponse("Payment gateway is not configured", 503)
    }

    if (err instanceof GatewayApiError) {
      return errorResponse(err.message, 502)
    }

    return errorResponse("An unexpected error occurred", 500)
  }
}