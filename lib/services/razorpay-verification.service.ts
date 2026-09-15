import type { SupabaseClient } from "@supabase/supabase-js"
import { serverEnv } from "@/lib/config/env"
import {
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  verifyRazorpaySignature,
  GatewayConfigurationError,
  GatewayApiError,
} from "./payment-gateway.service"

export class RazorpayVerificationError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = "RazorpayVerificationError"
  }
}

export interface RazorpayVerificationResult {
  verified: boolean
  orderId: string
  orderNumber: string
  razorpayOrderId: string
  razorpayPaymentId: string
  amount: number
  currency: string
  cafeId: string
  customerId: string
  remainingPaise: number
  alreadyCompleted: boolean
}

export interface VerifyCustomerRazorpayPaymentInput {
  orderId: string
  razorpayPaymentId: string
  razorpayOrderId: string
  razorpaySignature: string
}

export interface VerifyCustomerRazorpayPaymentOptions {
  allowAlreadyPaid?: boolean
}

/**
 * Shared Razorpay verification logic used by both /verify and /complete routes.
 *
 * Performs:
 * 1. User authentication + profile lookup (customer role, active, cafe)
 * 2. Customer record lookup
 * 3. Order ownership + status validation
 * 4. Remaining balance calculation
 * 5. Razorpay API verification (order receipt, currency, amount; payment linkage; HMAC)
 * 6. Already-paid idempotency check (when allowAlreadyPaid = true)
 *
 * @throws GatewayConfigurationError → 503
 * @throws GatewayApiError → 502
 * @throws RazorpayVerificationError → caller's status code
 */
export async function verifyCustomerRazorpayPayment(
  supabase: SupabaseClient,
  input: VerifyCustomerRazorpayPaymentInput,
  options: VerifyCustomerRazorpayPaymentOptions = {}
): Promise<RazorpayVerificationResult> {
  const { allowAlreadyPaid = false } = options
  const VERIFICATION_FAILED = "Payment verification failed."

  // ── 1. Auth + profile ────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new RazorpayVerificationError("Authentication required", 401)
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, cafe_id, role, is_active")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    throw new RazorpayVerificationError("Customer profile not found", 403)
  }

  if (!profile.is_active) {
    throw new RazorpayVerificationError("Account is inactive", 403)
  }

  if (profile.role !== "customer") {
    throw new RazorpayVerificationError("Customer account required", 403)
  }

  // ── 2. Customer record ───────────────────────────────────────────────────
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", user.id)
    .eq("cafe_id", profile.cafe_id)
    .single()

  if (customerError || !customer) {
    throw new RazorpayVerificationError("Customer record not found", 403)
  }

  // ── 3. Order lookup + status ─────────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, cafe_id, customer_id, status, total, order_number")
    .eq("id", input.orderId)
    .eq("customer_id", customer.id)
    .eq("cafe_id", profile.cafe_id)
    .single()

  if (orderError || !order) {
    throw new RazorpayVerificationError("Order not found", 404)
  }

  if (order.cafe_id !== profile.cafe_id || order.customer_id !== customer.id) {
    throw new RazorpayVerificationError("Order not found", 404)
  }

  if (order.status === "cancelled") {
    throw new RazorpayVerificationError("Cancelled orders cannot be paid", 400)
  }

  // ── 4. Remaining balance ─────────────────────────────────────────────────
  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount, reference")
    .eq("order_id", order.id)
    .eq("cafe_id", profile.cafe_id)
    .eq("status", "completed")

  if (paymentsError) {
    throw new RazorpayVerificationError("Unable to determine the outstanding balance", 500)
  }

  const paidTotal = (payments ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
  const remaining = Number(order.total) - paidTotal
  const expectedPaise = Math.round(remaining * 100)

  // ── 5a. Already-paid idempotency check ───────────────────────────────────
  if (order.status === "paid") {
    if (!allowAlreadyPaid) {
      throw new RazorpayVerificationError("Order is already paid", 400)
    }

    const samePayment = (payments ?? []).find(
      (row) => row.reference === input.razorpayPaymentId
    )

    if (samePayment) {
      return {
        verified: true,
        orderId: order.id,
        orderNumber: order.order_number,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        amount: Number(samePayment.amount),
        currency: "INR",
        cafeId: profile.cafe_id,
        customerId: customer.id,
        remainingPaise: 0,
        alreadyCompleted: true,
      }
    }

    throw new RazorpayVerificationError("Order is already paid", 400)
  }

  if (remaining <= 0) {
    throw new RazorpayVerificationError("This order has no outstanding balance", 400)
  }

  // ── 5b. Razorpay API verification ────────────────────────────────────────
  const keySecret = serverEnv.razorpayKeySecret
  if (!keySecret) {
    throw new GatewayConfigurationError("Payment gateway is not configured")
  }

  const razorpayOrder = await fetchRazorpayOrder(input.razorpayOrderId)

  if (razorpayOrder.receipt !== `odf-${order.order_number}`) {
    throw new RazorpayVerificationError(VERIFICATION_FAILED, 400)
  }

  if (razorpayOrder.currency !== "INR") {
    throw new RazorpayVerificationError(VERIFICATION_FAILED, 400)
  }

  if (razorpayOrder.amount !== expectedPaise) {
    throw new RazorpayVerificationError(VERIFICATION_FAILED, 400)
  }

  const razorpayPayment = await fetchRazorpayPayment(input.razorpayPaymentId)

  if (razorpayPayment.orderId !== input.razorpayOrderId) {
    throw new RazorpayVerificationError(VERIFICATION_FAILED, 400)
  }

  if (razorpayPayment.currency !== "INR") {
    throw new RazorpayVerificationError(VERIFICATION_FAILED, 400)
  }

  if (razorpayPayment.amount !== razorpayOrder.amount) {
    throw new RazorpayVerificationError(VERIFICATION_FAILED, 400)
  }

  const signatureValid = verifyRazorpaySignature(
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.razorpaySignature,
    keySecret
  )

  if (!signatureValid) {
    throw new RazorpayVerificationError(VERIFICATION_FAILED, 400)
  }

  return {
    verified: true,
    orderId: order.id,
    orderNumber: order.order_number,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    amount: remaining,
    currency: "INR",
    cafeId: profile.cafe_id,
    customerId: customer.id,
    remainingPaise: expectedPaise,
    alreadyCompleted: false,
  }
}
