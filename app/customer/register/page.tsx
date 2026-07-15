"use client"

import { useState, type FormEvent, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"
import { useAuthStore } from "@/store/auth-store"

function safeCustomerRedirect(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/self-order"
}

function CustomerRegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser } = useAuthStore()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match")
      }

      const supabase = createClient()
      const redirect = safeCustomerRedirect(searchParams.get("redirect") || searchParams.get("redirectTo"))
      const qrToken = redirect.startsWith("/s/") ? redirect.split("/s/")[1]?.split("?")[0] : null
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role: "customer",
            full_name: fullName.trim(),
          },
        },
      })

      if (signUpError || !user) {
        throw new Error(signUpError?.message ?? "Registration failed")
      }

      const res = await fetch("/api/onboarding/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          token: qrToken,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error ?? "Customer onboarding failed")
      }

      const profile = await resolveAuthenticatedProfile(user.id, supabase)

      if (profile.role !== "customer") {
        throw new Error("Customer profile was not created correctly")
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

      router.replace(redirect)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-odfe-cream p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl tracking-wide text-odfe-teal">OdFe</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-odfe-sage">Customer Sign Up</p>
          <div className="mx-auto mt-3 h-0.5 w-8 rounded-full bg-odfe-gold" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"
            />
          </div>
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
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
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
              minLength={6}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
              required
              minLength={6}
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
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-400">
          Already have an account?{" "}
          <Link href={`/customer/login${searchParams.toString() ? `?${searchParams.toString()}` : ""}`} className="text-odfe-teal underline underline-offset-2 hover:text-odfe-gold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function CustomerRegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loadingâ€¦</div>}>
      <CustomerRegisterForm />
    </Suspense>
  )
}
