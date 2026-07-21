import { createClient } from "@/lib/supabase/client"
import { getCafeId, getAuthenticatedProfile } from "./_shared"
import type { DbClient } from "./_shared"
import type { InventoryItem, Product } from "@/types/database"

export type RecipeIngredientRow = {
  id: string
  product_id: string
  item_id: string
  quantity: number
  item_name: string
  item_unit: string
  item_stock: number
}

export async function fetchRecipes(
  search?: string,
  client?: DbClient
): Promise<(Product & { ingredientCount: number })[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  let query = supabase
    .from("products")
    .select("id, name, is_available, price")
    .eq("cafe_id", cafeId)
    .order("name", { ascending: true })

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data: products, error } = await query
  if (error) throw new Error(error.message)
  if (!products?.length) return []

  const productIds = products.map((p) => p.id)
  const { data: ingredients } = await supabase
    .from("product_ingredients")
    .select("product_id, id")
    .in("product_id", productIds)
    .eq("cafe_id", cafeId)

  const countMap = new Map<string, number>()
  for (const ing of ingredients ?? []) {
    countMap.set(ing.product_id, (countMap.get(ing.product_id) ?? 0) + 1)
  }

  return products.map((p) => ({
    ...p,
    ingredientCount: countMap.get(p.id) ?? 0,
  })) as (Product & { ingredientCount: number })[]
}

export async function fetchRecipeIngredients(
  productId: string,
  client?: DbClient
): Promise<RecipeIngredientRow[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("product_ingredients")
    .select("id, product_id, item_id, quantity")
    .eq("product_id", productId)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)

  const itemIds = (data ?? []).map((r) => r.item_id)
  if (itemIds.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from("inventory_items")
    .select("id, name, unit, stock")
    .in("id", itemIds)
    .eq("cafe_id", cafeId)

  if (itemsError) throw new Error(itemsError.message)

  const itemMap = new Map((items ?? []).map((i) => [i.id, { name: i.name, unit: i.unit, stock: i.stock }]))

  return (data ?? []).map((r) => ({
    ...r,
    item_name: itemMap.get(r.item_id)?.name ?? "Unknown",
    item_unit: itemMap.get(r.item_id)?.unit ?? "piece",
    item_stock: Number(itemMap.get(r.item_id)?.stock ?? 0),
  }))
}

export async function setRecipeIngredients(
  productId: string,
  ingredients: Array<{ item_id: string; quantity: number }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error: delError } = await supabase
    .from("product_ingredients")
    .delete()
    .eq("product_id", productId)
    .eq("cafe_id", cafeId)

  if (delError) throw new Error(delError.message)

  if (ingredients.length === 0) return

  const { error: insError } = await supabase
    .from("product_ingredients")
    .insert(
      ingredients.map((ing) => ({
        cafe_id: cafeId,
        product_id: productId,
        item_id: ing.item_id,
        quantity: ing.quantity,
      }))
    )

  if (insError) throw new Error(insError.message)
}

export async function deductStockForOrderRpc(
  orderId: string,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  const { error } = await supabase.rpc("deduct_stock_for_order", {
    p_order_id: orderId,
    p_cafe_id: cafeId,
    p_profile_id: profile.id,
  })

  if (error) throw new Error(error.message)
}

export async function fetchAllInventoryItems(
  search?: string,
  client?: DbClient
): Promise<InventoryItem[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  let query = supabase
    .from("inventory_items")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
