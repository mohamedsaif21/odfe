import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Login" }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-odfe-cream p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl tracking-wide text-odfe-teal">OdFe</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-odfe-sage">POS</p>
          <div className="mx-auto mt-3 h-0.5 w-8 rounded-full bg-odfe-gold" />
        </div>
        <form className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Email</label>
            <input type="email" placeholder="you@cafe.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Password</label>
            <input type="password" placeholder="••••••••"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal" />
          </div>
          <button type="submit"
            className="w-full rounded-lg bg-odfe-teal py-2.5 text-sm font-semibold text-white transition hover:bg-odfe-teal-light">
            Sign in
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-odfe-teal underline underline-offset-2 hover:text-odfe-gold">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}