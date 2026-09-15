import crypto from "crypto"
import { serverEnv } from "@/lib/config/env"

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1"

export interface RazorpayCreateOrderInput {
  amountPaise: number
  currency?: string
  receipt?: string
}

export interface RazorpayCreatedOrder {
  id: string
  amount: number
  amountPaid: number
  amountDue: number
  currency: string
  receipt: string
  status: string
}

export class GatewayConfigurationError extends Error {
  name = "GatewayConfigurationError"
}

export class GatewayApiError extends Error {
  name = "GatewayApiError"
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message)
  }
}

export function getRazorpayServerConfig(): { keyId: string; keySecret: string } {
  const keyId = serverEnv.razorpayKeyId
  const keySecret = serverEnv.razorpayKeySecret
  if (!keyId || !keySecret) {
    throw new GatewayConfigurationError("Razorpay is not configured on the server.")
  }
  return { keyId, keySecret }
}

export async function createRazorpayOrder(
  input: RazorpayCreateOrderInput
): Promise<RazorpayCreatedOrder> {
  if (input.amountPaise <= 0 || !Number.isSafeInteger(input.amountPaise)) {
    throw new GatewayApiError("Order amount must be a positive integer in paise.")
  }

  const { keyId, keySecret } = getRazorpayServerConfig()
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64")

  let response: Response
  try {
    response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency ?? "INR",
        receipt: input.receipt,
      }),
    })
  } catch {
    throw new GatewayApiError("Unable to reach the payment gateway.")
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null

  if (!response.ok) {
    throw new GatewayApiError(sanitizeGatewayMessage(extractGatewayMessage(body)), response.status)
  }

  if (!body || typeof body.id !== "string" || typeof body.amount !== "number") {
    throw new GatewayApiError("Payment gateway returned an invalid order.")
  }

  return {
    id: body.id,
    amount: Number(body.amount),
    amountPaid: Number(body.amount_paid ?? 0),
    amountDue: Number(body.amount_due ?? body.amount),
    currency: typeof body.currency === "string" ? body.currency : "INR",
    receipt: typeof body.receipt === "string" ? body.receipt : "",
    status: typeof body.status === "string" ? body.status : "created",
  }
}

export interface RazorpayFetchedOrder {
  id: string
  amount: number
  currency: string
  receipt: string | null
  status: string
}

export interface RazorpayFetchedPayment {
  id: string
  orderId: string | null
  amount: number
  currency: string
  status: string
}

export async function fetchRazorpayOrder(orderId: string): Promise<RazorpayFetchedOrder> {
  const { keyId, keySecret } = getRazorpayServerConfig()
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64")

  let response: Response
  try {
    response = await fetch(`${RAZORPAY_API_BASE}/orders/${orderId}`, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    })
  } catch {
    throw new GatewayApiError("Unable to reach the payment gateway.")
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null

  if (!response.ok || !body) {
    throw new GatewayApiError("Unable to retrieve the payment order from the gateway.")
  }

  if (typeof body.id !== "string" || typeof body.amount !== "number") {
    throw new GatewayApiError("Payment gateway returned an invalid order.")
  }

  return {
    id: body.id,
    amount: Number(body.amount),
    currency: typeof body.currency === "string" ? body.currency : "INR",
    receipt: typeof body.receipt === "string" ? body.receipt : null,
    status: typeof body.status === "string" ? body.status : "unknown",
  }
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayFetchedPayment> {
  const { keyId, keySecret } = getRazorpayServerConfig()
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64")

  let response: Response
  try {
    response = await fetch(`${RAZORPAY_API_BASE}/payments/${paymentId}`, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    })
  } catch {
    throw new GatewayApiError("Unable to reach the payment gateway.")
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null

  if (!response.ok || !body) {
    throw new GatewayApiError("Unable to retrieve the payment from the gateway.")
  }

  if (typeof body.id !== "string" || typeof body.amount !== "number") {
    throw new GatewayApiError("Payment gateway returned an invalid payment.")
  }

  return {
    id: body.id,
    orderId: typeof body.order_id === "string" ? body.order_id : null,
    amount: Number(body.amount),
    currency: typeof body.currency === "string" ? body.currency : "INR",
    status: typeof body.status === "string" ? body.status : "unknown",
  }
}

/**
 * Verify a Razorpay Checkout success signature.
 *
 * Contract: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)
 * Compared using a timing-safe comparison.
 */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  keySecret: string
): boolean {
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`
  const expected = crypto.createHmac("sha256", keySecret).update(payload).digest("hex")

  if (expected.length !== razorpaySignature.length) {
    return false
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature))
}

function extractGatewayMessage(body: Record<string, unknown> | null): string {
  const error = body?.error as Record<string, unknown> | undefined
  const description = error?.description ?? body?.error_description
  return typeof description === "string" && description.trim() ? description : "Payment gateway error."
}

function sanitizeGatewayMessage(message: string): string {
  const withoutSecrets = message.replace(/rzp_[A-Za-z0-9]+/g, "[gateway]")
  return withoutSecrets.slice(0, 200)
}