"use client"

import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import {
  Plus, Search, X, DollarSign, TrendingDown, Calendar,
  PieChart, Repeat, Filter,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Alert } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  fetchExpenses, createExpense, updateExpense, deleteExpense,
  fetchExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
  getExpenseStats, getProfitLoss,
  type ExpenseWithCategory,
} from "@/lib/services/expense.service"
import type { ExpenseCategory } from "@/types/database"

const RECURRING_OPTIONS = [
  { value: "", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
]

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<"expenses" | "categories" | "pnl">("expenses")
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [stats, setStats] = useState<{ totalThisMonth: number; totalToday: number; categoryCount: number; recurringCount: number } | null>(null)
  const [pnl, setPnl] = useState<{ totalRevenue: number; totalExpenses: number; netProfit: number; expenseBreakdown: Array<{ category: string; total: number }> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [pnlPeriod, setPnlPeriod] = useState<"today" | "week" | "month" | "custom">("month")
  const [pnlStart, setPnlStart] = useState("")
  const [pnlEnd, setPnlEnd] = useState("")

  // Expense form
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null)
  const [formCategory, setFormCategory] = useState("")
  const [formAmount, setFormAmount] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formRecurring, setFormRecurring] = useState(false)
  const [formFrequency, setFormFrequency] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [saving, setSaving] = useState(false)

  // Category form
  const [showCatForm, setShowCatForm] = useState(false)
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null)
  const [catName, setCatName] = useState("")
  const [catDesc, setCatDesc] = useState("")

  // Delete
  const [deletingExpense, setDeletingExpense] = useState<ExpenseWithCategory | null>(null)
  const [deletingCat, setDeletingCat] = useState<ExpenseCategory | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [expData, catData, statsData] = await Promise.all([
        fetchExpenses(),
        fetchExpenseCategories(),
        getExpenseStats(),
      ])
      setExpenses(expData)
      setCategories(catData)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(t)
  }, [success])

  function getDateRange(period: string) {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    if (period === "today") {
      const d = now.toISOString().slice(0, 10)
      return { start: d, end: d }
    }
    if (period === "week") {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) }
    }
    if (period === "month") {
      return { start: `${y}-${String(m + 1).padStart(2, "0")}-01`, end: now.toISOString().slice(0, 10) }
    }
    return { start: pnlStart, end: pnlEnd }
  }

  async function loadPnl() {
    const range = getDateRange(pnlPeriod)
    if (pnlPeriod === "custom" && (!range.start || !range.end)) {
      setError("Select start and end dates")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getProfitLoss(range.start, range.end)
      setPnl(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load P&L")
    } finally {
      setLoading(false)
    }
  }

  const filteredExpenses = expenses.filter((e) => {
    if (search && !e.description.toLowerCase().includes(search.toLowerCase()) && !e.category?.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory && e.category_id !== filterCategory) return false
    if (filterStartDate && e.expense_date < filterStartDate) return false
    if (filterEndDate && e.expense_date > filterEndDate) return false
    return true
  })

  // Expense form
  function expenseFormDefaults(data?: ExpenseWithCategory) {
    setFormCategory(data?.category_id ?? (categories[0]?.id ?? ""))
    setFormAmount(data ? String(data.amount) : "")
    setFormDescription(data?.description ?? "")
    setFormDate(data?.expense_date ?? new Date().toISOString().slice(0, 10))
    setFormRecurring(data?.is_recurring ?? false)
    setFormFrequency(data?.recurring_frequency ?? "")
    setFormNotes(data?.notes ?? "")
  }

  function openCreateExpense() {
    setEditingExpense(null)
    expenseFormDefaults()
    setShowForm(true)
  }

  function openEditExpense(expense: ExpenseWithCategory) {
    setEditingExpense(expense)
    expenseFormDefaults(expense)
    setShowForm(true)
  }

  async function handleExpenseSubmit(event: FormEvent) {
    event.preventDefault()
    if (!formCategory || !formDescription.trim()) { setError("Category and description are required"); return }
    const amount = Number(formAmount)
    if (!amount || amount <= 0) { setError("Amount must be greater than zero"); return }
    setSaving(true)
    setError(null)
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          category_id: formCategory,
          amount,
          description: formDescription.trim(),
          expense_date: formDate,
          is_recurring: formRecurring,
          recurring_frequency: formRecurring ? (formFrequency as "daily" | "weekly" | "monthly" | "yearly") || null : null,
          notes: formNotes.trim() || undefined,
        })
        setSuccess("Expense updated")
      } else {
        await createExpense({
          category_id: formCategory,
          amount,
          description: formDescription.trim(),
          expense_date: formDate,
          is_recurring: formRecurring,
          recurring_frequency: formRecurring ? (formFrequency as "daily" | "weekly" | "monthly" | "yearly") || undefined : undefined,
          notes: formNotes.trim() || undefined,
        })
        setSuccess("Expense created")
      }
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed")
    } finally {
      setSaving(false)
    }
  }

  // Category form
  function openCreateCategory() {
    setEditingCat(null)
    setCatName(""); setCatDesc("")
    setShowCatForm(true)
  }

  function openEditCategory(cat: ExpenseCategory) {
    setEditingCat(cat)
    setCatName(cat.name); setCatDesc(cat.description ?? "")
    setShowCatForm(true)
  }

  async function handleCatSubmit(event: FormEvent) {
    event.preventDefault()
    if (!catName.trim()) { setError("Category name is required"); return }
    setSaving(true)
    setError(null)
    try {
      if (editingCat) {
        await updateExpenseCategory(editingCat.id, {
          name: catName.trim(),
          description: catDesc.trim() || undefined,
        })
        setSuccess("Category updated")
      } else {
        await createExpenseCategory({
          name: catName.trim(),
          description: catDesc.trim() || undefined,
        })
        setSuccess("Category created")
      }
      setShowCatForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteExpense() {
    if (!deletingExpense) return
    try {
      await deleteExpense(deletingExpense.id)
      setSuccess("Expense deleted")
      setDeletingExpense(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  async function handleDeleteCategory() {
    if (!deletingCat) return
    setSaving(true)
    try {
      await deleteExpenseCategory(deletingCat.id)
      setSuccess(`"${deletingCat.name}" deactivated`)
      setDeletingCat(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full rounded-lg border border-odfe-charcoal/10 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"

  return (
    <AdminLayout title="Expenses">
      <PageContainer>
        <PageHeader title="Expenses" description="Track business expenses and view profit & loss" />

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        {/* Stats */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-3">
            <p className="text-xs text-odfe-charcoal/40">Today</p>
            <p className="text-xl font-bold text-red-500">₹{stats?.totalToday.toFixed(2) ?? "0.00"}</p>
          </div>
          <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-3">
            <p className="text-xs text-odfe-charcoal/40">This Month</p>
            <p className="text-xl font-bold text-odfe-charcoal">₹{stats?.totalThisMonth.toFixed(2) ?? "0.00"}</p>
          </div>
          <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-3">
            <p className="text-xs text-odfe-charcoal/40">Categories</p>
            <p className="text-xl font-bold text-odfe-teal">{stats?.categoryCount ?? 0}</p>
          </div>
          <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-3">
            <p className="text-xs text-odfe-charcoal/40">Recurring</p>
            <p className="text-xl font-bold text-amber-600">{stats?.recurringCount ?? 0}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-odfe-charcoal/10">
          <button onClick={() => setActiveTab("expenses")}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition ${activeTab === "expenses" ? "border-odfe-teal text-odfe-teal" : "border-transparent text-odfe-charcoal/40 hover:text-odfe-charcoal/60"}`}>
            <DollarSign size={15} className="inline mr-1" /> Expenses
          </button>
          <button onClick={() => setActiveTab("categories")}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition ${activeTab === "categories" ? "border-odfe-teal text-odfe-teal" : "border-transparent text-odfe-charcoal/40 hover:text-odfe-charcoal/60"}`}>
            <PieChart size={15} className="inline mr-1" /> Categories
          </button>
          <button onClick={() => setActiveTab("pnl")}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition ${activeTab === "pnl" ? "border-odfe-teal text-odfe-teal" : "border-transparent text-odfe-charcoal/40 hover:text-odfe-charcoal/60"}`}>
            <TrendingDown size={15} className="inline mr-1" /> Profit & Loss
          </button>
        </div>

        {activeTab === "expenses" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-odfe-charcoal/40" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className={`${inputClass} pl-9`} />
              </div>
              <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-40">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className={`${inputClass} w-36`} title="Start date" />
              <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className={`${inputClass} w-36`} title="End date" />
              <button onClick={openCreateExpense} className="flex items-center gap-1.5 rounded-lg bg-odfe-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-odfe-teal-light">
                <Plus size={15} /> Add Expense
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleExpenseSubmit} className="mb-4 rounded-lg border border-odfe-charcoal/10 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold text-odfe-charcoal">{editingExpense ? "Edit Expense" : "New Expense"}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_140px_1fr_160px_auto]">
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} required className={inputClass}>
                    <option value="">Select category</option>
                    {categories.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input type="number" step="0.01" min="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="Amount *" required className={inputClass} />
                  <input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Description *" required className={inputClass} />
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={inputClass} />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-sm text-odfe-charcoal/60">
                      <input type="checkbox" checked={formRecurring} onChange={(e) => setFormRecurring(e.target.checked)} className="h-4 w-4 rounded border-odfe-charcoal/20 text-odfe-teal" />
                      <Repeat size={12} /> Recurring
                    </label>
                    {formRecurring && (
                      <select value={formFrequency} onChange={(e) => setFormFrequency(e.target.value)} className={`${inputClass} w-28`}>
                        {RECURRING_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notes (optional)" className={inputClass} />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            )}

            <div className="overflow-hidden rounded-lg border border-odfe-charcoal/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-odfe-charcoal/5 text-xs uppercase text-odfe-charcoal/60">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Category</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-odfe-charcoal/5">
                  {loading && !expenses.length ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-odfe-charcoal/40">Loading expenses...</td></tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-odfe-charcoal/40">No expenses found</td></tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-odfe-charcoal/[0.02]">
                        <td className="px-4 py-3 text-odfe-charcoal/60">{new Date(e.expense_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-odfe-charcoal">{e.description}</p>
                            {e.notes && <p className="text-xs text-odfe-charcoal/40">{e.notes}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-odfe-charcoal/60">{e.category?.name ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">₹{Number(e.amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {e.is_recurring ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Repeat size={10} /> {e.recurring_frequency}</span>
                          ) : (
                            <span className="text-xs text-odfe-charcoal/40">One-time</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditExpense(e)} className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                            <button onClick={() => setDeletingExpense(e)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-xs text-odfe-charcoal/40">
              Showing {filteredExpenses.length} of {expenses.length} expenses
            </p>
          </>
        )}

        {activeTab === "categories" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-odfe-charcoal/60">{categories.length} categories</p>
              <button onClick={openCreateCategory} className="flex items-center gap-1.5 rounded-lg bg-odfe-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-odfe-teal-light">
                <Plus size={15} /> Add Category
              </button>
            </div>

            {showCatForm && (
              <form onSubmit={handleCatSubmit} className="mb-4 rounded-lg border border-odfe-charcoal/10 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold text-odfe-charcoal">{editingCat ? "Edit Category" : "New Category"}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Category name *" required className={inputClass} />
                  <input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Description" className={inputClass} />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                  <Button type="button" variant="outline" onClick={() => setShowCatForm(false)}>Cancel</Button>
                </div>
              </form>
            )}

            <div className="grid gap-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-odfe-charcoal/10 bg-white px-4 py-3">
                  <div>
                    <p className="font-medium text-odfe-charcoal">{c.name}</p>
                    {c.description && <p className="text-xs text-odfe-charcoal/40">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {c.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-500"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inactive</span>
                    )}
                    <button onClick={() => openEditCategory(c)} className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                    {c.is_active && (
                      <button onClick={() => setDeletingCat(c)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Deactivate</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "pnl" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Select value={pnlPeriod} onChange={(e) => setPnlPeriod(e.target.value as typeof pnlPeriod)} className="w-36">
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom</option>
              </Select>
              {pnlPeriod === "custom" && (
                <>
                  <input type="date" value={pnlStart} onChange={(e) => setPnlStart(e.target.value)} className={`${inputClass} w-36`} title="Start date" />
                  <input type="date" value={pnlEnd} onChange={(e) => setPnlEnd(e.target.value)} className={`${inputClass} w-36`} title="End date" />
                </>
              )}
              <Button onClick={loadPnl} disabled={loading}>
                {loading ? "Loading..." : "Generate"}
              </Button>
            </div>

            {pnl && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-4">
                    <p className="text-xs text-odfe-charcoal/40">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">₹{pnl.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-4">
                    <p className="text-xs text-odfe-charcoal/40">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-500">₹{pnl.totalExpenses.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-4">
                    <p className="text-xs text-odfe-charcoal/40">Net Profit</p>
                    <p className={`text-2xl font-bold ${pnl.netProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {pnl.netProfit >= 0 ? "+" : ""}₹{pnl.netProfit.toFixed(2)}
                    </p>
                  </div>
                </div>

                {pnl.expenseBreakdown.length > 0 && (
                  <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-4">
                    <h3 className="mb-3 text-sm font-semibold text-odfe-charcoal">Expense Breakdown</h3>
                    <div className="space-y-2">
                      {pnl.expenseBreakdown.map((item) => {
                        const pct = pnl.totalExpenses > 0 ? (item.total / pnl.totalExpenses) * 100 : 0
                        return (
                          <div key={item.category}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="text-odfe-charcoal">{item.category}</span>
                              <div className="text-right">
                                <span className="font-medium text-odfe-charcoal">₹{item.total.toFixed(2)}</span>
                                <span className="ml-2 text-xs text-odfe-charcoal/40">({pct.toFixed(1)}%)</span>
                              </div>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-odfe-charcoal/5">
                              <div
                                className="h-full rounded-full bg-odfe-teal transition-all"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <ConfirmDialog
          open={!!deletingExpense}
          title="Delete expense"
          description={`Delete "${deletingExpense?.description}"? This cannot be undone.`}
          confirmLabel="Delete"
          isLoading={false}
          onConfirm={handleDeleteExpense}
          onCancel={() => setDeletingExpense(null)}
        />
        <ConfirmDialog
          open={!!deletingCat}
          title="Deactivate category"
          description={`Deactivate "${deletingCat?.name}"? Existing expenses are preserved.`}
          confirmLabel="Deactivate"
          isLoading={saving}
          onConfirm={handleDeleteCategory}
          onCancel={() => setDeletingCat(null)}
        />
      </PageContainer>
    </AdminLayout>
  )
}
