"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

const CAFE_ID = "1dc44539-bab6-4124-83b2-b3f3b51435b3"
const ITEM_ID = "28b745b8-d219-4de6-99ac-cb0265311516"

export default function InventoryTestPage() {
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)

  async function runTest() {
    setLoading(true)
    setResult("Running...")

    try {
      const supabase = createClient()
      const [userResult, itemResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("inventory_items")
          .select("id, cafe_id, name, unit, current_stock, minimum_stock")
          .eq("id", ITEM_ID)
          .eq("cafe_id", CAFE_ID)
          .maybeSingle(),
      ])

      setResult(
        JSON.stringify(
          {
            user: userResult.data.user?.id ?? null,
            auth_error: userResult.error?.message ?? null,
            cafe_id: CAFE_ID,
            item_id: ITEM_ID,
            item_error: itemResult.error?.message ?? null,
            item: itemResult.data,
          },
          null,
          2
        )
      )
    } catch (error) {
      setResult(
        `UNEXPECTED ERROR: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Inventory Test</h1>

      <p>Cafe: {CAFE_ID}</p>
      <p>Item: {ITEM_ID}</p>

      <button
        type="button"
        onClick={runTest}
        disabled={loading}
        style={{
          padding: "10px 20px",
          marginTop: 20,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Running..." : "Run Inventory Test"}
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