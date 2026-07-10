/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Customer } from "@/types/database"

export type CustomerUpdate = {
  name: string
  email: string | null
  phone: string | null
  loyalty_points: number
}

export async function fetchCustomers(): Promise<Customer[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("customers")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("name")
  if (error) throw new Error(error.message)
  return data as Customer[]
}

export async function updateCustomer(id: string, input: Partial<CustomerUpdate>): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("customers")
    .update(input)
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("customers")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function fetchCustomerOrderCount(customerId: string): Promise<number> {
  const supabase = createClient()
  const { count, error } = await (supabase as any)
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
  if (error) throw new Error(error.message)
  return count ?? 0
}