import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { serverEnv } from "@/lib/config/env"
import { createAdminClient } from "@/lib/supabase/server"
import type { Database, Json } from "@/types/database"
import {
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  GatewayApiError,
  GatewayConfigurationError,
  verifyRazorpayWebhookSignature,
} from "@/lib/services/payment-gateway.service"
import type {
  RazorpayFetchedOrder,
  RazorpayFetchedPayment,
} from "@/lib/services/payment-gateway.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SUPPORTED_EVENT = "payment.captured"
const RECEIPT_PREFIX = "odf-"

type OrderRow = Database["public"]["Tables"]["orders"]["Row"]
type OdfeOrder = Pick<OrderRow, "id" | "cafe_id" | "customer_id" | "status" | "total" | "order_number">

class WebhookReconciliationError extends Error {
  name = "WebhookReconciliationError"
}

function webhookOk(): NextResponse {
  return NextResponse.json({ received: true }, { status: 200 })
}

function webhookError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

function getEventType(payload: Record<string, unknown>): string | null {
  return typeof payload.event === "string" ? payload.event : null
}

function getPaymentEntity(payload: Record<string, unknown>): Record<string, unknown> | null {
  const paymentPayload = payload.payload as Record<string, unknown> | undefined
  const payment = paymentPayload?.payment as Record<string, unknown> | undefined
  const entity = payment?.entity as Record<string, unknown> | undefined
  return entity ?? null
}

function buildAuditPayload(raw: Record<string, unknown>): Json {
  const entity = getPaymentEntity(raw)
  return {
    event: typeof raw.event === "string" ? raw.event : null,
    account_id: typeof raw.account_id === "string" ? raw.account_id : null,
    created_at: typeof raw.created_at === "number" ? raw.created_at : null,
    payment: entity
      ? {
          id: typeof entity.id === "string" ? entity.id : null,
          order_id: typeof entity.order_id === "string" ? entity.order_id : null,
          amount: typeof entity.amount === "number" ? entity.amount : null,
          currency: typeof entity.currency === "string" ? entity.currency : null,
          status: typeof entity.status === "string" ? entity.status : null,
        }
      : null,
  }
}

type EventClaim = "new" | "done" | "retry"

async function claimWebhookEvent(
  admin: SupabaseClient,
  input: {
    eventId: string
    eventType: string
    razorpayPaymentId: string | null
    razorpayOrderId: string | null
    payload: Json
  }
): Promise<EventClaim> {
  const { error } = await admin.from("razorpay_webhook_events").insert({
    razorpay_event_id: input.eventId,
    event_type: input.eventType,
    razorpay_payment_id: input.razorpayPaymentId,
    razorpay_order_id: input.razorpayOrderId,
    payload: input.payload,
    status: "received",
  })

  if (!error) return "new"

  if (error.code !== "23505") {
    console.error("[R5] Failed to record webhook event", error.message)
    throw error
  }

  const { data: existing } = await admin
    .from("razorpay_webhook_events")
    .select("status")
    .eq("razorpay_event_id", input.eventId)
    .maybeSingle()

  if (existing?.status === "processed" || existing?.status === "ignored") {
    console.log("[R5] Duplicate webhook event", input.eventId)
    return "done"
  }

  await admin
    .from("razorpay_webhook_events")
    .update({ status: "received", error_message: null })
    .eq("razorpay_event_id", input.eventId)

  return "retry"
}

async function updateEventStatus(
  admin: SupabaseClient,
  eventId: string,
  status: "processed" | "ignored" | "failed",
  options: { errorMessage?: string | null; orderId?: string | null } = {}
): Promise<void> {
  const { error } = await admin
    .from("razorpay_webhook_events")
    .update({
      status,
      error_message: options.errorMessage ?? null,
      order_id: options.orderId ?? null,
      processed_at: status === "failed" ? null : new Date().toISOString(),
    })
    .eq("razorpay_event_id", eventId)

  if (error) {
    console.error("[R5] Failed to update webhook event status", error.message)
  }
}

async function verifyAuthoritativePayment(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<{ razorpayOrder: RazorpayFetchedOrder; razorpayPayment: RazorpayFetchedPayment }> {
  const [razorpayOrder, razorpayPayment] = await Promise.all([
    fetchRazorpayOrder(razorpayOrderId),
    fetchRazorpayPayment(razorpayPaymentId),
  ])

  if (razorpayPayment.orderId !== razorpayOrder.id) {
    throw new WebhookReconciliationError("Payment does not belong to the Razorpay order")
  }

  if (razorpayPayment.status !== "captured") {
    throw new WebhookReconciliationError("Payment has not been captured")
  }

  if (razorpayPayment.amount !== razorpayOrder.amount) {
    throw new WebhookReconciliationError("Payment amount does not match the Razorpay order")
  }

  if (razorpayPayment.currency !== "INR" || razorpayOrder.currency !== "INR") {
    throw new WebhookReconciliationError("Payment currency is not supported")
  }

  return { razorpayOrder, razorpayPayment }
}

function parseReceiptOrderNumber(receipt: string | null): string | null {
  if (!receipt || !receipt.startsWith(RECEIPT_PREFIX)) return null
  const orderNumber = receipt.slice(RECEIPT_PREFIX.length)
  return orderNumber || null
}

async function findOrderByReceipt(
  admin: SupabaseClient,
  razorpayOrder: RazorpayFetchedOrder
): Promise<OdfeOrder | null> {
  const orderNumber = parseReceiptOrderNumber(razorpayOrder.receipt)
  if (!orderNumber) return null

  const { data: orders, error } = await admin
    .from("orders")
    .select("id, cafe_id, customer_id, status, total, order_number")
    .eq("order_number", orderNumber)

  if (error) {
    console.error("[R5] Order lookup failed", error.message)
    throw new Error("Order lookup failed")
  }

  return orders?.length === 1 ? orders[0] : null
}

async function resolveOdfeOrder(
  admin: SupabaseClient,
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpayOrder: RazorpayFetchedOrder
): Promise<OdfeOrder | null> {
  const { data: ticket } = await admin
    .from("razorpay_payment_verifications")
    .select("order_id, razorpay_order_id")
    .eq("razorpay_payment_id", razorpayPaymentId)
    .maybeSingle()

  if (ticket) {
    if (ticket.razorpay_order_id !== razorpayOrderId) return null

    const { data: order, error } = await admin
      .from("orders")
      .select("id, cafe_id, customer_id, status, total, order_number")
      .eq("id", ticket.order_id)
      .maybeSingle()

    if (error) {
      console.error("[R5] Order lookup failed", error.message)
      throw new Error("Order lookup failed")
    }

    return order ?? null
  }

  return findOrderByReceipt(admin, razorpayOrder)
}

async function getRemainingPaise(admin: SupabaseClient, order: OdfeOrder): Promise<number> {
  const { data: payments, error } = await admin
    .from("payments")
    .select("amount")
    .eq("order_id", order.id)
    .eq("cafe_id", order.cafe_id)
    .eq("status", "completed")

  if (error) {
    console.error("[R5] Balance lookup failed", error.message)
    throw new Error("Unable to determine the outstanding balance")
  }

  const paidTotal = (payments ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
  return Math.max(0, Math.round((Number(order.total) - paidTotal) * 100))
}

async function processCapturedPayment(
  admin: SupabaseClient,
  input: {
    razorpayPaymentId: string | null
    razorpayOrderId: string | null
  }
): Promise<{ orderId: string }> {
  if (!input.razorpayPaymentId || !input.razorpayOrderId) {
    throw new WebhookReconciliationError("Webhook payload is missing payment fields")
  }

  const { razorpayOrder, razorpayPayment } = await verifyAuthoritativePayment(
    input.razorpayOrderId,
    input.razorpayPaymentId
  )

  const order = await resolveOdfeOrder(
    admin,
    input.razorpayPaymentId,
    input.razorpayOrderId,
    razorpayOrder
  )

  if (!order) {
    throw new WebhookReconciliationError("Razorpay order could not be mapped to an ODFE order")
  }

  if (razorpayOrder.receipt !== `${RECEIPT_PREFIX}${order.order_number}`) {
    throw new WebhookReconciliationError("Razorpay order receipt does not match the ODFE order")
  }

  if (order.status === "cancelled") {
    throw new WebhookReconciliationError("Order is cancelled")
  }

  if (!order.customer_id) {
    throw new WebhookReconciliationError("Order has no linked customer")
  }

  const remainingPaise = await getRemainingPaise(admin, order)
  const amountPaise = remainingPaise > 0 ? remainingPaise : razorpayOrder.amount

  const { error: ticketError } = await admin
    .from("razorpay_payment_verifications")
    .upsert(
      {
        razorpay_payment_id: input.razorpayPaymentId,
        razorpay_order_id: input.razorpayOrderId,
        order_id: order.id,
        cafe_id: order.cafe_id,
        customer_id: order.customer_id,
        amount_paise: amountPaise,
        currency: "INR",
      },
      { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
    )

  if (ticketError) {
    console.error("[R5] Failed to create verification ticket", ticketError.message)
    throw new Error("Verification ticket could not be created")
  }

  const { data: rows, error: rpcError } = await admin.rpc(
    "complete_razorpay_webhook_payment",
    {
      p_order_id: order.id,
      p_razorpay_payment_id: input.razorpayPaymentId,
    }
  )

  if (rpcError) {
    console.error("[R5] Completion RPC failed", rpcError.message)
    throw new WebhookReconciliationError("Payment completion was rejected")
  }

  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row) {
    throw new Error("Payment completion returned no result")
  }

  return { orderId: order.id }
}

async function handleWebhook(request: NextRequest): Promise<NextResponse> {
  if (!serverEnv.razorpayWebhookSecret) {
    console.error("[R5] Razorpay webhook secret is not configured")
    return webhookError("Webhook is not configured", 500)
  }

  const signature = request.headers.get("x-razorpay-signature")
  const eventId = request.headers.get("x-razorpay-event-id")

  if (!signature || !eventId) {
    return webhookError("Missing webhook headers", 400)
  }

  const rawBody = await request.text()
  if (!rawBody) {
    return webhookError("Invalid webhook payload", 400)
  }

  const signatureValid = verifyRazorpayWebhookSignature(
    rawBody,
    signature,
    serverEnv.razorpayWebhookSecret
  )

  if (!signatureValid) {
    console.warn("[R5] Webhook signature verification failed")
    return webhookError("Invalid webhook signature", 400)
  }

  console.log("[R5] Webhook signature verified")

  let payload: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(rawBody)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return webhookError("Invalid webhook payload", 400)
    }
    payload = parsed as Record<string, unknown>
  } catch {
    return webhookError("Invalid webhook payload", 400)
  }

  const eventType = getEventType(payload)
  if (!eventType) {
    return webhookError("Invalid webhook payload", 400)
  }

  const paymentEntity = getPaymentEntity(payload)
  const razorpayPaymentId = typeof paymentEntity?.id === "string" ? paymentEntity.id : null
  const razorpayOrderId = typeof paymentEntity?.order_id === "string" ? paymentEntity.order_id : null

  const admin = await createAdminClient()

  const claim = await claimWebhookEvent(admin, {
    eventId,
    eventType,
    razorpayPaymentId,
    razorpayOrderId,
    payload: buildAuditPayload(payload),
  })

  if (claim === "done") {
    return webhookOk()
  }

  if (eventType !== SUPPORTED_EVENT) {
    await updateEventStatus(admin, eventId, "ignored")
    console.log("[R5] Webhook event ignored", { event: eventType, eventId })
    return webhookOk()
  }

  console.log("[R5] Processing payment.captured", { eventId, razorpayPaymentId })

  try {
    const result = await processCapturedPayment(admin, {
      razorpayPaymentId,
      razorpayOrderId,
    })

    await updateEventStatus(admin, eventId, "processed", { orderId: result.orderId })
    console.log("[R5] Webhook payment completed", { eventId, orderId: result.orderId })
    return webhookOk()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed"
    await updateEventStatus(admin, eventId, "failed", { errorMessage: message })
    throw err
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleWebhook(request)
  } catch (err) {
    if (err instanceof WebhookReconciliationError) {
      console.warn("[R5] Webhook reconciliation failed", err.message)
      return webhookError("Webhook could not be reconciled", 400)
    }

    if (err instanceof GatewayConfigurationError) {
      return webhookError("Payment gateway is not configured", 503)
    }

    if (err instanceof GatewayApiError) {
      return webhookError("Webhook could not be verified", 502)
    }

    console.error(
      "[R5] Webhook handler error",
      err instanceof Error ? err.stack ?? err.message : String(err)
    )
    return webhookError("Internal server error", 500)
  }
}