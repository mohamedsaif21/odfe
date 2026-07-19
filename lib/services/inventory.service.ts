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
