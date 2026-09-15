"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface SelfOrderContext {
  token: string
  cafeId: string
  tableId: string
  tableLabel: string
  profileId: string
  timestamp: number
}

interface SelfOrderState {
  context: SelfOrderContext | null
  setSelfOrderContext: (context: SelfOrderContext) => void
  clearSelfOrderContext: () => void
}

export const useSelfOrderStore = create<SelfOrderState>()(
  persist(
    (set) => ({
      context: null,
      setSelfOrderContext: (context) => set({ context }),
      clearSelfOrderContext: () => set({ context: null }),
    }),
    {
      name: "odfe-self-order-context",
      partialize: (state) => ({ context: state.context }),
    }
  )
)