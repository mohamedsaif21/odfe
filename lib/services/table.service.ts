/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { CafeTable, TableStatus } from "@/types/database"

export type TableInsert = {
  label: string
  seats: number
  status: TableStatus
  floor_id: string | null
}

export async function fetchTables(): Promise<CafeTable[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("cafe_tables")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("label")
  if (error) throw new Error(error.message)
  return data as CafeTable[]
}

export async function createTable(input: TableInsert): Promise<CafeTable> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("cafe_tables")
    .insert([{ ...input, cafe_id: cafeId }])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as CafeTable
}

export async function updateTable(id: string, input: Partial<TableInsert>): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("cafe_tables")
    .update(input)
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function updateTableStatus(id: string, status: TableStatus): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("cafe_tables")
    .update({ status })
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteTable(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("cafe_tables")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
}