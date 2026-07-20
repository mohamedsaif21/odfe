"use client"

import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import {
  Plus, Search, X, Loader2, TrendingUp, TrendingDown,
  AlertTriangle, Package, DollarSign,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import {
  fetchInventoryItems, createInventoryItem, updateInventoryItem,
  adjustStock, getStockMovements, deleteInventoryItem,
  type InventoryItemWithMovements,
} from "@/lib/services/inventory.service"
import type { InventoryItem, StockMovement } from "@/types/database"

const UNITS = ["piece", "kg", "g", "l", "ml", "packet", "dozen", "box", "bottle", "cup", "scoop"]

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Create / Edit form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formUnit, setFormUnit] = useState("piece")
  const [formCostPrice, setFormCostPrice] = useState("")
  const [formReorderLevel, setFormReorderLevel] = useState("")
  const [formExpiryDate, setFormExpiryDate] = useState("")
  const [formBatchNumber, setFormBatchNumber] = useState("")
  const [saving, setSaving] = useState(false)

  // Stock adjustment
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [adjustType, setAdjustType] = useState<"in" | "out">("in")
  const [adjustQty, setAdjustQty] = useState("")
  const [adjustNote, setAdjustNote] = useState("")
  const [adjustWastage, setAdjustWastage] = useState(false)
  const [adjusting, setAdjusting] = useState(false)

  // Movement history
  const [movementsItem, setMovementsItem] = useState<InventoryItem | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchInventoryItems())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function openCreate() {
    setEditingId(null)
    setFormName("")
    setFormUnit("piece")
    setFormCostPrice("")
    setFormReorderLevel("")
    setFormExpiryDate("")
    setFormBatchNumber("")
    setShowForm(true)
  }

  function openEdit(item: InventoryItem) {
    setEditingId(item.id)
    setFormName(item.name)
    setFormUnit(item.unit)
    setFormCostPrice(String(item.cost_price))
    setFormReorderLevel(String(item.reorder_level))
    setFormExpiryDate(item.expiry_date ?? "")
    setFormBatchNumber(item.batch_number ?? "")
    setShowForm(true)
  }

  async function handleFormSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await updateInventoryItem(editingId, {
          name: formName.trim(),
          unit: formUnit,
          cost_price: formCostPrice ? Number(formCostPrice) : 0,
          reorder_level: formReorderLevel ? Number(formReorderLevel) : 0,
          expiry_date: formExpiryDate || null,
          batch_number: formBatchNumber.trim() || null,
        })
        setSuccess("Item updated")
      } else {
        await createInventoryItem({
          name: formName.trim(),
          unit: formUnit,
          cost_price: formCostPrice ? Number(formCostPrice) : 0,
          reorder_level: formReorderLevel ? Number(formReorderLevel) : 0,
          expiry_date: formExpiryDate || undefined,
          batch_number: formBatchNumber.trim() || undefined,
        })
        setSuccess("Item created")
      }
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleAdjustStock(event: FormEvent) {
    event.preventDefault()
    if (!adjustItem) return
    const qty = Number(adjustQty)
    if (!qty || qty <= 0) {
      setError("Enter a valid quantity")
      return
    }
    if (adjustType === "out" && qty > Number(adjustItem.stock)) {
      setError(`Not enough stock. Available: ${adjustItem.stock} ${adjustItem.unit}`)
      return
    }
    setAdjusting(true)
    setError(null)
    try {
      await adjustStock(adjustItem.id, qty, adjustType, adjustNote || undefined, undefined, adjustWastage)
      setSuccess(`Stock ${adjustType === "in" ? "added" : "removed"}: ${qty} ${adjustItem.unit}${adjustWastage ? " (wastage)" : ""}`)
      setAdjustItem(null)
      setAdjustQty("")
      setAdjustNote("")
      setAdjustWastage(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stock adjustment failed")
    } finally {
      setAdjusting(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?\nThis will also remove ingredient links.`)) return
    try {
      await deleteInventoryItem(id)
      setSuccess(`"${name}" deleted`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  async function openMovements(item: InventoryItem) {
    setMovementsItem(item)
    setMovementsLoading(true)
    try {
      setMovements(await getStockMovements(item.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load movements")
    } finally {
      setMovementsLoading(false)
    }
  }

  const filtered = items.filter((item) => {
    if (!search.trim()) return true
    return item.name.toLowerCase().includes(search.toLowerCase())
  })

  const isLowStock = (item: InventoryItem) => Number(item.stock) <= Number(item.reorder_level) && Number(item.reorder_level) > 0

  const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"

  return (
    <AdminLayout title="Inventory">
      <PageContainer>
        <PageHeader
          title="Inventory"
          description="Track raw materials, ingredients, and stock levels"
        />

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        {/* Summary cards */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-cream-200 bg-white p-3">
            <p className="text-xs text-gray-500">Total Items</p>
            <p className="text-xl font-bold text-odfe-teal">{items.length}</p>
          </div>
          <div className="rounded-lg border border-cream-200 bg-white p-3">
            <p className="text-xs text-gray-500">Low Stock</p>
            <p className="text-xl font-bold text-red-500">{items.filter(isLowStock).length}</p>
          </div>
          <div className="rounded-lg border border-cream-200 bg-white p-3">
            <p className="text-xs text-gray-500">Active Items</p>
            <p className="text-xl font-bold text-odfe-charcoal">{items.filter((i) => i.is_active).length}</p>
          </div>
        </div>

        {/* Action bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inventory..."
              className={`${inputClass} pl-9`}
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-odfe-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-odfe-teal-light"
          >
            <Plus size={15} /> Add Item
          </button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <form onSubmit={handleFormSubmit} className="mb-4 rounded-lg border border-cream-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-charcoal">
              {editingId ? "Edit Item" : "New Inventory Item"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_140px_140px_140px_140px_140px_auto]">
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Item name" required className={inputClass} />
              <select value={formUnit} onChange={(e) => setFormUnit(e.target.value)} className={inputClass}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="number" step="0.01" min="0" value={formCostPrice} onChange={(e) => setFormCostPrice(e.target.value)} placeholder="Cost price" className={inputClass} />
              <input type="number" step="1" min="0" value={formReorderLevel} onChange={(e) => setFormReorderLevel(e.target.value)} placeholder="Reorder at" className={inputClass} />
              <input type="date" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} className={inputClass} title="Expiry date" />
              <input value={formBatchNumber} onChange={(e) => setFormBatchNumber(e.target.value)} placeholder="Batch #" className={inputClass} />
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          </form>
        )}

        {/* Inventory table */}
        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">Stock</th>
                <th className="px-4 py-3 text-center hidden md:table-cell">Reorder At</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Cost</th>
                <th className="px-4 py-3 text-center hidden xl:table-cell">Batch</th>
                <th className="px-4 py-3 text-center hidden xl:table-cell">Expires</th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading inventory...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No items found</td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-cream-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isLowStock(item) && (
                          <AlertTriangle size={14} className="shrink-0 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={isLowStock(item) ? "font-semibold text-red-600" : ""}>
                        {Number(item.stock).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {Number(item.reorder_level) > 0 ? Number(item.reorder_level).toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      ₹{Number(item.cost_price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center hidden xl:table-cell">
                      <span className="text-xs text-gray-500">{item.batch_number || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden xl:table-cell">
                      {item.expiry_date ? (
                        <span className={`text-xs ${new Date(item.expiry_date) < new Date() ? "text-red-500 font-semibold" : "text-gray-500"}`}>
                          {new Date(item.expiry_date).toLocaleDateString()}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openMovements(item)}
                          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-50">
                          History
                        </button>
                        <button onClick={() => setAdjustItem(item)}
                          className="rounded px-2 py-1 text-xs text-odfe-teal hover:bg-odfe-teal/5">
                          Stock
                        </button>
                        <button onClick={() => openEdit(item)}
                          className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(item.id, item.name)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Stock Adjustment Modal */}
        {adjustItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form onSubmit={handleAdjustStock} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h2 className="font-semibold">Adjust Stock</h2>
                <button type="button" onClick={() => { setAdjustItem(null); setError(null) }}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <p className="text-sm"><strong>{adjustItem.name}</strong> — Current: {Number(adjustItem.stock).toFixed(1)} {adjustItem.unit}</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setAdjustType("in")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium ${adjustType === "in" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"}`}>
                    <TrendingUp size={15} /> Add Stock
                  </button>
                  <button type="button" onClick={() => setAdjustType("out")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium ${adjustType === "out" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-500"}`}>
                    <TrendingDown size={15} /> Remove
                  </button>
                </div>
                <input type="number" step="0.01" min="0.01" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="Quantity" required className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal" />
                <input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Note (optional)" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal" />
                {adjustType === "out" && (
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={adjustWastage} onChange={(e) => setAdjustWastage(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-odfe-teal" />
                    Mark as wastage
                  </label>
                )}
                <Button type="submit" disabled={adjusting} className="w-full">
                  {adjusting ? "Processing..." : `Confirm ${adjustType === "in" ? "Addition" : "Removal"}`}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Movement History Modal */}
        {movementsItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
                <h2 className="font-semibold">{movementsItem.name} — History</h2>
                <button type="button" onClick={() => setMovementsItem(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="overflow-y-auto px-5 py-4 space-y-2">
                {movementsLoading ? (
                  <div className="flex h-20 items-center justify-center"><Loader2 size={20} className="animate-spin text-odfe-teal" /></div>
                ) : movements.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-6">No stock movements recorded</p>
                ) : (
                  movements.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-cream-100 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        {m.type === "in" ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700"><TrendingUp size={12} /></span>
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700"><TrendingDown size={12} /></span>
                        )}
                        <div>
                          <p className="font-medium">{m.type === "in" ? "+" : "-"}{Number(m.quantity).toFixed(1)} {movementsItem.unit}</p>
                          {m.note && <p className="text-xs text-gray-400">{m.note}</p>}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminLayout>
  )
}
