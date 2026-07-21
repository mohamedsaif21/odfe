"use client"

import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import {
  Plus, Search, X, Award, Users, Gift, Wallet,
  TrendingUp, Star, Zap, Crown,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  fetchLoyaltyTiers, createLoyaltyTier, updateLoyaltyTier, deleteLoyaltyTier,
  fetchCustomersWithLoyalty, getCustomerLoyaltyDetail,
  getLoyaltyStats,
  type CustomerWithLoyalty,
} from "@/lib/services/loyalty.service"
import type { LoyaltyTier, WalletTransaction, RewardRedemption } from "@/types/database"

export default function LoyaltyPage() {
  const [activeTab, setActiveTab] = useState<"tiers" | "customers">("tiers")
  const [tiers, setTiers] = useState<LoyaltyTier[]>([])
  const [customers, setCustomers] = useState<CustomerWithLoyalty[]>([])
  const [stats, setStats] = useState<{ totalCustomers: number; totalPointsEarned: number; totalPointsRedeemed: number; totalWalletBalance: number; topTier: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Tier form
  const [showTierForm, setShowTierForm] = useState(false)
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null)
  const [tierName, setTierName] = useState("")
  const [tierMinPoints, setTierMinPoints] = useState("")
  const [tierDiscount, setTierDiscount] = useState("")
  const [tierBenefits, setTierBenefits] = useState("")
  const [saving, setSaving] = useState(false)

  // Customer detail
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithLoyalty | null>(null)
  const [customerDetail, setCustomerDetail] = useState<{
    transactions: WalletTransaction[]
    redemptions: RewardRedemption[]
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Delete
  const [deletingTier, setDeletingTier] = useState<LoyaltyTier | null>(null)

  // Customer search
  const [customerSearch, setCustomerSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tierData, custData, statsData] = await Promise.all([
        fetchLoyaltyTiers(),
        fetchCustomersWithLoyalty(),
        getLoyaltyStats(),
      ])
      setTiers(tierData)
      setCustomers(custData)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load loyalty data")
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

  function openCreateTier() {
    setEditingTier(null)
    setTierName(""); setTierMinPoints(""); setTierDiscount(""); setTierBenefits("")
    setShowTierForm(true)
  }

  function openEditTier(tier: LoyaltyTier) {
    setEditingTier(tier)
    setTierName(tier.name)
    setTierMinPoints(String(tier.min_points))
    setTierDiscount(String(tier.discount_percent))
    setTierBenefits(tier.benefits ?? "")
    setShowTierForm(true)
  }

  async function handleTierSubmit(event: FormEvent) {
    event.preventDefault()
    if (!tierName.trim()) { setError("Tier name is required"); return }
    setSaving(true)
    setError(null)
    try {
      if (editingTier) {
        await updateLoyaltyTier(editingTier.id, {
          name: tierName.trim(),
          min_points: Number(tierMinPoints) || 0,
          discount_percent: Number(tierDiscount) || 0,
          benefits: tierBenefits.trim() || undefined,
        })
        setSuccess("Tier updated")
      } else {
        await createLoyaltyTier({
          name: tierName.trim(),
          min_points: Number(tierMinPoints) || 0,
          discount_percent: Number(tierDiscount) || 0,
          benefits: tierBenefits.trim() || undefined,
        })
        setSuccess("Tier created")
      }
      setShowTierForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTier() {
    if (!deletingTier) return
    setSaving(true)
    try {
      await deleteLoyaltyTier(deletingTier.id)
      setSuccess(`"${deletingTier.name}" deactivated`)
      setDeletingTier(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setSaving(false)
    }
  }

  async function openCustomerDetail(customer: CustomerWithLoyalty) {
    setSelectedCustomer(customer)
    setDetailLoading(true)
    try {
      const detail = await getCustomerLoyaltyDetail(customer.id)
      if (detail) {
        setCustomerDetail({ transactions: detail.transactions, redemptions: detail.redemptions })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer detail")
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredCustomers = customers.filter((c) =>
    !customerSearch.trim() || c.name.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const tierIcons = [Zap, Star, Crown, Award]
  const inputClass = "w-full rounded-lg border border-odfe-charcoal/10 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"

  return (
    <AdminLayout title="Loyalty">
      <PageContainer>
        <PageHeader title="Loyalty" description="Customer loyalty program, points, and rewards" />

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        {/* Stats cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-3">
            <p className="text-xs text-odfe-charcoal/40">Customers</p>
            <p className="text-xl font-bold text-odfe-teal">{stats?.totalCustomers ?? 0}</p>
          </div>
          <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-3">
            <p className="text-xs text-odfe-charcoal/40">Points Earned</p>
            <p className="text-xl font-bold text-odfe-charcoal">{stats?.totalPointsEarned ?? 0}</p>
          </div>
          <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-3">
            <p className="text-xs text-odfe-charcoal/40">Points Redeemed</p>
            <p className="text-xl font-bold text-amber-600">{stats?.totalPointsRedeemed ?? 0}</p>
          </div>
          <div className="rounded-lg border border-odfe-charcoal/10 bg-white p-3">
            <p className="text-xs text-odfe-charcoal/40">Wallet Balance</p>
            <p className="text-xl font-bold text-green-600">₹{stats?.totalWalletBalance.toFixed(2) ?? "0.00"}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-odfe-charcoal/10">
          <button
            onClick={() => setActiveTab("tiers")}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition ${
              activeTab === "tiers" ? "border-odfe-teal text-odfe-teal" : "border-transparent text-odfe-charcoal/40 hover:text-odfe-charcoal/60"
            }`}
          >
            <Award size={15} className="inline mr-1" /> Tiers
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition ${
              activeTab === "customers" ? "border-odfe-teal text-odfe-teal" : "border-transparent text-odfe-charcoal/40 hover:text-odfe-charcoal/60"
            }`}
          >
            <Users size={15} className="inline mr-1" /> Customers
          </button>
        </div>

        {activeTab === "tiers" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-odfe-charcoal/60">{tiers.length} tier{tiers.length !== 1 ? "s" : ""} configured</p>
              <button onClick={openCreateTier} className="flex items-center gap-1.5 rounded-lg bg-odfe-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-odfe-teal-light">
                <Plus size={15} /> Add Tier
              </button>
            </div>

            {showTierForm && (
              <form onSubmit={handleTierSubmit} className="mb-4 rounded-lg border border-odfe-charcoal/10 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold text-odfe-charcoal">
                  {editingTier ? "Edit Tier" : "New Loyalty Tier"}
                </h2>
                <div className="grid gap-3 sm:grid-cols-4">
                  <input value={tierName} onChange={(e) => setTierName(e.target.value)} placeholder="Tier name *" required className={inputClass} />
                  <input type="number" min="0" value={tierMinPoints} onChange={(e) => setTierMinPoints(e.target.value)} placeholder="Min points" className={inputClass} />
                  <input type="number" min="0" max="100" step="0.01" value={tierDiscount} onChange={(e) => setTierDiscount(e.target.value)} placeholder="Discount %" className={inputClass} />
                  <input value={tierBenefits} onChange={(e) => setTierBenefits(e.target.value)} placeholder="Benefits description" className={inputClass} />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                  <Button type="button" variant="outline" onClick={() => setShowTierForm(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {loading && !tiers.length ? (
              <div className="flex h-24 items-center justify-center text-sm text-odfe-charcoal/40">Loading tiers...</div>
            ) : tiers.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-odfe-charcoal/40">No tiers defined. Create your first loyalty tier.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tiers.map((tier, idx) => {
                  const Icon = tierIcons[idx] ?? Award
                  return (
                    <div key={tier.id} className="rounded-xl border border-odfe-charcoal/10 bg-white p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-odfe-gold/10">
                            <Icon size={18} className="text-odfe-gold" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-odfe-charcoal">{tier.name}</h3>
                            <p className="text-xs text-odfe-charcoal/40">{tier.min_points} min points</p>
                          </div>
                        </div>
                        {tier.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-500"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inactive</span>
                        )}
                      </div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-2xl font-bold text-odfe-teal">{tier.discount_percent}%</span>
                        <span className="text-xs text-odfe-charcoal/40">discount</span>
                      </div>
                      {tier.benefits && <p className="mb-3 text-xs text-odfe-charcoal/60">{tier.benefits}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => openEditTier(tier)} className="rounded px-3 py-1 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                        {tier.is_active && (
                          <button onClick={() => setDeletingTier(tier)} className="rounded px-3 py-1 text-xs text-red-600 hover:bg-red-50">Deactivate</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "customers" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-odfe-charcoal/40" />
                <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search customers..." className={`${inputClass} pl-9`} />
              </div>
              <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-odfe-charcoal/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-odfe-charcoal/5 text-xs uppercase text-odfe-charcoal/60">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-center">Points</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">Wallet</th>
                    <th className="px-4 py-3 text-center hidden md:table-cell">Tier</th>
                    <th className="px-4 py-3 text-center hidden lg:table-cell">Visits</th>
                    <th className="px-4 py-3 text-center hidden lg:table-cell">Spend</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-odfe-charcoal/5">
                  {loading && !customers.length ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-odfe-charcoal/40">Loading customers...</td></tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-odfe-charcoal/40">No customers found</td></tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-odfe-charcoal/[0.02]">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-odfe-charcoal">{c.name}</p>
                            {c.email && <p className="text-xs text-odfe-charcoal/40">{c.email}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-odfe-teal">{c.loyalty_points}</span>
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span className="text-green-600">₹{Number(c.wallet_balance).toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {c.tier ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-odfe-gold/10 px-2 py-0.5 text-xs font-medium text-odfe-gold">
                              <Award size={10} /> {c.tier.name}
                            </span>
                          ) : (
                            <span className="text-xs text-odfe-charcoal/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell text-odfe-charcoal/60">{c.visit_count}</td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell text-odfe-charcoal/60">₹{Number(c.lifetime_spend).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openCustomerDetail(c)} className="rounded px-2 py-1 text-xs text-odfe-teal hover:bg-odfe-teal/5">View</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <ConfirmDialog
          open={!!deletingTier}
          title="Deactivate tier"
          description={`Deactivate "${deletingTier?.name}"? Customers in this tier will not be affected.`}
          confirmLabel="Deactivate"
          isLoading={saving}
          onConfirm={handleDeleteTier}
          onCancel={() => setDeletingTier(null)}
        />
      </PageContainer>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-odfe-charcoal/10 px-5 py-4 shrink-0">
              <div>
                <h2 className="font-semibold text-odfe-charcoal">{selectedCustomer.name}</h2>
                <p className="text-xs text-odfe-charcoal/40">
                  {selectedCustomer.loyalty_points} points · ₹{Number(selectedCustomer.wallet_balance).toFixed(2)} wallet
                  {selectedCustomer.tier && ` · ${selectedCustomer.tier.name}`}
                </p>
              </div>
              <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerDetail(null) }}>
                <X size={18} className="text-odfe-charcoal/40" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {detailLoading ? (
                <div className="flex h-20 items-center justify-center text-sm text-odfe-charcoal/40">Loading...</div>
              ) : (
                <>
                  {customerDetail && customerDetail.redemptions.length > 0 && (
                    <div className="mb-4">
                      <h3 className="mb-2 text-xs font-semibold uppercase text-odfe-charcoal/60">Point History</h3>
                      <div className="space-y-1">
                        {customerDetail.redemptions.map((r) => (
                          <div key={r.id} className="flex items-center justify-between rounded-lg bg-odfe-charcoal/[0.02] px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium text-odfe-charcoal capitalize">{r.reward_type.replace("_", " ")}</p>
                              {r.description && <p className="text-xs text-odfe-charcoal/40">{r.description}</p>}
                            </div>
                            <div className="text-right">
                              <p className={r.points_used > 0 ? "text-green-600" : "text-odfe-charcoal/60"}>
                                {r.points_used > 0 ? `+${r.points_used} pts` : `₹${Number(r.value).toFixed(2)}`}
                              </p>
                              <p className="text-[10px] text-odfe-charcoal/40">{new Date(r.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {customerDetail && customerDetail.transactions.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase text-odfe-charcoal/60">Wallet Transactions</h3>
                      <div className="space-y-1">
                        {customerDetail.transactions.map((t) => (
                          <div key={t.id} className="flex items-center justify-between rounded-lg bg-odfe-charcoal/[0.02] px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium text-odfe-charcoal">{t.description ?? t.type}</p>
                              {t.reference && <p className="text-xs text-odfe-charcoal/40">{t.reference}</p>}
                            </div>
                            <div className="text-right">
                              <p className={t.type === "credit" ? "text-green-600" : "text-red-500"}>
                                {t.type === "credit" ? "+" : "-"}₹{Number(t.amount).toFixed(2)}
                              </p>
                              <p className="text-[10px] text-odfe-charcoal/40">{new Date(t.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!customerDetail || (customerDetail.redemptions.length === 0 && customerDetail.transactions.length === 0)) && (
                    <p className="py-6 text-center text-sm text-odfe-charcoal/40">No loyalty activity yet</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
