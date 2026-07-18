"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, LogOut } from "lucide-react"
import { BrandedLoader } from "@/components/branding/branded-loader"
import { OdfeLogo } from "@/components/branding/odfe-logo"
import { getClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/store/auth-store"
import { useOrderStore } from "@/store/order-store"
import { signOut } from "@/lib/auth/auth.service"
import {
  fetchKitchenTickets,
  formatKitchenElapsed,
  subscribeToKitchenChanges,
  updateTicketStage,
} from "@/lib/orders/realtime"
import type { KitchenTicketWithItems } from "@/types/app"

export default function BrewBarPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const clearUser = useAuthStore((s) => s.clearUser)
  const cafeId = user?.cafeId ?? null
  const supabase = getClient()
  const { kitchenTickets, setKitchenTickets } = useOrderStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [, setTimerTick] = useState(0)

  // Ticks once a second purely to re-render elapsed time on each card —
  // does not refetch data, just recomputes from ticket.createdAt.
  useEffect(() => {
    const hasActiveTickets = kitchenTickets.some((ticket) => ticket.stage !== "completed")
    if (!hasActiveTickets) return

    const interval = setInterval(() => setTimerTick((tick) => tick + 1), 30000)
    return () => clearInterval(interval)
  }, [kitchenTickets])

  const loadTickets = useCallback(async () => {
    if (!cafeId) return
    try {
      const tickets = await fetchKitchenTickets(supabase, cafeId)
      setKitchenTickets(tickets)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets")
    }
  }, [cafeId, setKitchenTickets, supabase])

  useEffect(() => {
    if (!cafeId) return

    void loadTickets().finally(() => setLoading(false))

    const channel = subscribeToKitchenChanges(
      cafeId,
      () => {
        void loadTickets()
      },
      (err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Realtime connection failed."
        )
      }
    )

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [cafeId, loadTickets, supabase])

  async function handleStageUpdate(ticket: KitchenTicketWithItems, nextStage: KitchenTicketWithItems["stage"]) {
    setUpdatingId(ticket.id)
    try {
      await updateTicketStage(supabase, ticket.id, ticket.orderId, nextStage, ticket.stage)
      await loadTickets()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stage")
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleExit() {
    if (user?.role === "admin") {
      router.push("/dashboard")
      return
    }

    await signOut()
    clearUser()
    router.replace("/login")
  }

  const toCook = kitchenTickets.filter((t) => t.stage === "to_cook")
  const preparing = kitchenTickets.filter((t) => t.stage === "preparing")
  const completed = kitchenTickets
    .filter((t) => t.stage === "completed")
    .sort((a, b) => {
      const bTime = new Date(b.completedAt ?? b.updatedAt).getTime()
      const aTime = new Date(a.completedAt ?? a.updatedAt).getTime()
      return bTime - aTime
    })

  if (loading) {
    return <BrandedLoader fullScreen message="Loading Brew Bar..." />
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <BrewBarExit role={user?.role} onExit={handleExit} />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <BrewBarExit role={user?.role} onExit={handleExit} />
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={loadTickets} className="mt-2 text-sm text-odfe-teal underline">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (kitchenTickets.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 gap-2">
        <BrewBarExit role={user?.role} onExit={handleExit} />
        <p className="text-4xl text-gray-200">☕</p>
        <p className="text-sm text-gray-400">No orders yet — waiting for the first ticket…</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen gap-4 overflow-x-auto bg-gray-50 p-4">
      <BrewBarExit role={user?.role} onExit={handleExit} />
      {/* To Cook */}
      <div className="flex w-80 shrink-0 flex-col rounded-xl bg-white shadow">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <OdfeLogo variant="icon" size="sm" alt="" className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900">To Cook</h2>
          </div>
          <p className="text-xs text-gray-400">{toCook.length} tickets</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {toCook.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onAdvance={() => handleStageUpdate(ticket, "preparing")}
              updating={updatingId === ticket.id}
            />
          ))}
        </div>
      </div>

      {/* Preparing */}
      <div className="flex w-80 shrink-0 flex-col rounded-xl bg-white shadow">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <OdfeLogo variant="icon" size="sm" alt="" className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900">Preparing</h2>
          </div>
          <p className="text-xs text-gray-400">{preparing.length} tickets</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {preparing.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onAdvance={() => handleStageUpdate(ticket, "completed")}
              updating={updatingId === ticket.id}
            />
          ))}
        </div>
      </div>

      {/* Completed */}
      <div className="flex w-80 shrink-0 flex-col rounded-xl bg-white shadow">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <OdfeLogo variant="icon" size="sm" alt="" className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-gray-900">Completed</h2>
          </div>
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

function BrewBarExit({ role, onExit }: { role?: string; onExit: () => void }) {
  const isAdmin = role === "admin"

  return (
    <button
      onClick={onExit}
      className="fixed right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
    >
      {isAdmin ? <ArrowLeft size={13} /> : <LogOut size={13} />}
      {isAdmin ? "Dashboard" : "Logout"}
    </button>
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
  const elapsed = formatKitchenElapsed(ticket)

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
          <li key={i} className="text-sm">
            <div className="flex justify-between">
              <span className="text-gray-800">{item.productName}</span>
              <span className="font-medium text-gray-600">x{item.quantity}</span>
            </div>
            {item.notes && (
              <p className="text-xs italic text-gray-400">Note: {item.notes}</p>
            )}
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
