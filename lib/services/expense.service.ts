import { createClient } from "@/lib/supabase/client"
import { getCafeId, getAuthenticatedProfile } from "./_shared"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"
import type { Expense, ExpenseCategory } from "@/types/database"

// ─── Expense Categories ──────────────────────────────────────────────────

export async function fetchExpenseCategories(client?: DbClient): Promise<ExpenseCategory[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchActiveExpenseCategories(client?: DbClient): Promise<ExpenseCategory[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createExpenseCategory(
  input: { name: string; description?: string },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  const payload: InsertTables<"expense_categories"> = {
    cafe_id: cafeId,
    name: input.name,
    description: input.description ?? null,
    is_active: true,
    created_by: profile.id,
  }

  const { data, error } = await supabase
    .from("expense_categories")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateExpenseCategory(
  id: string,
  input: Partial<{ name: string; description: string; is_active: boolean }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"expense_categories"> = input

  const { data, error } = await supabase
    .from("expense_categories")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteExpenseCategory(id: string, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error } = await supabase
    .from("expense_categories")
    .update({ is_active: false })
    .eq("id", id)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)
}

// ─── Expenses ────────────────────────────────────────────────────────────

export type ExpenseWithCategory = Expense & {
  category: ExpenseCategory | null
}

export async function fetchExpenses(
  options?: {
    startDate?: string
    endDate?: string
    categoryId?: string
    search?: string
  },
  client?: DbClient
): Promise<ExpenseWithCategory[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  let query = supabase
    .from("expenses")
    .select("*, category:expense_categories(*)")
    .eq("cafe_id", cafeId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (options?.startDate) {
    query = query.gte("expense_date", options.startDate)
  }
  if (options?.endDate) {
    query = query.lte("expense_date", options.endDate)
  }
  if (options?.categoryId) {
    query = query.eq("category_id", options.categoryId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let results = (data ?? []) as unknown as ExpenseWithCategory[]

  if (options?.search) {
    const q = options.search.toLowerCase()
    results = results.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.category?.name.toLowerCase().includes(q)
    )
  }

  return results
}

export async function createExpense(
  input: {
    category_id: string
    amount: number
    description: string
    expense_date: string
    is_recurring?: boolean
    recurring_frequency?: "daily" | "weekly" | "monthly" | "yearly"
    notes?: string
  },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  if (input.amount <= 0) throw new Error("Amount must be greater than zero")
  if (!input.description.trim()) throw new Error("Description is required")

  const payload: InsertTables<"expenses"> = {
    cafe_id: cafeId,
    category_id: input.category_id,
    amount: input.amount,
    description: input.description.trim(),
    expense_date: input.expense_date,
    is_recurring: input.is_recurring ?? false,
    recurring_frequency: input.recurring_frequency ?? null,
    notes: input.notes ?? null,
    created_by: profile.id,
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateExpense(
  id: string,
  input: Partial<{
    category_id: string
    amount: number
    description: string
    expense_date: string
    is_recurring: boolean
    recurring_frequency: "daily" | "weekly" | "monthly" | "yearly" | null
    notes: string
  }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"expenses"> = input

  const { data, error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteExpense(id: string, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)
}

// ─── Profit & Loss ───────────────────────────────────────────────────────

export type ProfitLossData = {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  expenseBreakdown: Array<{ category: string; total: number }>
}

export async function getProfitLoss(
  startDate: string,
  endDate: string,
  client?: DbClient
): Promise<ProfitLossData> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase.rpc("get_profit_loss", {
    p_cafe_id: cafeId,
    p_start_date: startDate,
    p_end_date: endDate,
  })

  if (error) throw new Error(error.message)

  const result = Array.isArray(data) ? data[0] : data
  if (!result) {
    return { totalRevenue: 0, totalExpenses: 0, netProfit: 0, expenseBreakdown: [] }
  }

  let expenseBreakdown: Array<{ category: string; total: number }> = []
  try {
    expenseBreakdown = typeof result.expense_breakdown === "string"
      ? JSON.parse(result.expense_breakdown)
      : (result.expense_breakdown ?? [])
  } catch {
    expenseBreakdown = []
  }

  return {
    totalRevenue: Number(result.total_revenue),
    totalExpenses: Number(result.total_expenses),
    netProfit: Number(result.net_profit),
    expenseBreakdown,
  }
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────

export async function getExpenseStats(
  client?: DbClient
): Promise<{
  totalThisMonth: number
  totalToday: number
  categoryCount: number
  recurringCount: number
}> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStartStr = monthStart.toISOString().slice(0, 10)

  const [allRes, catRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("amount, expense_date, is_recurring")
      .eq("cafe_id", cafeId),
    supabase
      .from("expense_categories")
      .select("id")
      .eq("cafe_id", cafeId)
      .eq("is_active", true),
  ])

  const allExpenses = allRes.data ?? []

  const totalToday = allExpenses
    .filter((e) => e.expense_date === today)
    .reduce((s, e) => s + Number(e.amount), 0)

  const totalThisMonth = allExpenses
    .filter((e) => e.expense_date >= monthStartStr)
    .reduce((s, e) => s + Number(e.amount), 0)

  return {
    totalThisMonth,
    totalToday,
    categoryCount: catRes.data?.length ?? 0,
    recurringCount: allExpenses.filter((e) => e.is_recurring).length,
  }
}
