import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"
import type { PurchaseOrder, PurchaseOrderItem, Supplier } from "@/types/database"

export type PurchaseOrderWithDetails = PurchaseOrder & {
  supplier: Supplier | null
  items: PurchaseOrderItem[]
}

export async function fetchPurchaseOrders(client?: DbClient): Promise<PurchaseOrderWithDetails[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data: orders, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  if (!orders?.length) return []

  const supplierIds: string[] = orders.map((o) => o.supplier_id).filter((id): id is string => id !== null)
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .in("id", supplierIds)

  const supplierMap = new Map((suppliers ?? []).map((s) => [s.id, s]))

  const orderIds = orders.map((o) => o.id)
  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("*")
    .in("purchase_order_id", orderIds)

  const itemsMap = new Map<string, PurchaseOrderItem[]>()
  for (const item of items ?? []) {
    const list = itemsMap.get(item.purchase_order_id) ?? []
    list.push(item)
    itemsMap.set(item.purchase_order_id, list)
  }

  return orders.map((o) => ({
    ...o,
    supplier: o.supplier_id ? (supplierMap.get(o.supplier_id) ?? null) : null,
    items: itemsMap.get(o.id) ?? [],
  }))
}

export async function fetchPurchaseOrder(id: string, client?: DbClient): Promise<PurchaseOrderWithDetails | null> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .single()

  if (error) throw new Error(error.message)
  if (!order) return null

  const { data: supplier } = order.supplier_id
    ? await supabase.from("suppliers").select("*").eq("id", order.supplier_id).single()
    : { data: null }

  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", id)

  return {
    ...order,
    supplier,
    items: items ?? [],
  }
}

export async function createPurchaseOrder(
  input: {
    supplier_id?: string
    notes?: string
    items: Array<{ item_id: string; quantity: number; unit_cost: number }>
  },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", session.user.id)
    .single()

  if (!profile) throw new Error("Profile not found")

  const { data: orderNumberRaw } = await supabase.rpc("generate_po_number", {
    p_cafe_id: cafeId,
  })
  const orderNumber = typeof orderNumberRaw === "string" ? orderNumberRaw : "PO-0001"

  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0
  )

  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .insert({
      cafe_id: cafeId,
      supplier_id: input.supplier_id ?? null,
      order_number: orderNumber,
      status: "draft",
      total_amount: totalAmount,
      notes: input.notes ?? null,
      ordered_at: null,
      received_at: null,
      created_by: profile.id,
    })
    .select()
    .single()

  if (orderError) throw new Error(orderError.message)

  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(
      input.items.map((item) => ({
        cafe_id: cafeId,
        purchase_order_id: order.id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        line_total: item.quantity * item.unit_cost,
      }))
    )

  if (itemsError) throw new Error(itemsError.message)

  return order
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: "ordered" | "cancelled",
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"purchase_orders"> = {
    status,
    ordered_at: status === "ordered" ? new Date().toISOString() : undefined,
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)
}

export async function receivePurchaseOrder(
  id: string,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error } = await supabase.rpc("receive_purchase_order", {
    p_order_id: id,
    p_cafe_id: cafeId,
  })

  if (error) throw new Error(error.message)
}

export async function deletePurchaseOrder(id: string, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error } = await supabase
    .from("purchase_orders")
    .delete()
    .eq("id", id)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)
}
