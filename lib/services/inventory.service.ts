import { createClient } from "@/lib/supabase/client"
import { getCafeId, getAuthenticatedProfile } from "./_shared"
import type { InventoryItem, StockMovement } from "@/types/database"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"

export type InventoryItemWithMovements = InventoryItem & {
  recentMovements: StockMovement[]
}

export async function fetchInventoryItems(
  search?: string,
  client?: DbClient
): Promise<InventoryItem[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  let query = supabase
    .from("inventory_items")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("name", { ascending: true })

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createInventoryItem(
  input: { name: string; unit: string; cost_price?: number; reorder_level?: number; expiry_date?: string; batch_number?: string },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  const payload: InsertTables<"inventory_items"> = {
    cafe_id: cafeId,
    name: input.name,
    unit: input.unit,
    cost_price: input.cost_price ?? 0,
    stock: 0,
    reorder_level: input.reorder_level ?? 0,
    expiry_date: input.expiry_date ?? null,
    batch_number: input.batch_number ?? null,
    is_active: true,
    created_by: profile.id,
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateInventoryItem(
  id: string,
  input: Partial<{ name: string; unit: string; cost_price: number; reorder_level: number; expiry_date: string | null; batch_number: string | null; is_active: boolean }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"inventory_items"> = input

  const { data, error } = await supabase
    .from("inventory_items")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function adjustStock(
  itemId: string,
  quantity: number,
  type: "in" | "out",
  note?: string,
  client?: DbClient,
  isWastage = false
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  // Record movement
  const movementPayload: InsertTables<"stock_movements"> = {
    cafe_id: cafeId,
    item_id: itemId,
    quantity,
    type,
    note: note ?? null,
    is_wastage: isWastage,
    created_by: profile.id,
  }

  const { error: movementError } = await supabase
    .from("stock_movements")
    .insert(movementPayload)

  if (movementError) throw new Error(movementError.message)

  // Update stock quantity
  const adjustment = type === "in" ? quantity : -quantity

  const { error: updateError } = await supabase.rpc("adjust_inventory_stock", {
    p_item_id: itemId,
    p_cafe_id: cafeId,
    p_adjustment: adjustment,
  })

  if (updateError) {
    // Fallback: direct update if RPC not available
    const { data: item } = await supabase
      .from("inventory_items")
      .select("stock")
      .eq("id", itemId)
      .eq("cafe_id", cafeId)
      .single()

    if (!item) throw new Error("Item not found")

    const newStock = Math.max(0, Number(item.stock) + adjustment)

    const { error: directError } = await supabase
      .from("inventory_items")
      .update({ stock: newStock })
      .eq("id", itemId)
      .eq("cafe_id", cafeId)

    if (directError) throw new Error(directError.message)
  }

  return { success: true }
}

export async function getStockMovements(
  itemId: string,
  limit = 20,
  client?: DbClient
): Promise<StockMovement[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("item_id", itemId)
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getLowStockItems(
  client?: DbClient
): Promise<InventoryItem[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("is_active", true)
    .order("stock", { ascending: true })

  if (error) throw new Error(error.message)

  // Client-side filter for stock <= reorder_level
  return (data ?? []).filter(
    (item) => Number(item.stock) <= Number(item.reorder_level)
  )
}

export async function deleteInventoryItem(
  id: string,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)
}

// ─── Product Ingredients ───────────────────────────────────────────────────

export type ProductIngredientRow = {
  id: string
  product_id: string
  item_id: string
  quantity: number
  item_name: string
  item_unit: string
}

export async function getProductIngredients(
  productId: string,
  client?: DbClient
): Promise<ProductIngredientRow[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("product_ingredients")
    .select("id, product_id, item_id, quantity")
    .eq("product_id", productId)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)

  // Fetch inventory item names
  const itemIds = (data ?? []).map((r) => r.item_id)
  if (itemIds.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from("inventory_items")
    .select("id, name, unit")
    .in("id", itemIds)
    .eq("cafe_id", cafeId)

  if (itemsError) throw new Error(itemsError.message)

  const itemMap = new Map((items ?? []).map((i) => [i.id, { name: i.name, unit: i.unit }]))

  return (data ?? []).map((r) => ({
    ...r,
    item_name: itemMap.get(r.item_id)?.name ?? "Unknown",
    item_unit: itemMap.get(r.item_id)?.unit ?? "piece",
  }))
}

export async function setProductIngredients(
  productId: string,
  ingredients: Array<{ item_id: string; quantity: number }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  // Delete existing
  const { error: delError } = await supabase
    .from("product_ingredients")
    .delete()
    .eq("product_id", productId)
    .eq("cafe_id", cafeId)

  if (delError) throw new Error(delError.message)

  if (ingredients.length === 0) return

  // Insert new
  const { error: insError } = await supabase
    .from("product_ingredients")
    .insert(
      ingredients.map((ing) => ({
        cafe_id: cafeId,
        product_id: productId,
        item_id: ing.item_id,
        quantity: ing.quantity,
        created_by: profile.id,
      }))
    )

  if (insError) throw new Error(insError.message)
}

// ─── Auto Stock Deduction ────────────────────────────────────────────────────

export async function deductStockForOrder(
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
