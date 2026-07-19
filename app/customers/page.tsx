"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Plus, Search, X, Loader2, UserCheck, UserX,
  Star, ShoppingBag, ChevronRight, Trash2,
  AlertCircle, CheckCircle, Phone, Mail, MapPin,
  Cake, Gift, TrendingUp,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { Select } from "@/components/ui/select"
import {
  fetchCustomers, createCustomer, updateCustomer,
  getCustomerDetail, deactivateCustomer, activateCustomer,
  mergeCustomers, addLoyaltyPoints,
} from "@/lib/services/customer.service"
import type { CustomerDetail } from "@/lib/services/customer.service"
import type { Customer } from "@/types/database"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", birthday: "" })
  const [saving, setSaving] = useState(false)

  // Detail modal
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Merge modal
  const [showMerge, setShowMerge] = useState(false)
  const [mergeSource, setMergeSource] = useState<Customer | null>(null)
  const [mergeTarget, setMergeTarget] = useState("")
  const [mergeCandidates, setMergeCandidates] = useState<Customer[]>([])
  const [merging, setMerging] = useState(false)

  // Loyalty
  const [showLoyalty, setShowLoyalty] = useState<Customer | null>(null)
  const [loyaltyPoints, setLoyaltyPoints] = useState("")
  const [loyaltySaving, setLoyaltySaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCustomers(await fetchCustomers(search.trim() || undefined, { status: statusFilter }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers")
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await updateCustomer(editing.id, form)
        setSuccess("Customer updated")
      } else {
        await createCustomer(form)
        setSuccess("Customer added")
      }
      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customer")
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setShowForm(false)
    setEditing(null)
    setForm({ name: "", email: "", phone: "", address: "", birthday: "" })
  }

  function startEdit(customer: Customer) {
    setEditing(customer)
    setForm({
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      birthday: customer.birthday ?? "",
    })
    setShowForm(true)
  }

  async function openDetail(customer: Customer) {
    setDetailLoading(true)
    setDetail(null)
    try {
      const detailData = await getCustomerDetail(customer.id)
      setDetail(detailData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer details")
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleDeactivate(customer: Customer) {
    try {
      if (customer.is_active) {
        await deactivateCustomer(customer.id)
        setSuccess(`${customer.name} deactivated`)
      } else {
        await activateCustomer(customer.id)
        setSuccess(`${customer.name} activated`)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update customer status")
    }
  }

  function startMerge(customer: Customer) {
    setMergeSource(customer)
    setMergeTarget("")
    setMergeCandidates(customers.filter((c) => c.id !== customer.id))
    setShowMerge(true)
  }

  async function handleMerge() {
    if (!mergeSource || !mergeTarget) return
    setMerging(true)
    try {
      await mergeCustomers(mergeTarget, mergeSource.id)
      setSuccess(`Merged ${mergeSource.name} into target`)
      setShowMerge(false)
      setMergeSource(null)
      setMergeTarget("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed")
    } finally {
      setMerging(false)
    }
  }

  async function handleAddLoyalty() {
    if (!showLoyalty || !loyaltyPoints) return
    const points = Number.parseInt(loyaltyPoints, 10)
    if (Number.isNaN(points) || points <= 0) return
    setLoyaltySaving(true)
    try {
      await addLoyaltyPoints(showLoyalty.id, points)
      setSuccess(`Added ${points} points to ${showLoyalty.name}`)
      setShowLoyalty(null)
      setLoyaltyPoints("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add points")
    } finally {
      setLoyaltySaving(false)
    }
  }

  const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"

  return (
    <AdminLayout title="Customers">
      <PageContainer>
        <PageHeader title="Customers" description="Customer directory, loyalty, and management" />

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        {/* Action Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className={`${inputClass} pl-9`}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-32"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-odfe-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-odfe-teal-light"
          >
            <Plus size={15} /> Add Customer
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <form onSubmit={submit} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name *" required className={inputClass} />
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className={inputClass} />
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className={inputClass} />
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className={inputClass} />
                  <input value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} placeholder="Birthday" type="date" className={inputClass} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-odfe-teal px-4 py-2 text-sm font-semibold text-white hover:bg-odfe-teal-light disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    {editing ? "Update" : "Add"} Customer
                  </button>
                  <button type="button" onClick={resetForm}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Customers Table */}
        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 hidden sm:table-cell">Contact</th>
                <th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3 text-right">Spend</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading customers...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No customers found</td></tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-cream-50 cursor-pointer" onClick={() => openDetail(customer)}>
                    <td className="px-4 py-3 font-medium">{customer.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        {customer.email && <p className="text-xs text-gray-500">{customer.email}</p>}
                        {customer.phone && <p className="text-xs text-gray-400">{customer.phone}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">{customer.visit_count}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">₹{Number(customer.lifetime_spend).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-odfe-gold">{customer.loyalty_points}</td>
                    <td className="px-4 py-3 text-center">
                      {customer.is_active ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(customer) }}
                          className="rounded px-2 py-1 text-xs text-odfe-teal hover:bg-odfe-teal/5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowLoyalty(customer) }}
                          className="rounded px-2 py-1 text-xs text-odfe-gold hover:bg-odfe-gold/5"
                        >
                          Points
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); startMerge(customer) }}
                          className="rounded px-2 py-1 text-xs text-purple-600 hover:bg-purple-50"
                        >
                          Merge
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeactivate(customer) }}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          {customer.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Modal */}
        {(detail || detailLoading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
              {detailLoading ? (
                <div className="flex h-40 items-center justify-center"><Loader2 size={20} className="animate-spin text-odfe-teal" /></div>
              ) : detail ? (
                <>
                  <div className="flex items-center justify-between border-b px-5 py-4">
                    <div className="flex items-center gap-2">
                      <UserCheck size={18} className={detail.is_active ? "text-green-500" : "text-gray-400"} />
                      <h2 className="font-semibold text-gray-900">{detail.name}</h2>
                    </div>
                    <button onClick={() => setDetail(null)}><X size={18} className="text-gray-400" /></button>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-odfe-teal/5 p-3 text-center">
                        <p className="text-xs text-gray-500">Orders</p>
                        <p className="text-lg font-bold text-odfe-teal">{detail.orderCount}</p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-3 text-center">
                        <p className="text-xs text-gray-500">Spend</p>
                        <p className="text-lg font-bold text-green-600">₹{detail.lifetimeSpend.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg bg-odfe-gold/10 p-3 text-center">
                        <p className="text-xs text-gray-500">Points</p>
                        <p className="text-lg font-bold text-odfe-gold">{detail.loyalty_points}</p>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-2 text-sm">
                      {detail.email && (
                        <div className="flex items-center gap-2 text-gray-600"><Mail size={14} /><span>{detail.email}</span></div>
                      )}
                      {detail.phone && (
                        <div className="flex items-center gap-2 text-gray-600"><Phone size={14} /><span>{detail.phone}</span></div>
                      )}
                      {detail.address && (
                        <div className="flex items-center gap-2 text-gray-600"><MapPin size={14} /><span>{detail.address}</span></div>
                      )}
                      {detail.birthday && (
                        <div className="flex items-center gap-2 text-gray-600"><Cake size={14} /><span>{detail.birthday}</span></div>
                      )}
                    </div>

                    {/* Favorite Items */}
                    {detail.favoriteItems.length > 0 && (
                      <div>
                        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
                          <Star size={12} /> Favorite Items
                        </h3>
                        <div className="space-y-1">
                          {detail.favoriteItems.slice(0, 5).map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                              <span>{item.name}</span>
                              <span className="text-xs text-gray-400">{item.quantity}x · ₹{item.totalSpent.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Orders */}
                    {detail.recentOrders.length > 0 && (
                      <div>
                        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
                          <ShoppingBag size={12} /> Recent Orders
                        </h3>
                        <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                          {detail.recentOrders.map((order) => (
                            <div key={order.id} className="flex items-center justify-between py-2 text-sm">
                              <div>
                                <p className="font-medium">{order.orderNumber}</p>
                                <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge>{order.status.replaceAll("_", " ")}</Badge>
                                <span className="font-semibold">₹{order.total.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t px-5 py-4">
                    <button onClick={() => setDetail(null)}
                      className="w-full rounded-lg bg-odfe-teal py-2.5 text-sm font-semibold text-white">
                      Close
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Merge Modal */}
        {showMerge && mergeSource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h2 className="font-semibold text-gray-900">Merge Customer</h2>
                <button onClick={() => { setShowMerge(false); setMergeSource(null) }}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="rounded-lg bg-orange-50 p-3 text-xs text-orange-700 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>Merging <strong>{mergeSource.name}</strong> into another customer. The source will be deleted and all orders reassigned.</span>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Select target customer</label>
                  <select
                    value={mergeTarget}
                    onChange={(e) => setMergeTarget(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal"
                  >
                    <option value="">Choose customer to keep...</option>
                    {mergeCandidates.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 border-t px-5 py-4">
                <button onClick={() => { setShowMerge(false); setMergeSource(null) }}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600">
                  Cancel
                </button>
                <button onClick={handleMerge} disabled={!mergeTarget || merging}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  {merging ? <Loader2 size={14} className="animate-spin" /> : null}
                  {merging ? "Merging..." : "Merge"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loyalty Points Modal */}
        {showLoyalty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Gift size={16} className="text-odfe-gold" />
                  Add Points — {showLoyalty.name}
                </div>
                <button onClick={() => { setShowLoyalty(null); setLoyaltyPoints("") }}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <p className="text-sm text-gray-500">Current balance: <strong className="text-odfe-gold">{showLoyalty.loyalty_points}</strong> points</p>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Points to add</label>
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    value={loyaltyPoints}
                    onChange={(e) => setLoyaltyPoints(e.target.value)}
                    placeholder="Enter points"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal"
                  />
                </div>
              </div>
              <div className="flex gap-2 border-t px-5 py-4">
                <button onClick={() => { setShowLoyalty(null); setLoyaltyPoints("") }}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600">
                  Cancel
                </button>
                <button onClick={handleAddLoyalty} disabled={!loyaltyPoints || loyaltySaving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-odfe-gold py-2.5 text-sm font-semibold text-odfe-charcoal hover:bg-odfe-gold-light disabled:opacity-50">
                  {loyaltySaving ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                  {loyaltySaving ? "Adding..." : "Add Points"}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminLayout>
  )
}
