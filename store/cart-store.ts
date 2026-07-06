"use client"

import { create } from "zustand"
import type { CartLine, CartTotals, AppliedCoupon } from "@/types/app"
import type { Product, CafeTable, Customer } from "@/types/database"

interface CartState {
  // Items
  lines: CartLine[]

  // Context
  selectedTable: CafeTable | null
  selectedCustomer: Customer | null
  appliedCoupon: AppliedCoupon | null

  // Computed totals (derived, updated on every mutation)
  totals: CartTotals

  // Actions
  addProduct: (product: Product) => void
  incrementLine: (lineId: string) => void
  decrementLine: (lineId: string) => void
  removeLine: (lineId: string) => void
  setLineNotes: (lineId: string, notes: string) => void
  setTable: (table: CafeTable | null) => void
  setCustomer: (customer: Customer | null) => void
  applyCoupon: (coupon: AppliedCoupon) => void
  removeCoupon: () => void
  clearCart: () => void
}

function computeTotals(lines: CartLine[], coupon: AppliedCoupon | null): CartTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
  const itemDiscount = lines.reduce(
    (sum, l) => sum + (l.discount / 100) * l.unitPrice * l.quantity,
    0
  )

  let couponDiscount = 0
  if (coupon) {
    couponDiscount =
      coupon.discountType === "percentage"
        ? (subtotal * coupon.value) / 100
        : coupon.value
    couponDiscount = Math.min(couponDiscount, subtotal)
  }

  const discountTotal = itemDiscount + couponDiscount
  const taxable = subtotal - discountTotal
  const taxTotal = lines.reduce(
    (sum, l) => sum + ((l.taxRate / 100) * l.unitPrice * l.quantity),
    0
  )
  const total = Math.max(taxable + taxTotal, 0)
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)

  return { subtotal, discountTotal, taxTotal, total, itemCount }
}

export const useCartStore = create<CartState>()((set, get) => ({
  lines: [],
  selectedTable: null,
  selectedCustomer: null,
  appliedCoupon: null,
  totals: { subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0, itemCount: 0 },

  addProduct: (product) => {
    const { lines, appliedCoupon } = get()
    const existing = lines.find(
      (l) => l.productId === product.id
    )
    let updated: CartLine[]
    if (existing) {
      updated = lines.map((l) =>
        l.id === existing.id ? { ...l, quantity: l.quantity + 1 } : l
      )
    } else {
      const newLine: CartLine = {
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: 1,
        taxRate: product.tax_rate,
        discount: product.discount,
        notes: null,
      }
      updated = [...lines, newLine]
    }
    set({ lines: updated, totals: computeTotals(updated, appliedCoupon) })
  },

  incrementLine: (lineId) => {
    const { lines, appliedCoupon } = get()
    const updated = lines.map((l) =>
      l.id === lineId ? { ...l, quantity: l.quantity + 1 } : l
    )
    set({ lines: updated, totals: computeTotals(updated, appliedCoupon) })
  },

  decrementLine: (lineId) => {
    const { lines, appliedCoupon } = get()
    const updated = lines
      .map((l) => (l.id === lineId ? { ...l, quantity: l.quantity - 1 } : l))
      .filter((l) => l.quantity > 0)
    set({ lines: updated, totals: computeTotals(updated, appliedCoupon) })
  },

  removeLine: (lineId) => {
    const { lines, appliedCoupon } = get()
    const updated = lines.filter((l) => l.id !== lineId)
    set({ lines: updated, totals: computeTotals(updated, appliedCoupon) })
  },

  setLineNotes: (lineId, notes) => {
    const { lines } = get()
    const updated = lines.map((l) => (l.id === lineId ? { ...l, notes } : l))
    set({ lines: updated })
  },

  setTable: (table) => set({ selectedTable: table }),
  setCustomer: (customer) => set({ selectedCustomer: customer }),

  applyCoupon: (coupon) => {
    const { lines } = get()
    set({ appliedCoupon: coupon, totals: computeTotals(lines, coupon) })
  },

  removeCoupon: () => {
    const { lines } = get()
    set({ appliedCoupon: null, totals: computeTotals(lines, null) })
  },

  clearCart: () =>
    set({
      lines: [],
      selectedTable: null,
      selectedCustomer: null,
      appliedCoupon: null,
      totals: { subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0, itemCount: 0 },
    }),
}))