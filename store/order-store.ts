"use client"

import { create } from "zustand"
import type { OrderWithItems, KitchenTicketWithItems } from "@/types/app"

interface OrderState {
  // Active orders visible on POS orders list
  activeOrders: OrderWithItems[]
  setActiveOrders: (orders: OrderWithItems[]) => void
  upsertOrder: (order: OrderWithItems) => void

  // Kitchen tickets visible on brew bar
  kitchenTickets: KitchenTicketWithItems[]
  setKitchenTickets: (tickets: KitchenTicketWithItems[]) => void
  upsertTicket: (ticket: KitchenTicketWithItems) => void
  removeTicket: (ticketId: string) => void

  // Currently viewed order in detail panel
  activeOrderId: string | null
  setActiveOrderId: (id: string | null) => void
}

export const useOrderStore = create<OrderState>()((set, get) => ({
  activeOrders: [],
  setActiveOrders: (orders) => set({ activeOrders: orders }),
  upsertOrder: (order) => {
    const { activeOrders } = get()
    const exists = activeOrders.find((o) => o.id === order.id)
    if (exists) {
      set({ activeOrders: activeOrders.map((o) => (o.id === order.id ? order : o)) })
    } else {
      set({ activeOrders: [order, ...activeOrders] })
    }
  },

  kitchenTickets: [],
  setKitchenTickets: (tickets) => set({ kitchenTickets: tickets }),
  upsertTicket: (ticket) => {
    const { kitchenTickets } = get()
    const exists = kitchenTickets.find((t) => t.id === ticket.id)
    if (exists) {
      set({ kitchenTickets: kitchenTickets.map((t) => (t.id === ticket.id ? ticket : t)) })
    } else {
      set({ kitchenTickets: [ticket, ...kitchenTickets] })
    }
  },
  removeTicket: (ticketId) => {
    const { kitchenTickets } = get()
    set({ kitchenTickets: kitchenTickets.filter((t) => t.id !== ticketId) })
  },

  activeOrderId: null,
  setActiveOrderId: (id) => set({ activeOrderId: id }),
}))