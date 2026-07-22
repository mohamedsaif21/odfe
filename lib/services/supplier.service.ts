import { createClient } from "@/lib/supabase/client"
import { getCafeId, getAuthenticatedProfile } from "./_shared"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"
import type { Supplier } from "@/types/database"

export async function fetchSuppliers(client?: DbClient): Promise<Supplier[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchActiveSuppliers(client?: DbClient): Promise<Supplier[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createSupplier(
  input: {
    name: string
    contact_person?: string
    phone?: string
    email?: string
    address?: string
  },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  const payload: InsertTables<"suppliers"> = {
    cafe_id: cafeId,
    name: input.name,
    contact_person: input.contact_person ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    is_active: true,
    created_by: profile.id,
  }

  const { data, error } = await supabase
    .from("suppliers")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateSupplier(
  id: string,
  input: Partial<{
    name: string
    contact_person: string
    phone: string
    email: string
    address: string
    is_active: boolean
  }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"suppliers"> = input

  const { data, error } = await supabase
    .from("suppliers")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteSupplier(id: string, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error } = await supabase
    .from("suppliers")
    .update({ is_active: false })
    .eq("id", id)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)
}
