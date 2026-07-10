import { createClient } from "@/lib/supabase/client"
import type { DbClient } from "./_shared"
import type { Product, ProductCategory, SelfOrderToken } from "@/types/database"

type OrderListItem = {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
}

type OrderWithItems = {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
  order_items: Array<{
    product_name: string
    quantity: number
    unit_price: number
  }>
}

type TokenQueryResult = {
  cafe_id: string
  table_id: string
  is_active: boolean
  cafe_tables: { label: string }
}

export interface ResolvedToken {
  cafeId: string
  tableId: string
  tableLabel: string
  isActive: boolean
}

export interface PublicMenuProduct {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  categoryId: string
}

export interface PublicMenuCategory {
  id: string
  name: string
  icon: string | null
  products: PublicMenuProduct[]
}

/**
 * Resolve a self-order QR token to get cafe and table context.
 */
export async function resolveSelfOrderToken(
  token: string,
  client?: DbClient
): Promise<ResolvedToken> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase
    .from("self_order_tokens")
    .select("cafe_id, table_id, is_active, cafe_tables!inner(label)")
    .eq("token", token)
    .single()

  if (error || !data) {
    throw new Error("Invalid or expired QR code")
  }

  const row = data as unknown as TokenQueryResult

  if (!row.is_active) {
    throw new Error("This QR code is no longer active")
  }

  return {
    cafeId: row.cafe_id,
    tableId: row.table_id,
    tableLabel: row.cafe_tables.label,
    isActive: row.is_active,
  }
}

/**
 * Fetch public menu for a cafe (only available products).
 */
export async function fetchPublicMenu(
  cafeId: string,
  client?: DbClient
): Promise<PublicMenuCategory[]> {
  const supabase = client ?? createClient()

  const [productsResult, categoriesResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("cafe_id", cafeId)
      .eq("is_available", true)
      .order("sort_order"),
    supabase
      .from("product_categories")
      .select("*")
      .eq("cafe_id", cafeId)
      .eq("is_active", true)
      .order("sort_order"),
  ])

  if (productsResult.error) throw new Error(productsResult.error.message)
  if (categoriesResult.error) throw new Error(categoriesResult.error.message)

  const products = (productsResult.data ?? []).map((p: Product) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    imageUrl: p.image_url,
    categoryId: p.category_id,
  }))

  return (categoriesResult.data ?? []).map((cat: ProductCategory) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    products: products.filter((p) => p.categoryId === cat.id),
  }))
}

/**
 * Create a self-order (customer order).
 * Uses the same atomic RPC as POS orders.
 */
export async function createSelfOrder(input: {
  cafeId: string
  customerId: string
  tableId: string
  tableLabel: string
  lines: Array<{
    productId: string
    productName: string
    unitPrice: number
    quantity: number
    taxRate: number
    discount: number
    notes: string | null
  }>
  subtotal: number
  total: number
  notes?: string | null
}): Promise<{ orderId: string; orderNumber: string }> {
  const supabase = createClient()

  const { data, error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>)(
    "create_order_with_kitchen_ticket",
    {
      p_cafe_id: input.cafeId,
      p_employee_id: null,
      p_customer_id: input.customerId,
      p_table_id: input.tableId,
      p_table_label: input.tableLabel,
      p_session_id: null,
      p_lines: input.lines,
      p_subtotal: input.subtotal,
      p_discount_total: 0,
      p_tax_total: 0,
      p_total: input.total,
      p_coupon_code: null,
      p_notes: input.notes ?? null,
    }
  )

  if (error) {
    if (error.message?.includes("function") && error.message?.includes("not found")) {
      throw new Error(
        "The order creation database function is not available. Apply the Supabase SQL migration first."
      )
    }
    throw new Error(error.message)
  }

  const result = data as { orderId: string; orderNumber: string }
  return result
}

/**
 * Fetch orders placed by a customer.
 */
export async function fetchCustomerOrders(
  customerId: string,
  client?: DbClient
): Promise<Array<{
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
}>> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .returns<OrderListItem[]>()

  if (error) throw new Error(error.message)

  return (data ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    total: o.total,
    createdAt: o.created_at,
  }))
}

/**
 * Fetch a single order with items for a customer.
 */
export async function fetchCustomerOrder(
  orderId: string,
  customerId: string,
  client?: DbClient
): Promise<{
  id: string
  orderNumber: string
  status: string
  total: number
  items: Array<{ productName: string; quantity: number; unitPrice: number }>
  createdAt: string
} | null> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at, order_items(product_name, quantity, unit_price)")
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .single()

  if (error) return null

  const row = data as unknown as OrderWithItems

  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    total: row.total,
    items: (row.order_items ?? []).map((i) => ({
      productName: i.product_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
    })),
    createdAt: row.created_at,
  }
}
