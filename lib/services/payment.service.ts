/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { PaymentMethodType } from "@/types/database"

export interface PaymentMethod {
  id: string
  cafe_id: string
  type: PaymentMethodType
  label: string
  is_active: boolean
  config: Record<string, unknown> | null
  created_at: string
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("payment_methods")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("type")
  if (error) throw new Error(error.message)
  return data as PaymentMethod[]
}

export async function createPaymentMethod(input: { type: PaymentMethodType; label: string }): Promise<PaymentMethod> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("payment_methods")
    .insert([{ ...input, cafe_id: cafeId, is_active: true, config: null }])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as PaymentMethod
}

export async function togglePaymentMethod(id: string, is_active: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("payment_methods")
    .update({ is_active })
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("payment_methods")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
}