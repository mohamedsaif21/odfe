"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/store/auth-store"
import { useOrderStore } from "@/store/order-store"
import {
  fetchKitchenTickets,
  subscribeKitchenTickets,
  unsubscribeKitchenTickets,
  updateTicketStage,
} from "@/lib/orders/realtime"
import type { KitchenTicketWithItems } from "@/types/app"

export default function BrewBarPage() {
  const user = useAuthStore((s) => s.user)
  const { kitchenTickets, setKitchenTickets, upsertTicket, removeTicket } = useOrderStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const refreshTickets = useCallback(async () => {
    if (!user?.cafeId) return
    try {
      const supabase = createClient()
      const tickets = await fetchKitchenTickets(supabase, user.cafeId)
      setKitchenTickets(tickets)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets")
    }
  }, [user?.cafeId, setKitchenTickets])

  useEffect(() => {
    if (!user?.cafeId) return

    refreshTickets().finally(() => setLoading(false))

    const supabase = createClient()
    const channel = subscribeKitchenTickets(supabase, user.cafeId, {
      onTicketChange: refreshTickets,
    })

    return () => {
      unsubscribeKitchenTickets(channel)
    }
  }, [user?.cafeId, refreshTickets])

  async function handleStageUpdate(ticketId: string, stage: KitchenTicketWithItems["stage"]) {
    setUpdatingId(ticketId)
    try {
      const supabase = createClient()
      await updateTicketStage(supabase, ticketId, stage)
      await refreshTickets()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stage")
    } finally {
      setUpdatingId(null)
    }
  }

  const toCook = kitchenTickets.filter((t) => t.stage === "to_cook")
  const preparing = kitchenTickets.filter((t) => t.stage === "preparing")
  const completed = kitchenTickets.filter((t) => t.stage === "completed")

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading Brew Bar…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={refreshTickets} className="mt-2 text-sm text-odfe-teal underline">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (kitchenTickets.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 gap-2">
        <p className="text-4xl text-gray-200">☕</p>
        <p className="text-sm text-gray-400">No orders yet — waiting for the first ticket…</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen gap-4 overflow-x-auto bg-gray-50 p-4">
      {/* To Cook */}
      <div className="flex w-80 shrink-0 flex-col rounded-xl bg-white shadow">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">To Cook</h2>
          <p className="text-xs text-gray-400">{toCook.length} tickets</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {toCook.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onAdvance={() => handleStageUpdate(ticket.id, "preparing")}
              updating={updatingId === ticket.id}
            />
          ))}
        </div>
      </div>

      {/* Preparing */}
      <div className="flex w-80 shrink-0 flex-col rounded-xl bg-white shadow">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Preparing</h2>
          <p className="text-xs text-gray-400">{preparing.length} tickets</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {preparing.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onAdvance={() => handleStageUpdate(ticket.id, "completed")}
              updating={updatingId === ticket.id}
            />
          ))}
        </div>
      </div>

      {/* Completed */}
      <div className="flex w-80 shrink-0 flex-col rounded-xl bg-white shadow">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Completed</h2>
          <p className="text-xs text-gray-400">{completed.length} tickets</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {completed.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              completed
              updating={false}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TicketCard({
  ticket,
  onAdvance,
  completed,
  updating,
}: {
  ticket: KitchenTicketWithItems
  onAdvance?: () => void
  completed?: boolean
  updating: boolean
}) {
  const elapsed = formatElapsed(ticket.elapsedSeconds)

  return (
    <div className={`rounded-lg border p-3 ${completed ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-odfe-teal">{ticket.orderNumber}</span>
        <span className="font-mono text-xs text-gray-400">{elapsed}</span>
      </div>
      {ticket.tableLabel && (
        <p className="mt-1 text-xs text-gray-500">Table {ticket.tableLabel}</p>
      )}
      <ul className="mt-2 space-y-1">
        {ticket.items.map((item, i) => (
          <li key={i} className="flex justify-between text-sm">
            <span className="text-gray-800">{item.productName}</span>
            <span className="font-medium text-gray-600">x{item.quantity}</span>
          </li>
        ))}
      </ul>
      {!completed && onAdvance && (
        <button
          onClick={onAdvance}
          disabled={updating}
          className="mt-3 w-full rounded-md bg-odfe-teal py-1.5 text-xs font-semibold text-white hover:bg-odfe-teal-light disabled:opacity-50"
        >
          {updating ? "Updating…" : ticket.stage === "to_cook" ? "Start Preparing" : "Mark Completed"}
        </button>
      )}
    </div>
  )
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
