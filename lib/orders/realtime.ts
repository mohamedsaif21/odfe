import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"
import type { KitchenTicketWithItems } from "@/types/app"

type DbClient = SupabaseClient<Database>
type TicketStage = "to_cook" | "preparing" | "completed"
type TicketChangeCallback = () => void

export type KitchenTicketRealtimeHandlers = {
  onTicketChange: () => void
  /** Optional: observe channel connection status (SUBSCRIBED, TIMED_OUT, CHANNEL_ERROR, CLOSED). */
  onStatusChange?: (status: string) => void
}

export function subscribeToKitchenChanges(
  cafeId: string,
  onChange: TicketChangeCallback,
  onError?: (error: unknown) => void
): RealtimeChannel {
  const supabase = createClient()

  return supabase
    .channel(`brew-bar:${cafeId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "kitchen_tickets",
        filter: `cafe_id=eq.${cafeId}`,
      },
      () => onChange()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "kitchen_ticket_items",
        filter: `cafe_id=eq.${cafeId}`,
      },
      () => onChange()
    )
    .subscribe((status, error) => {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[Brew Bar Realtime]", status)
      }

      if (error) {
        // eslint-disable-next-line no-console
        console.error("[Brew Bar Realtime Error]", error)
        onError?.(error)
      }
    })
}

export function subscribeToCustomerOrder(
  orderId: string,
  onChange: () => void,
  onError?: (error: unknown) => void
): RealtimeChannel {
  const supabase = createClient()

  return supabase
    .channel(`customer-order:${orderId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      () => onChange()
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "kitchen_tickets",
        filter: `order_id=eq.${orderId}`,
      },
      () => onChange()
    )
    .subscribe((status, error) => {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[Customer Tracking Realtime]", status)
      }

      if (error) {
        // eslint-disable-next-line no-console
        console.error("[Customer Tracking Realtime Error]", error)
        onError?.(error)
      }
    })
}

/**
 * Brew Bar realtime subscription for kitchen tickets.
 * One channel, two table subscriptions (tickets + their items), both scoped to cafe_id.
 */
export function subscribeKitchenTickets(
  supabase: DbClient,
  cafeId: string,
  handlers: KitchenTicketRealtimeHandlers
): RealtimeChannel {
  return supabase
    .channel(`kitchen-tickets-${cafeId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "kitchen_tickets",
        filter: `cafe_id=eq.${cafeId}`,
      },
      () => {
        handlers.onTicketChange()
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "kitchen_ticket_items",
        filter: `cafe_id=eq.${cafeId}`,
      },
      () => {
        handlers.onTicketChange()
      }
    )
    .subscribe((status) => {
      handlers.onStatusChange?.(status)
    })
}

/**
 * Fully releases the channel (not just marks it unsubscribed) so a remount —
 * React strict-mode double-invoke, Next.js fast refresh, or navigating away
 * and back — doesn't leave a stale socket alongside a new one.
 */
export function unsubscribeKitchenTickets(supabase: DbClient, channel: RealtimeChannel) {
  supabase.removeChannel(channel)
}

/**
 * Fetch all kitchen tickets with their items for the given cafe.
 * elapsedSeconds is computed here from created_at as of fetch time; the Brew Bar
 * page re-derives a live-ticking value from ticket.createdAt on top of this so
 * the timer keeps moving between realtime refreshes rather than freezing.
 */
export async function fetchKitchenTickets(
  supabase: DbClient,
  cafeId: string
): Promise<KitchenTicketWithItems[]> {
  const { data: tickets, error } = await (supabase
    .from("kitchen_tickets") as any)
    .select("*, kitchen_ticket_items(*)")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)

  type RawTicket = {
    id: string
    order_id: string
    order_number: string
    table_label: string | null
    stage: string
    priority: number
    created_at: string
    kitchen_ticket_items: Array<{
      product_name: string
      quantity: number
      notes: string | null
    }>
  }

  return ((tickets ?? []) as RawTicket[]).map((t) => ({
    id: t.id,
    orderId: t.order_id,
    orderNumber: t.order_number,
    tableLabel: t.table_label,
    stage: t.stage as KitchenTicketWithItems["stage"],
    priority: t.priority,
    createdAt: t.created_at,
    items: (t.kitchen_ticket_items ?? []).map((i) => ({
      productName: i.product_name,
      quantity: i.quantity,
      notes: i.notes,
    })),
    elapsedSeconds: Math.max(0, Math.floor((Date.now() - new Date(t.created_at).getTime()) / 1000)),
  }))
}

/**
 * Advances a kitchen ticket's stage AND writes the same value into orders.status,
 * since orders.status shares the literal "to_cook" | "preparing" | "completed"
 * values with kitchen_tickets.stage. This isn't a real transaction — two
 * sequential updates — so if the orders write fails after the ticket write
 * succeeds, we roll the ticket back to previousStage rather than leaving the
 * ticket and its order disagreeing about where the order actually is.
 */
export async function updateTicketStage(
  supabase: DbClient,
  ticketId: string,
  orderId: string,
  stage: TicketStage,
  previousStage: TicketStage
): Promise<void> {
  const { error: ticketError } = await (supabase.from("kitchen_tickets") as any)
    .update({ stage })
    .eq("id", ticketId)

  if (ticketError) throw new Error(ticketError.message)

  const { error: orderError } = await (supabase.from("orders") as any)
    .update({ status: stage })
    .eq("id", orderId)

  if (orderError) {
    await (supabase.from("kitchen_tickets") as any).update({ stage: previousStage }).eq("id", ticketId)
    throw new Error(orderError.message)
  }
}
