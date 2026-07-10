import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { KitchenTicketWithItems } from "@/types/app"

type DbClient = SupabaseClient<Database>

export type KitchenTicketRealtimeHandlers = {
  onTicketChange: () => void
}

/**
 * Brew Bar realtime subscription for kitchen tickets.
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
    .subscribe()
}

export function unsubscribeKitchenTickets(channel: RealtimeChannel) {
  channel.unsubscribe()
}

/**
 * Fetch all kitchen tickets with their items for the given cafe.
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
    elapsedSeconds: 0,
  }))
}

/**
 * Update a kitchen ticket's stage.
 */
export async function updateTicketStage(
  supabase: DbClient,
  ticketId: string,
  stage: "to_cook" | "preparing" | "completed"
): Promise<void> {
  const { error } = await (supabase
    .from("kitchen_tickets") as any)
    .update({ stage })
    .eq("id", ticketId)

  if (error) throw new Error(error.message)
}
