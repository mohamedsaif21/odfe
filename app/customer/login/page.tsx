"use client"

import { useState, type FormEvent, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"
import { useAuthStore } from "@/store/auth-store"

function CustomerLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser } = useAuthStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError || !session) {
        throw new Error(authError?.message ?? "Invalid credentials")
      }

      const profile = await resolveAuthenticatedProfile(session.user.id, supabase)

      if (profile.role !== "customer") {
        throw new Error("Please use staff login.")
      }

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .eq("profile_id", profile.id)
        .single()

      if (customerError || !customer) {
        throw new Error("Customer record not found.")
      }

      setUser({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        fullName: profile.fullName,
        cafeId: profile.cafeId,
        cafeName: "",
        avatarUrl: profile.avatarUrl,
      })

      const redirect = searchParams.get("redirect") || searchParams.get("redirectTo") || "/self-order"
      router.push(redirect)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-odfe-cream p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl tracking-wide text-odfe-teal">OdFe</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-odfe-sage">Customer Login</p>
          <div className="mx-auto mt-3 h-0.5 w-8 rounded-full bg-odfe-gold" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-odfe-teal py-2.5 text-sm font-semibold text-white transition hover:bg-odfe-teal-light disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-400">
          New here?{" "}
          <Link href={`/customer/register${searchParams.toString() ? `?${searchParams.toString()}` : ""}`} className="text-odfe-teal underline underline-offset-2 hover:text-odfe-gold">
            Create account
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-gray-400">
          Staff?{" "}
          <Link href="/login" className="text-odfe-teal underline underline-offset-2">
            Staff login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <CustomerLoginForm />
    </Suspense>
  )
}
