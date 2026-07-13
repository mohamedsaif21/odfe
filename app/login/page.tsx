"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { signInEmployee } from "@/lib/auth/auth.service"
import { useAuthStore } from "@/store/auth-store"
import { getDefaultRedirect } from "@/lib/auth/role-mapper"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser, user } = useAuthStore()

  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Already logged in — send to role home
  useEffect(() => {
    if (user) {
      router.replace(getDefaultRedirect(user.role))
    }
  }, [user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim())    { setError("Email is required."); return }
    if (!password)        { setError("Password is required."); return }

    setLoading(true)
    try {
      const authUser = await signInEmployee(email, password)
      setUser(authUser)
      const redirectTo = searchParams.get("redirectTo")
      // Only honour redirectTo if it's a safe internal path
      const dest =
        redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("/login")
          ? redirectTo
          : getDefaultRedirect(authUser.role)
      router.replace(dest)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-odfe-teal">
      <div className="w-full max-w-sm rounded-2xl bg-odfe-cream p-8 shadow-xl">

        {/* Logo */}
        <div className="mb-8 text-center">
          <h1
            className="text-4xl text-odfe-teal"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            OdFe
          </h1>
          <div className="mx-auto mt-2 h-0.5 w-8 rounded-full bg-odfe-gold" />
          <p className="mt-3 text-sm text-odfe-charcoal/60">Staff Login</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-odfe-charcoal/70">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null) }}
              placeholder="you@cafe.com"
              className="w-full rounded-lg border border-odfe-sage/30 bg-white px-3 py-2.5 text-sm text-odfe-charcoal outline-none placeholder:text-odfe-charcoal/30 focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-odfe-charcoal/70">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                placeholder="••••••••"
                className="w-full rounded-lg border border-odfe-sage/30 bg-white px-3 py-2.5 pr-10 text-sm text-odfe-charcoal outline-none placeholder:text-odfe-charcoal/30 focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-odfe-charcoal/40 hover:text-odfe-charcoal/70"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-odfe-teal py-3 text-sm font-semibold text-odfe-cream transition-colors hover:bg-odfe-teal-light disabled:opacity-60"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-odfe-charcoal/40">
          Admin · Cashier · Kitchen staff only
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-odfe-teal"><Loader2 className="animate-spin text-odfe-cream" size={24} /></div>}>
      <LoginForm />
    </Suspense>
  )
}