"use client"

import { create } from "zustand"
import type { PosSession } from "@/types/database"

interface SessionState {
  sessionId: string | null
  session: PosSession | null
  durationSeconds: number
  setSession: (session: PosSession | null) => void
  clearSession: () => void
  tick: () => void
}

let intervalId: ReturnType<typeof setInterval> | null = null

export const useSessionStore = create<SessionState>()((set, get) => ({
  sessionId: null,
  session: null,
  durationSeconds: 0,

  setSession: (session) => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }

    if (session) {
      const openedAt = new Date(session.opened_at).getTime()
      const elapsed = Math.floor((Date.now() - openedAt) / 1000)
      set({ sessionId: session.id, session, durationSeconds: elapsed })

      intervalId = setInterval(() => {
        const s = get().session
        if (!s) return
        const opened = new Date(s.opened_at).getTime()
        set({ durationSeconds: Math.floor((Date.now() - opened) / 1000) })
      }, 1000)
    } else {
      set({ sessionId: null, session: null, durationSeconds: 0 })
    }
  },

  clearSession: () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    set({ sessionId: null, session: null, durationSeconds: 0 })
  },

  tick: () => {
    const s = get().session
    if (!s) return
    const opened = new Date(s.opened_at).getTime()
    set({ durationSeconds: Math.floor((Date.now() - opened) / 1000) })
  },
}))
