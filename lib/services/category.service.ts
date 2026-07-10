/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { ProductCategory } from "@/types/database"

export type CategoryInsert = {
  name: string
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
}

export async function fetchCategories(): Promise<ProductCategory[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("product_categories")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("sort_order")
  if (error) throw new Error(error.message)
  return data as ProductCategory[]
}

export async function createCategory(input: CategoryInsert): Promise<ProductCategory> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("product_categories")
    .insert([{ ...input, cafe_id: cafeId }])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ProductCategory
}

export async function updateCategory(id: string, input: Partial<CategoryInsert>): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("product_categories")
    .update(input)
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("product_categories")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
}