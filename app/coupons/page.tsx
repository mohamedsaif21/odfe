"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { z } from "zod"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { createCoupon, fetchCoupons, toggleCoupon } from "@/lib/services/coupon.service"
import type { Coupon, DiscountType } from "@/types/database"

const emptyForm = {
  code: "",
  discount_type: "percentage" as DiscountType,
  value: "",
  min_order_amount: "",
  max_uses: "",
  expires_at: "",
}

const codeSchema = z
  .string()
  .trim()
  .min(3, "Coupon code must be at least 3 characters.")
  .regex(/^[A-Z0-9_-]+$/, "Coupon code may only contain letters, numbers, hyphen, and underscore.")

function todayDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseOptionalNumber(value: string, label: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`)
  }
  return parsed
}

function validateCouponForm(form: typeof emptyForm) {
  const code = codeSchema.parse(form.code.trim().toUpperCase())
  const value = parseOptionalNumber(form.value, "Discount value")

  if (value === null || value <= 0) {
    throw new Error(
      form.discount_type === "percentage"
        ? "Percentage discount must be between 1 and 100."
        : "Fixed discount must be greater than 0.",
    )
  }

  if (form.discount_type === "percentage" && value > 100) {
    throw new Error("Percentage discount must be between 1 and 100.")
  }

  const minOrderAmount = parseOptionalNumber(form.min_order_amount, "Minimum order")
  if (minOrderAmount !== null && minOrderAmount < 0) {
    throw new Error("Minimum order must be 0 or greater.")
  }

  const maxUses = parseOptionalNumber(form.max_uses, "Maximum uses")
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
    throw new Error("Maximum uses must be an integer greater than 0.")
  }

  const expiresAt = form.expires_at.trim() || null
  if (expiresAt && expiresAt < todayDateKey()) {
    throw new Error("Expiry date must be in the future.")
  }

  return {
    code,
    discount_type: form.discount_type,
    value,
    min_order_amount: minOrderAmount ?? undefined,
    max_uses: maxUses ?? undefined,
    expires_at: expiresAt ?? undefined,
  }
}

function readableFormError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Please check the coupon form."
  }
  return error instanceof Error ? error.message : "Please check the coupon form."
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setCoupons(await fetchCoupons())
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load coupons")
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submit() {
    if (saving) return
    setError(null)
    setSuccess(null)

    let payload: ReturnType<typeof validateCouponForm>
    try {
      payload = validateCouponForm(form)
    } catch (err) {
      setError(readableFormError(err))
      return
    }

    setSaving(true)
    try {
      await createCoupon(payload)
      setForm(emptyForm)
      if (await load()) {
        setSuccess("Coupon added")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save coupon")
    } finally {
      setSaving(false)
    }
  }

  async function toggle(coupon: Coupon) {
    setError(null)
    setSuccess(null)
    try {
      await toggleCoupon(coupon.id, !coupon.is_active)
      if (await load()) {
        setSuccess(coupon.is_active ? "Coupon disabled" : "Coupon enabled")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update coupon")
    }
  }

  function updateDiscountType(discountType: DiscountType) {
    setForm((current) => ({
      ...current,
      discount_type: discountType,
      value:
        discountType === "percentage" && Number(current.value) > 100
          ? ""
          : current.value,
    }))
  }

  return (
    <AdminLayout title="Coupons">
      <PageContainer>
        <PageHeader title="Coupons" description="Discount codes and automatic promotions" />
        <div className="mb-4 grid gap-3 xl:grid-cols-[1fr_160px_120px_160px_120px_180px_auto]">
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Code" />
          <Select value={form.discount_type} onChange={(e) => updateDiscountType(e.target.value as DiscountType)}>
            <option value="percentage">Percentage</option>
            <option value="flat">Fixed</option>
          </Select>
          <div className="relative">
            {form.discount_type === "flat" && (
              <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-charcoal/50">₹</span>
            )}
            <Input
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.discount_type === "percentage" ? "e.g. 20" : "Value"}
              min={form.discount_type === "percentage" ? 1 : 0.01}
              max={form.discount_type === "percentage" ? 100 : undefined}
              step={0.01}
              className={form.discount_type === "flat" ? "pl-7" : undefined}
            />
          </div>
          <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} placeholder="Min order" min={0} step={0.01} />
          <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Max uses" min={1} step={1} />
          <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} min={todayDateKey()} />
          <Button onClick={submit} disabled={saving}><Plus className="mr-2 h-4 w-4" />{saving ? "Adding..." : "Add"}</Button>
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
