import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Payment } from "@/types/database"
import type { PaymentMethodType } from "@/types/database"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"

type PaymentWithOrder = Payment & {
  orders: {
    order_number: string
    table_id: string | null
    customer_id: string | null
  } | null
}

export async function fetchPayments(dateFrom?: string, dateTo?: string, client?: DbClient): Promise<PaymentWithOrder[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  let query = supabase
    .from("payments")
    .select("*, orders(order_number, table_id, customer_id)")
    .eq("cafe_id", cafeId)
    .order("paid_at", { ascending: false })

  if (dateFrom) query = query.gte("paid_at", dateFrom)
  if (dateTo) query = query.lte("paid_at", dateTo)

  const { data, error } = await query.returns<PaymentWithOrder[]>()

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchPaymentMethods(client?: DbClient): Promise<{ id: string; type: PaymentMethodType; label: string; is_active: boolean }[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, type, label, is_active")
    .eq("cafe_id", cafeId)
    .eq("is_active", true)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function refundPayment(paymentId: string, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"payments"> = { status: "refunded" }

  const { data, error } = await supabase
    .from("payments")
    .update(updates)
    .eq("id", paymentId)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getDailyRevenue(date: string, client?: DbClient): Promise<number> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const startOfDay = `${date}T00:00:00Z`
  const endOfDay = `${date}T23:59:59Z`

  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("cafe_id", cafeId)
    .eq("status", "completed")
    .gte("paid_at", startOfDay)
    .lte("paid_at", endOfDay)

  if (error) throw new Error(error.message)
  return (data ?? []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
}
