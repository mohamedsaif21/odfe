"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function RlsTestPage() {
  const [result, setResult] = useState("")

  async function runTest() {
    const supabase = createClient()

    const [
      referralResult,
      walletResult,
      profileResult,
    ] = await Promise.all([
      supabase
        .from("referral_codes")
        .select("id, customer_id, cafe_id, code")
        .limit(10),

      supabase
        .from("wallet_transactions")
        .select("id, customer_id, cafe_id, amount, type")
        .limit(10),

      supabase.auth.getUser(),
    ])

    setResult(
      JSON.stringify(
        {
          user: profileResult.data.user?.id ?? null,
          referral_error: referralResult.error?.message ?? null,
          referral_rows: referralResult.data ?? [],
          wallet_error: walletResult.error?.message ?? null,
          wallet_rows: walletResult.data ?? [],
        },
        null,
        2
      )
    )
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>RLS Test</h1>

      <button
        onClick={runTest}
        style={{
          padding: "10px 20px",
          marginTop: 20,
          cursor: "pointer",
        }}
      >
        Run RLS Test
      </button>

      <pre
        style={{
          marginTop: 30,
          whiteSpace: "pre-wrap",
        }}
      >
        {result}
      </pre>
    </main>
  )
}
