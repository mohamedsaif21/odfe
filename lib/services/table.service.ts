import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { CafeTable, Floor } from "@/types/database"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"

export async function fetchFloors(client?: DbClient): Promise<Floor[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("floors")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("sort_order")

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchTables(floorId?: string, client?: DbClient): Promise<CafeTable[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  let query = supabase
    .from("cafe_tables")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("label")

  if (floorId) query = query.eq("floor_id", floorId)

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createTable(
  input: { label: string; seats: number; floor_id?: string },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const payload: InsertTables<"cafe_tables"> = {
    cafe_id: cafeId,
    label: input.label,
    seats: input.seats,
    floor_id: input.floor_id ?? null,
    status: "available",
    qr_token: null,
    qr_image_url: null,
  }

  const { data, error } = await supabase
    .from("cafe_tables")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateTable(
  id: string,
  input: Partial<{ label: string; seats: number; floor_id: string; status: "available" | "occupied" | "reserved" }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"cafe_tables"> = input

  const { data, error } = await supabase
    .from("cafe_tables")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteTable(id: string, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error } = await supabase
    .from("cafe_tables")
    .delete()
    .eq("id", id)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)
}

export async function generateQrCode(tableId: string, client?: DbClient): Promise<string> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const token = `${cafeId.slice(0, 8)}-${tableId.slice(0, 8)}-${Date.now().toString(36)}`

  const updates: UpdateTables<"cafe_tables"> = { qr_token: token }

  const { data, error } = await supabase
    .from("cafe_tables")
    .update(updates)
    .eq("id", tableId)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return token
}
