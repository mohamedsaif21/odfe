import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import {
  GatewayApiError,
  GatewayConfigurationError,
} from "@/lib/services/payment-gateway.service"
import {
  RazorpayVerificationError,
  verifyCustomerRazorpayPayment,
} from "@/lib/services/razorpay-verification.service"

const bodySchema = z.object({
  orderId: z.string().uuid(),
  razorpayPaymentId: z.string().trim().min(1).max(255),
  razorpayOrderId: z.string().trim().min(1).max(255),
  razorpaySignature: z.string().trim().min(1).max(512),
})

const VERIFICATION_FAILED = "Payment verification failed."

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("Invalid payment completion data", 400)
    }

    const supabase = await createClient()

    const verification = await verifyCustomerRazorpayPayment(supabase, parsed.data, {
      allowAlreadyPaid: true,
    })

    if (verification.alreadyCompleted) {
      return successResponse({
        completed: true,
        alreadyCompleted: true,
        orderId: verification.orderId,
        razorpayPaymentId: verification.razorpayPaymentId,
        amount: verification.amount,
        currency: verification.currency,
      })
    }

    // Server-only verification ticket (service_role bypasses RLS; customers
    // cannot insert tickets, so the RPC cannot be abused via direct calls).
    const admin = await createAdminClient()
    const { error: ticketError } = await admin
      .from("razorpay_payment_verifications")
      .upsert(
        {
          razorpay_payment_id: verification.razorpayPaymentId,
          razorpay_order_id: verification.razorpayOrderId,
          order_id: verification.orderId,
          cafe_id: verification.cafeId,
          customer_id: verification.customerId,
          amount_paise: verification.remainingPaise,
          currency: verification.currency,
        },
        { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
      )

    if (ticketError) {
      return errorResponse("Unable to record the verified payment", 500)
    }

    // Atomically complete the payment (identity derived from the caller's JWT).
    const { data: rows, error: rpcError } = await supabase.rpc(
      "complete_customer_razorpay_payment",
      {
        p_order_id: verification.orderId,
        p_razorpay_payment_id: verification.razorpayPaymentId,
      }
    )

    if (rpcError) {
      return errorResponse("The payment could not be completed. Please try again.", 409)
    }

    const row = Array.isArray(rows) ? rows[0] : rows
    if (!row) {
      return errorResponse("The payment could not be completed. Please try again.", 409)
    }

    return successResponse({
      completed: true,
      alreadyCompleted: false,
      orderId: row.order_id,
      orderNumber: row.order_number,
      paymentId: row.payment_id,
      razorpayPaymentId: verification.razorpayPaymentId,
      amount: Number(row.amount),
      currency: verification.currency,
      fullyPaid: row.fully_paid,
    })
  } catch (err) {
    if (err instanceof GatewayConfigurationError) {
      return errorResponse("Payment gateway is not configured", 503)
    }

    if (err instanceof GatewayApiError) {
      return errorResponse(VERIFICATION_FAILED, 502)
    }

    if (err instanceof RazorpayVerificationError) {
      return errorResponse(err.message, err.status)
    }

    return errorResponse("An unexpected error occurred", 500)
  }
}