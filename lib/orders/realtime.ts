import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"
import type { KitchenTicketWithItems } from "@/types/app"

type DbClient = SupabaseClient<Database>
type TicketStage = "to_cook" | "preparing" | "completed"
type TicketChangeCallback = () => void

export type KitchenTicketRealtimeHandlers = {
  onTicketChange: () => void
  onStatusChange?: (status: string) => void
}

function isMissingRpcError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const message = error.message?.toLowerCase() ?? ""
  return (
    error.code === "PGRST202" ||
    (message.includes("function") &&
      (message.includes("not found") ||
        message.includes("does not exist") ||
        message.includes("could not find")))
  )
}

export function formatKitchenElapsed(ticket: KitchenTicketWithItems): string {
  const endTime =
    ticket.stage === "completed"
      ? new Date(ticket.completedAt ?? ticket.updatedAt ?? ticket.createdAt).getTime()
      : Date.now()
  const startTime = ticket.createdAt ? new Date(ticket.createdAt).getTime() : endTime
  const elapsedMs = Math.max(0, endTime - startTime)
  const totalMinutes = Math.floor(elapsedMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${totalMinutes}m`
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
        console.log("[Brew Bar Realtime]", status)
      }

      if (error) {
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
        console.log("[Customer Tracking Realtime]", status)
      }

      if (error) {
        console.error("[Customer Tracking Realtime Error]", error)
        onError?.(error)
      }
    })
}

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

export function unsubscribeKitchenTickets(supabase: DbClient, channel: RealtimeChannel) {
  supabase.removeChannel(channel)
}

export async function fetchKitchenTickets(
  supabase: DbClient,
  cafeId: string
): Promise<KitchenTicketWithItems[]> {
  const activeQuery = (supabase
    .from("kitchen_tickets") as any)
    .select("*, kitchen_ticket_items(*)")
    .eq("cafe_id", cafeId)
    .in("stage", ["to_cook", "preparing"])
    .order("created_at", { ascending: true })

  const completedQuery = (supabase
    .from("kitchen_tickets") as any)
    .select("*, kitchen_ticket_items(*)")
    .eq("cafe_id", cafeId)
    .eq("stage", "completed")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(20)

  const [activeResult, completedResult] = await Promise.all([
    activeQuery,
    completedQuery,
  ])

  if (activeResult.error) throw new Error(activeResult.error.message)
  if (completedResult.error) throw new Error(completedResult.error.message)

  type RawTicket = {
    id: string
    order_id: string
    order_number: string
    table_label: string | null
    stage: string
    priority: number
    created_at: string
    updated_at: string
    preparing_at: string | null
    completed_at: string | null
    kitchen_ticket_items: Array<{
      product_name: string
      quantity: number
      notes: string | null
    }>
  }

  const tickets = [
    ...((activeResult.data ?? []) as RawTicket[]),
    ...((completedResult.data ?? []) as RawTicket[]),
  ]

  return tickets.map((t) => {
    const endTime =
      t.stage === "completed"
        ? new Date(t.completed_at ?? t.updated_at).getTime()
        : Date.now()

    return {
      id: t.id,
      orderId: t.order_id,
      orderNumber: t.order_number,
      tableLabel: t.table_label,
      stage: t.stage as KitchenTicketWithItems["stage"],
      priority: t.priority,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      preparingAt: t.preparing_at,
      completedAt: t.completed_at,
      items: (t.kitchen_ticket_items ?? []).map((i) => ({
        productName: i.product_name,
        quantity: i.quantity,
        notes: i.notes,
      })),
      elapsedSeconds: Math.max(
        0,
        Math.floor((endTime - new Date(t.created_at).getTime()) / 1000)
      ),
    }
  })
}

export async function updateTicketStage(
  supabase: DbClient,
  ticketId: string,
  orderId: string,
  stage: TicketStage,
  previousStage: TicketStage
): Promise<void> {
  const { error: rpcError } = await supabase.rpc("advance_kitchen_ticket", {
    p_ticket_id: ticketId,
    p_order_id: orderId,
    p_next_stage: stage,
    p_previous_stage: previousStage,
  })

  if (!rpcError) return
  if (!isMissingRpcError(rpcError)) {
    throw new Error(rpcError.message)
  }

  const now = new Date().toISOString()
  const ticketUpdate =
    previousStage === "to_cook" && stage === "preparing"
      ? { stage, preparing_at: now, updated_at: now }
      : previousStage === "preparing" && stage === "completed"
        ? { stage, completed_at: now, updated_at: now }
        : { stage, updated_at: now }

  const { error: ticketError } = await (supabase.from("kitchen_tickets") as any)
    .update(ticketUpdate)
    .eq("id", ticketId)
    .eq("stage", previousStage)

  if (ticketError) throw new Error(ticketError.message)

  const { error: orderError } = await (supabase.from("orders") as any)
    .update({ status: stage, updated_at: now })
    .eq("id", orderId)

  if (orderError) {
    await (supabase.from("kitchen_tickets") as any)
      .update({ stage: previousStage, updated_at: now })
      .eq("id", ticketId)
    throw new Error(orderError.message)
  }
}
