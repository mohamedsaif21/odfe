import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Coupon } from "@/types/database"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"

function mapCouponDatabaseError(error: { code?: string; message?: string; details?: string | null }) {
  const message = error.message ?? ""
  const details = error.details ?? ""
  const combined = `${message} ${details}`.toLowerCase()

  if (process.env.NODE_ENV === "development") {
    console.error("Coupon database error:", error)
  }

  if (combined.includes("coupons_percentage_range")) {
    return "Percentage discount must be between 1 and 100."
  }

  if (error.code === "23505" || combined.includes("duplicate key") || combined.includes("unique constraint")) {
    return "A coupon with this code already exists."
  }

  if (combined.includes("expiry") || combined.includes("expires_at")) {
    return "Expiry date must be in the future."
  }

  return message || "Failed to save coupon."
}

export async function fetchCoupons(client?: DbClient): Promise<Coupon[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchValidCoupons(client?: DbClient): Promise<Coupon[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).filter((coupon) => !coupon.max_uses || coupon.used_count < coupon.max_uses)
}

export async function createCoupon(
  input: {
    code: string
    discount_type: "percentage" | "flat"
    value: number
    min_order_amount?: number
    max_uses?: number
    expires_at?: string
  },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const payload: InsertTables<"coupons"> = {
    cafe_id: cafeId,
    code: input.code,
    discount_type: input.discount_type,
    value: input.value,
    min_order_amount: input.min_order_amount ?? null,
    max_uses: input.max_uses ?? null,
    expires_at: input.expires_at ?? null,
    is_active: true,
  }

  const { data, error } = await supabase
    .from("coupons")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(mapCouponDatabaseError(error))
  return data
}

export async function toggleCoupon(id: string, isActive: boolean, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"coupons"> = { is_active: isActive }

  const { data, error } = await supabase
    .from("coupons")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function validateCoupon(code: string, orderAmount: number, client?: DbClient): Promise<Coupon | null> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single()

  if (error || !data) return null

  if (data.max_uses && data.used_count >= data.max_uses) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  if (data.min_order_amount && orderAmount < data.min_order_amount) return null

  return data
}
