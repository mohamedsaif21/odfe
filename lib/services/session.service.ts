import { createClient } from "@/lib/supabase/client"
import type { PosSession } from "@/types/database"

export type SessionStats = {
  totalOrders: number
  totalRevenue: number
}

export async function getActiveSession(
  cafeId: string,
  employeeId: string
): Promise<PosSession | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("pos_sessions")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("employee_id", employeeId)
    .is("closed_at", null)
    .order("opened_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function openSession(
  cafeId: string,
  employeeId: string,
  openingCash: number
): Promise<PosSession> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("pos_sessions")
    .insert({
      cafe_id: cafeId,
      employee_id: employeeId,
      opened_at: new Date().toISOString(),
      closed_at: null,
      opening_cash: openingCash,
      closing_cash: null,
      total_orders: 0,
      total_revenue: 0,
      notes: null,
    })
    .select("*")
    .single()

  if (error || !data) throw new Error(error?.message ?? "Failed to open session")
  return data
}

export async function closeSession(
  sessionId: string,
  cafeId: string,
  closingCash: number,
  notes?: string | null
): Promise<PosSession> {
  const supabase = createClient()

  const stats = await computeSessionStats(sessionId, cafeId)

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("pos_sessions")
    .update({
      closed_at: now,
      closing_cash: closingCash,
      total_orders: stats.totalOrders,
      total_revenue: stats.totalRevenue,
      notes: notes ?? null,
    })
    .eq("id", sessionId)
    .eq("cafe_id", cafeId)
    .select("*")
    .single()

  if (error || !data) throw new Error(error?.message ?? "Failed to close session")
  return data
}

export async function computeSessionStats(
  sessionId: string,
  cafeId: string
): Promise<SessionStats> {
  const supabase = createClient()

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, total, status")
    .eq("cafe_id", cafeId)
    .eq("session_id", sessionId)
    .in("status", ["paid", "completed"])

  if (ordersError) throw new Error(ordersError.message)

  const totalOrders = orders?.length ?? 0
  const totalRevenue = (orders ?? []).reduce(
    (sum, o) => sum + Number(o.total),
    0
  )

  return { totalOrders, totalRevenue }
}

export async function getSessionById(
  sessionId: string
): Promise<PosSession | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("pos_sessions")
    .select("*")
    .eq("id", sessionId)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}
