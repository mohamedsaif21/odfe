import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Customer } from "@/types/database"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"

export type CustomerDetail = Customer & {
  recentOrders: Array<{
    id: string
    orderNumber: string
    status: string
    total: number
    createdAt: string
  }>
  favoriteItems: Array<{
    name: string
    quantity: number
    totalSpent: number
  }>
  orderCount: number
  lifetimeSpend: number
}

export async function fetchCustomers(
  search?: string,
  filters?: { status?: "active" | "inactive" | "all" },
  client?: DbClient
): Promise<Customer[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  let query = supabase
    .from("customers")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  if (filters?.status === "active") {
    query = query.eq("is_active", true)
  } else if (filters?.status === "inactive") {
    query = query.eq("is_active", false)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCustomer(
  input: { name: string; email?: string; phone?: string; address?: string; birthday?: string },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const payload: InsertTables<"customers"> = {
    cafe_id: cafeId,
    profile_id: null,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    address: input.address ?? null,
    birthday: input.birthday ?? null,
    is_active: true,
    loyalty_points: 0,
    visit_count: 0,
    lifetime_spend: 0,
  }

  const { data, error } = await supabase
    .from("customers")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCustomer(
  id: string,
  input: Partial<{ name: string; email: string; phone: string; address: string; birthday: string; is_active: boolean }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"customers"> = input

  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getCustomerDetail(
  customerId: string,
  client?: DbClient
): Promise<CustomerDetail> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .eq("cafe_id", cafeId)
    .single()

  if (customerError || !customer) throw new Error(customerError?.message ?? "Customer not found")

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at")
    .eq("customer_id", customerId)
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })
    .limit(20)

  if (ordersError) throw new Error(ordersError.message)

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_name, quantity, line_total")
    .eq("cafe_id", cafeId)
    .in("order_id", (orders ?? []).map((o) => o.id))

  if (itemsError) throw new Error(itemsError.message)

  const productMap = new Map<string, { quantity: number; totalSpent: number }>()
  ;(items ?? []).forEach((item) => {
    const entry = productMap.get(item.product_name) ?? { quantity: 0, totalSpent: 0 }
    entry.quantity += item.quantity
    entry.totalSpent += Number(item.line_total)
    productMap.set(item.product_name, entry)
  })

  const orderCount = orders?.length ?? 0
  const lifetimeSpend = (orders ?? []).reduce((sum, o) => sum + Number(o.total), 0)

  return {
    ...customer,
    recentOrders: (orders ?? []).slice(0, 10).map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      total: Number(o.total),
      createdAt: o.created_at,
    })),
    favoriteItems: Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
    orderCount,
    lifetimeSpend,
  }
}

export async function deactivateCustomer(
  customerId: string,
  client?: DbClient
) {
  return updateCustomer(customerId, { is_active: false }, client)
}

export async function activateCustomer(
  customerId: string,
  client?: DbClient
) {
  return updateCustomer(customerId, { is_active: true }, client)
}

export async function mergeCustomers(
  survivorId: string,
  mergedId: string,
  client?: DbClient
): Promise<string> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message?: string } | null }>)("merge_customers", {
    p_survivor_id: survivorId,
    p_merged_id: mergedId,
    p_cafe_id: cafeId,
  })

  if (error) throw new Error(error.message)
  return data as string
}

export async function refreshCustomerStats(
  customerId: string,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error } = await (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ error: { message?: string } | null }>)("refresh_customer_stats", {
    p_customer_id: customerId,
    p_cafe_id: cafeId,
  })

  if (error) throw new Error(error.message)
}

export async function addLoyaltyPoints(
  customerId: string,
  points: number,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const { data, error } = await (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message?: string } | null }>)("add_loyalty_points", {
    p_customer_id: customerId,
    p_cafe_id: cafeId,
    p_points: points,
  })

  if (error) throw new Error(error.message)
  return data
}
