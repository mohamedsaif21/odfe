import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

type DbClient = SupabaseClient<Database>

export type KitchenTicketRealtimeHandlers = {
  onTicketChange: () => void
}

/**
 * Brew Bar realtime foundation.
 * TODO: Wire this to a typed payload parser and update Zustand store directly.
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
    .subscribe()
}

export function unsubscribeKitchenTickets(channel: RealtimeChannel) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  channel.unsubscribe()
}
