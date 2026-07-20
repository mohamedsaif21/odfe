"use client"

import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Plus, Search, X, Loader2, Building2, Package, Eye, Truck, CheckCircle, XCircle, FileText } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  fetchPurchaseOrders, createPurchaseOrder,
  updatePurchaseOrderStatus, receivePurchaseOrder, deletePurchaseOrder,
  type PurchaseOrderWithDetails,
} from "@/lib/services/purchase.service"
import { fetchActiveSuppliers } from "@/lib/services/supplier.service"
import { fetchInventoryItems } from "@/lib/services/inventory.service"
import type { Supplier, InventoryItem } from "@/types/database"

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  draft: { label: "Draft", class: "bg-gray-100 text-gray-700" },
  ordered: { label: "Ordered", class: "bg-blue-100 text-blue-700" },
  received: { label: "Received", class: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", class: "bg-red-100 text-red-700" },
}

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrderWithDetails[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [formSupplierId, setFormSupplierId] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [formLines, setFormLines] = useState<Array<{ item_id: string; quantity: string; unit_cost: string }>>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [saving, setSaving] = useState(false)

  const [viewOrder, setViewOrder] = useState<PurchaseOrderWithDetails | null>(null)
  const [confirmReceive, setConfirmReceive] = useState<PurchaseOrderWithDetails | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<PurchaseOrderWithDetails | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<PurchaseOrderWithDetails | null>(null)
  const [processing, setProcessing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOrders(await fetchPurchaseOrders())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase orders")
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

  async function openCreate() {
    setFormSupplierId(""); setFormNotes(""); setFormLines([])
    setError(null)
    try {
      const [sup, items] = await Promise.all([fetchActiveSuppliers(), fetchInventoryItems()])
      setSuppliers(sup)
      setInventoryItems(items.filter((i) => i.is_active))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
      return
    }
    setShowForm(true)
  }

  function addLine() {
    setFormLines((prev) => [...prev, { item_id: "", quantity: "1", unit_cost: "0" }])
  }

  function updateLine(index: number, field: string, value: string) {
    setFormLines((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function removeLine(index: number) {
    setFormLines((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const validLines = formLines.filter((l) => l.item_id && Number(l.quantity) > 0)
    if (validLines.length === 0) { setError("Add at least one item"); return }

    setSaving(true)
    setError(null)
    try {
      await createPurchaseOrder({
        supplier_id: formSupplierId || undefined,
        notes: formNotes.trim() || undefined,
        items: validLines.map((l) => ({
          item_id: l.item_id,
          quantity: Number(l.quantity),
          unit_cost: Number(l.unit_cost),
        })),
      })
      setSuccess("Purchase order created")
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order")
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkOrdered() {
    if (!confirmCancel) return
    setProcessing(true)
    try {
      await updatePurchaseOrderStatus(confirmCancel.id, "ordered")
      setSuccess(`Order ${confirmCancel.order_number} marked as ordered`)
      setConfirmCancel(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order")
    } finally {
      setProcessing(false)
    }
  }

  async function handleReceive() {
    if (!confirmReceive) return
    setProcessing(true)
    try {
      await receivePurchaseOrder(confirmReceive.id)
      setSuccess(`Order ${confirmReceive.order_number} received — stock updated`)
      setConfirmReceive(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive order")
    } finally {
      setProcessing(false)
    }
  }

  async function handleCancel() {
    if (!confirmCancel) return
    setProcessing(true)
    try {
      await updatePurchaseOrderStatus(confirmCancel.id, "cancelled")
      setSuccess(`Order ${confirmCancel.order_number} cancelled`)
      setConfirmCancel(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order")
    } finally {
      setProcessing(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setProcessing(true)
    try {
      await deletePurchaseOrder(confirmDelete.id)
      setSuccess(`Order ${confirmDelete.order_number} deleted`)
      setConfirmDelete(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete order")
    } finally {
      setProcessing(false)
    }
  }

  const filtered = orders.filter((o) =>
    !search.trim() ||
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    o.supplier?.name.toLowerCase().includes(search.toLowerCase())
  )

  const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"

  return (
    <AdminLayout title="Purchase Orders">
      <PageContainer>
        <PageHeader title="Purchase Orders" description="Order stock from suppliers" />

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        <div className="mb-4 grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-cream-200 bg-white p-3">
            <p className="text-xs text-gray-500">Total Orders</p>
            <p className="text-xl font-bold text-odfe-teal">{orders.length}</p>
          </div>
          <div className="rounded-lg border border-cream-200 bg-white p-3">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-xl font-bold text-blue-600">{orders.filter((o) => o.status === "draft" || o.status === "ordered").length}</p>
          </div>
          <div className="rounded-lg border border-cream-200 bg-white p-3">
            <p className="text-xs text-gray-500">Received</p>
            <p className="text-xl font-bold text-green-600">{orders.filter((o) => o.status === "received").length}</p>
          </div>
          <div className="rounded-lg border border-cream-200 bg-white p-3">
            <p className="text-xs text-gray-500">Total Spent</p>
            <p className="text-xl font-bold text-odfe-charcoal">
              ₹{orders.filter((o) => o.status === "received").reduce((s, o) => s + Number(o.total_amount), 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order number or supplier..." className={`${inputClass} pl-9`} />
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg bg-odfe-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-odfe-teal-light">
            <Plus size={15} /> New Order
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-cream-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-charcoal">New Purchase Order</h2>
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <select value={formSupplierId} onChange={(e) => setFormSupplierId(e.target.value)} className={inputClass}>
                <option value="">Select supplier (optional)</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notes (optional)" className={inputClass} />
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-gray-500">Items</p>
                <button type="button" onClick={addLine} className="text-xs text-odfe-teal font-medium hover:underline">+ Add Item</button>
              </div>
              {formLines.length === 0 && <p className="text-xs text-gray-400 py-2">No items added yet.</p>}
              {formLines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={line.item_id} onChange={(e) => updateLine(i, "item_id", e.target.value)} className={`${inputClass} flex-1`} required>
                    <option value="">Select item</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                    ))}
                  </select>
                  <input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} placeholder="Qty" className={`${inputClass} w-24`} required />
                  <input type="number" min="0" step="0.01" value={line.unit_cost} onChange={(e) => updateLine(i, "unit_cost", e.target.value)} placeholder="Cost" className={`${inputClass} w-28`} required />
                  <button type="button" onClick={() => removeLine(i)} className="shrink-0 p-1 text-red-500 hover:bg-red-50 rounded"><X size={16} /></button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Order"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {/* Orders Table */}
        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3 hidden sm:table-cell">Supplier</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center hidden md:table-cell">Items</th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading orders...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No purchase orders found</td></tr>
              ) : (
                filtered.map((o) => {
                  const badge = STATUS_BADGE[o.status] ?? STATUS_BADGE.draft
                  return (
                    <tr key={o.id} className="hover:bg-cream-50">
                      <td className="px-4 py-3 font-medium">{o.order_number}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {o.supplier ? (
                          <span className="flex items-center gap-1"><Building2 size={13} className="text-gray-400" />{o.supplier.name}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">₹{Number(o.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.class}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">{o.items.length}</td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell text-xs text-gray-400">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewOrder(o)} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"><Eye size={13} /></button>
                          {o.status === "draft" && (
                            <>
                              <button onClick={() => setConfirmCancel(o)} className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Order</button>
                              <button onClick={() => setConfirmDelete(o)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                            </>
                          )}
                          {o.status === "ordered" && (
                            <button onClick={() => setConfirmReceive(o)} className="rounded px-2 py-1 text-xs text-green-600 hover:bg-green-50">Receive</button>
                          )}
                          {(o.status === "draft" || o.status === "ordered") && (
                            <button onClick={() => { setConfirmCancel(o); setConfirmReceive(null) }} className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* View Order Detail Modal */}
        {viewOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
                <h2 className="font-semibold">{viewOrder.order_number}</h2>
                <button type="button" onClick={() => setViewOrder(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="overflow-y-auto px-5 py-4 space-y-3">
                {viewOrder.supplier && (
                  <div className="flex items-center gap-2 text-sm"><Building2 size={14} className="text-gray-400" />{viewOrder.supplier.name}</div>
                )}
                {viewOrder.notes && <p className="text-sm text-gray-500">{viewOrder.notes}</p>}
                <div className="rounded-lg border border-cream-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-cream-50 text-xs text-gray-500">
                      <tr><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Cost</th><th className="px-3 py-2 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-cream-50">
                      {viewOrder.items.map((item) => {
                        const invItem = inventoryItems.find((i) => i.id === item.item_id)
                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-2">{invItem?.name ?? item.item_id.slice(0, 8)}</td>
                            <td className="px-3 py-2 text-right">{Number(item.quantity).toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">₹{Number(item.unit_cost).toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-medium">₹{Number(item.line_total).toFixed(2)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-cream-50 font-semibold">
                        <td colSpan={3} className="px-3 py-2 text-right">Total</td>
                        <td className="px-3 py-2 text-right">₹{Number(viewOrder.total_amount).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Status: {STATUS_BADGE[viewOrder.status]?.label ?? viewOrder.status}</span>
                  <span>{new Date(viewOrder.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="border-t px-5 py-4 flex gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setViewOrder(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!confirmReceive}
          title="Receive Stock"
          description={`Mark "${confirmReceive?.order_number}" as received? Stock will be automatically added to inventory.`}
          confirmLabel="Receive Stock"
          isLoading={processing}
          onConfirm={handleReceive}
          onCancel={() => setConfirmReceive(null)}
        />

        <ConfirmDialog
          open={!!confirmCancel && !confirmReceive}
          title={confirmCancel?.status === "draft" ? "Mark as Ordered" : "Cancel Order"}
          description={confirmCancel?.status === "draft"
            ? `Mark "${confirmCancel?.order_number}" as ordered?`
            : `Cancel "${confirmCancel?.order_number}"?`}
          confirmLabel={confirmCancel?.status === "draft" ? "Mark Ordered" : "Cancel Order"}
          isLoading={processing}
          onConfirm={confirmCancel?.status === "draft" ? handleMarkOrdered : handleCancel}
          onCancel={() => setConfirmCancel(null)}
        />

        <ConfirmDialog
          open={!!confirmDelete}
          title="Delete Order"
          description={`Delete "${confirmDelete?.order_number}"? This cannot be undone.`}
          confirmLabel="Delete"
          isLoading={processing}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      </PageContainer>
    </AdminLayout>
  )
}
