/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Coupon, DiscountType } from "@/types/database"

export type CouponInsert = {
  code: string
  discount_type: DiscountType
  value: number
  min_order_amount: number | null
  max_uses: number | null
  is_active: boolean
  expires_at: string | null
}

export async function fetchCoupons(): Promise<Coupon[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("coupons")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data as Coupon[]
}

export async function createCoupon(input: CouponInsert): Promise<Coupon> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("coupons")
    .insert([{ ...input, cafe_id: cafeId }])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Coupon
}

export async function updateCoupon(id: string, input: Partial<CouponInsert>): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("coupons")
    .update(input)
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteCoupon(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("coupons")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
}