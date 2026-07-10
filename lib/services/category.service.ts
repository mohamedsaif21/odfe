import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { ProductCategory } from "@/types/database"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"

export async function fetchCategories(client?: DbClient): Promise<ProductCategory[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("is_active", true)
    .order("sort_order")

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCategory(
  input: { name: string; icon?: string; color?: string; sort_order?: number },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const payload: InsertTables<"product_categories"> = {
    cafe_id: cafeId,
    name: input.name,
    icon: input.icon ?? null,
    color: input.color ?? null,
    sort_order: input.sort_order ?? 0,
    is_active: true,
  }

  const { data, error } = await supabase
    .from("product_categories")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCategory(
  id: string,
  input: Partial<{ name: string; icon: string; color: string; sort_order: number; is_active: boolean }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"product_categories"> = input

  const { data, error } = await supabase
    .from("product_categories")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteCategory(id: string, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error } = await supabase
    .from("product_categories")
    .update({ is_active: false })
    .eq("id", id)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)
}
