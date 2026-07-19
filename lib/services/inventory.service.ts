import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
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
  input: { name: string; unit: string; cost_price?: number; reorder_level?: number },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const payload: InsertTables<"inventory_items"> = {
    cafe_id: cafeId,
    name: input.name,
    unit: input.unit,
    cost_price: input.cost_price ?? 0,
    stock: 0,
    reorder_level: input.reorder_level ?? 0,
    is_active: true,
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
  input: Partial<{ name: string; unit: string; cost_price: number; reorder_level: number; is_active: boolean }>,
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
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  // Get profile for created_by
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", session.user.id)
    .single()

  if (!profile) throw new Error("Profile not found")

  // Record movement
  const movementPayload: InsertTables<"stock_movements"> = {
    cafe_id: cafeId,
    item_id: itemId,
    quantity,
    type,
    note: note ?? null,
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

  // Get order items
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId)
    .eq("cafe_id", cafeId)

  if (itemsError) throw new Error(itemsError.message)
  if (!orderItems?.length) return

  // Get all product-ingredient links
  const productIds = Array.from(new Set(orderItems.map((oi) => oi.product_id)))
  const { data: recipes, error: recipeError } = await supabase
    .from("product_ingredients")
    .select("product_id, item_id, quantity")
    .in("product_id", productIds)
    .eq("cafe_id", cafeId)

  if (recipeError) throw new Error(recipeError.message)
  if (!recipes?.length) return

  // Build ingredient usage map: item_id → total quantity to deduct
  const usageMap = new Map<string, number>()
  for (const oi of orderItems) {
    for (const recipe of recipes) {
      if (recipe.product_id !== oi.product_id) continue
      const current = usageMap.get(recipe.item_id) ?? 0
      usageMap.set(recipe.item_id, current + Number(recipe.quantity) * oi.quantity)
    }
  }

  // Get profile for created_by
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", session?.user.id ?? "")
    .maybeSingle()

  const profileId = profile?.id ?? "00000000-0000-0000-0000-000000000000"

  // Create stock movements and update stock for each ingredient
  const entries = Array.from(usageMap)
  for (let i = 0; i < entries.length; i++) {
    const itemId = entries[i][0]
    const totalQty = entries[i][1]
    const quantity = Number(totalQty.toFixed(3))

    const { error: movError } = await supabase
      .from("stock_movements")
      .insert({
        cafe_id: cafeId,
        item_id: itemId,
        quantity,
        type: "out",
        note: `Auto-deducted from order ${orderId}`,
        created_by: profileId,
      })

    if (movError) {
      console.error(`Failed to record stock movement for item ${itemId}:`, movError.message)
      continue
    }

    const { error: stockError } = await supabase.rpc("adjust_inventory_stock", {
      p_item_id: itemId,
      p_cafe_id: cafeId,
      p_adjustment: -quantity,
    })

    if (stockError) {
      console.error(`Failed to adjust stock for item ${itemId}:`, stockError.message)
    }
  }
}
