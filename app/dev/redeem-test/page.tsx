"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function RedeemTestPage() {
  const [result, setResult] = useState<string>("")

  async function testRedemption() {
    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      setResult(`Auth error: ${userError.message}`)
      return
    }

    if (!user) {
      setResult("No authenticated user found.")
      return
    }

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
      setResult(`RPC error: ${error.message}`)
      return
    }

    setResult(`SUCCESS — Discount returned: ${data}`)
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
        onClick={testRedemption}
        style={{
          padding: "10px 20px",
          marginTop: 20,
          cursor: "pointer",
        }}
      >
        Redeem 2 Points
      </button>

      <pre style={{ marginTop: 20 }}>
        {result}
      </pre>
    </main>
  )
}
