import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Customer } from "@/types/database"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"

export async function fetchCustomers(search?: string, client?: DbClient): Promise<Customer[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  let query = supabase
    .from("customers")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCustomer(
  input: { name: string; email?: string; phone?: string },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const payload: InsertTables<"customers"> = {
    cafe_id: cafeId,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    profile_id: null,
    loyalty_points: 0,
  }

  const { data, error } = await supabase
    .from("customers")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCustomer(
  id: string,
  input: Partial<{ name: string; email: string; phone: string }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"customers"> = input

  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function addLoyaltyPoints(customerId: string, points: number, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>)(
    "add_loyalty_points",
    {
      p_customer_id: customerId,
      p_cafe_id: cafeId,
      p_points: points,
    }
  )

  if (error) throw new Error(error.message)
  return data
}
