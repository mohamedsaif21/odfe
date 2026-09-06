"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function RedeemTestPage() {
  const [result, setResult] = useState("Ready...")
  const [loading, setLoading] = useState(false)

  async function testRedemption() {
    setLoading(true)
    setResult("Checking authentication...")

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        setResult(`AUTH ERROR: ${userError.message}`)
        return
      }

      if (!user) {
        setResult("NO AUTHENTICATED USER")
        return
      }

      setResult(`Authenticated user: ${user.id}`)

      const { data, error } = await supabase.rpc(
        "redeem_loyalty_points",
        {
          p_customer_id:
            "0cfbe883-9a8f-4467-8498-269852dee56e",

          p_cafe_id:
            "1dc44539-bab6-4124-83b2-b3f3b51435b3",

          p_points: 2,

          p_order_id:
            "6a88cc45-51a2-4abe-b040-0198bdcba337",

          p_profile_id: user.id,
        }
      )

      if (error) {
        setResult(`RPC ERROR: ${error.message}`)
        return
      }

      setResult(`SUCCESS — Discount returned: ${data}`)
    } catch (error) {
      setResult(
        `UNEXPECTED ERROR: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Loyalty Redemption Test</h1>

      <p>
        Customer: 0cfbe883-9a8f-4467-8498-269852dee56e
      </p>

      <p>
        Order: ODFE-20260716-075050-3B9146
      </p>

      <button
        type="button"
        onClick={testRedemption}
        disabled={loading}
        style={{
          padding: "12px 24px",
          marginTop: 20,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        Redeem 2 Points
      </button>

      <pre
        style={{
          marginTop: 30,
          padding: 20,
          border: "1px solid #ccc",
          whiteSpace: "pre-wrap",
        }}
      >
        {result}
      </pre>
    </main>
  )
}
