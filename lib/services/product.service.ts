import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Product } from "@/types/database"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"

export async function fetchProducts(categoryId?: string, client?: DbClient): Promise<Product[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  let query = supabase
    .from("products")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("sort_order")

  if (categoryId) query = query.eq("category_id", categoryId)

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchAvailableProducts(categoryId?: string, client?: DbClient): Promise<Product[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  let query = supabase
    .from("products")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("is_available", true)
    .order("sort_order")

  if (categoryId) query = query.eq("category_id", categoryId)

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchProduct(id: string, client?: DbClient): Promise<Product> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createProduct(
  input: {
    category_id: string
    name: string
    price: number
    description?: string
    tax_rate?: number
    discount?: number
    image_url?: string | null
    sort_order?: number
    is_available?: boolean
  },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const payload: InsertTables<"products"> = {
    cafe_id: cafeId,
    category_id: input.category_id,
    name: input.name,
    price: input.price,
    description: input.description ?? null,
    tax_rate: input.tax_rate ?? 0,
    discount: input.discount ?? 0,
    image_url: input.image_url ?? null,
    is_available: input.is_available ?? true,
    sort_order: input.sort_order ?? 0,
  }

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateProduct(
  id: string,
  input: Partial<{
    name: string
    price: number
    description: string
    category_id: string
    tax_rate: number
    discount: number
    image_url: string | null
    is_available: boolean
    sort_order: number
  }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"products"> = input

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function toggleProductAvailability(id: string, isAvailable: boolean, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"products"> = { is_available: isAvailable }

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteProduct(id: string, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error } = await supabase
    .from("products")
    .update({ is_available: false })
    .eq("id", id)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)
}
