"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { createCoupon, fetchCoupons, toggleCoupon } from "@/lib/services/coupon.service"
import type { Coupon, DiscountType } from "@/types/database"

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [form, setForm] = useState({ code: "", discount_type: "percentage" as DiscountType, value: "", min_order_amount: "", max_uses: "", expires_at: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setCoupons(await fetchCoupons())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load coupons")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submit() {
    if (!form.code.trim() || !form.value) return
    try {
      await createCoupon({
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        value: Number(form.value),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : undefined,
        max_uses: form.max_uses ? Number(form.max_uses) : undefined,
        expires_at: form.expires_at || undefined,
      })
      setForm({ code: "", discount_type: "percentage", value: "", min_order_amount: "", max_uses: "", expires_at: "" })
      setSuccess("Coupon added")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save coupon")
    }
  }

  async function toggle(coupon: Coupon) {
    try {
      await toggleCoupon(coupon.id, !coupon.is_active)
      setSuccess(coupon.is_active ? "Coupon disabled" : "Coupon enabled")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update coupon")
    }
  }

  return (
    <AdminLayout title="Coupons">
      <PageContainer>
        <PageHeader title="Coupons" description="Discount codes and automatic promotions" />
        <div className="mb-4 grid gap-3 xl:grid-cols-[1fr_160px_120px_160px_120px_180px_auto]">
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code" />
          <Select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as DiscountType })}>
            <option value="percentage">Percentage</option>
            <option value="flat">Flat</option>
          </Select>
          <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Value" />
          <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} placeholder="Min order" />
          <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Max uses" />
          <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <Button onClick={submit}><Plus className="mr-2 h-4 w-4" />Add</Button>
        </div>
        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}
        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Min order</th><th className="px-4 py-3">Uses</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading coupons...</td></tr> :
                coupons.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No coupons found</td></tr> :
                coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td className="px-4 py-3 font-medium">{coupon.code}</td>
                    <td className="px-4 py-3">{coupon.discount_type === "percentage" ? `${coupon.value}%` : `₹${coupon.value}`}</td>
                    <td className="px-4 py-3">{coupon.min_order_amount ? `₹${coupon.min_order_amount}` : "-"}</td>
                    <td className="px-4 py-3">{coupon.used_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ""}</td>
                    <td className="px-4 py-3">{coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3"><Badge>{coupon.is_active ? "active" : "inactive"}</Badge></td>
                    <td className="px-4 py-3 text-right"><Button variant="outline" size="sm" onClick={() => toggle(coupon)}>{coupon.is_active ? "Disable" : "Enable"}</Button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
