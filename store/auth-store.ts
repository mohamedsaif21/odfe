"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AuthUser } from "@/types/app"

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      clearUser: () => set({ user: null, isLoading: false }),
    }),
    {
      name: "odfe-auth",
      // Only persist user, not loading state
      partialize: (state) => ({ user: state.user }),
    }
  )
)