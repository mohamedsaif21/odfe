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
      const userResult = await supabase.auth.getUser()

      if (userResult.error) {
        throw new Error(`AUTH ERROR: ${userResult.error.message}`)
      }

      if (!userResult.data.user) {
        throw new Error("NO AUTHENTICATED USER")
      }

      const userId = userResult.data.user.id
      const profileResult = await supabase
        .from("profiles")
        .select("id, cafe_id, is_active")
        .eq("id", userId)
        .eq("cafe_id", CAFE_ID)
        .single()

      if (profileResult.error) {
        throw new Error(`PROFILE ERROR: ${profileResult.error.message}`)
      }

      const beforeResult = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", ITEM_ID)
        .eq("cafe_id", CAFE_ID)
        .single()

      if (beforeResult.error) {
        throw new Error(`BEFORE ERROR: ${beforeResult.error.message}`)
      }

      const adjustResult = await supabase.rpc("adjust_inventory_stock", {
        p_item_id: ITEM_ID,
        p_cafe_id: CAFE_ID,
        p_adjustment: 10,
        p_type: "in",
        p_note: "Migration 3.1 test adjustment",
        p_created_by: userId,
      })

      const afterResult = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", ITEM_ID)
        .eq("cafe_id", CAFE_ID)
        .single()

      const movements = await (supabase as any)
        .from("stock_movements")
        .select(
          "id, inventory_item_id, quantity, movement_type, notes, created_by, created_at"
        )
        .eq("inventory_item_id", ITEM_ID)
        .eq("cafe_id", CAFE_ID)
        .order("created_at", { ascending: false })

      const getItemResult = (item: unknown) => {
        const row = item as unknown as Record<string, unknown> | null
        return row
          ? {
              id: row.id,
              name: row.name,
              stock: Number(row.stock ?? row.current_stock ?? 0),
              current_stock: Number(row.current_stock ?? 0),
            }
          : null
      }

      setResult(
        JSON.stringify(
          {
            user: userId,
            profile: profileResult.data,
            before: getItemResult(beforeResult.data),
            adjust_error: adjustResult.error?.message ?? null,
            after_adjust: getItemResult(afterResult.data),
            movements: movements.data ?? [],
            after_error: afterResult.error?.message ?? null,
            movements_error: movements.error?.message ?? null,
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
      <h1>Migration 3.1 Inventory Test</h1>

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
        {loading ? "Running..." : "Run Adjust Test"}
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