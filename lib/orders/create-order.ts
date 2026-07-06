import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { generateOrderNumber } from "@/lib/utils/format"

type DbClient = SupabaseClient<Database>

type OrderItemInput = {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  discount: number
  taxRate: number
  notes?: string | null
}

export type CreateOrderInput = {
  cafeId: string
  tableId?: string | null
  customerId?: string | null
  employeeId?: string | null
  notes?: string | null
  items: OrderItemInput[]
}

export type CreateOrderResult = {
  orderId: string
  orderNumber: string
}

/**
 * Foundation helper for full POS order creation.
 * TODO: implement the actual transaction flow with Supabase RPC to atomically create:
 * 1) orders
 * 2) order_items
 * 3) kitchen_tickets
 * 4) kitchen_ticket_items
 * 5) payments (if payment is captured at creation time)
 */
export async function createOrderFoundation(
  _supabase: DbClient,
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  if (!input.items.length) {
    throw new Error("Cannot create order without items")
  }

  // TODO: Replace temporary IDs with DB-created IDs once RPC is available.
  const orderNumber = generateOrderNumber()
  const orderId = `tmp_${Date.now()}`

  return {
    orderId,
    orderNumber,
  }
}
