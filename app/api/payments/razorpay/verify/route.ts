import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
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
      return errorResponse("Invalid payment verification data", 400)
    }

    const supabase = await createClient()
    const verification = await verifyCustomerRazorpayPayment(supabase, parsed.data)

    return successResponse({
      verified: true,
      orderId: verification.orderId,
      razorpayOrderId: verification.razorpayOrderId,
      razorpayPaymentId: verification.razorpayPaymentId,
      amount: verification.amount,
      currency: verification.currency,
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