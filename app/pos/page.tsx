"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ShoppingCart, Send, CreditCard, Trash2,
  Plus, Minus, X, Tag, ChevronDown, Loader2,
  CheckCircle, AlertCircle, Coffee, Search
} from "lucide-react"
import { useCartStore } from "@/store/cart-store"
import { fetchAvailableProducts } from "@/lib/services/product.service"
import { fetchCategories } from "@/lib/services/category.service"
import { fetchTables } from "@/lib/services/table.service"
import { fetchPaymentMethods } from "@/lib/services/payment.service"
import { fetchValidCoupons, validateCoupon } from "@/lib/services/coupon.service"
import { getPosContext } from "@/lib/services/_shared"
import {
  createOrderWithKitchenTicket,
  createPaymentForOrder,
} from "@/lib/orders/create-order"
import type { Product, ProductCategory, CafeTable, Coupon } from "@/types/database"
import type { PaymentMethodType } from "@/types/database"

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({
  type, message, onClose,
}: { type: "success" | "error"; message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-6 left-1/2 z-50 flex max-w-sm -translate-x-1/2 items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
      type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
    }`}>
      {type === "success"
        ? <CheckCircle size={18} className="mt-0.5 shrink-0 text-green-600" />
        : <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />}
      <p className="text-sm">{message}</p>
      <button onClick={onClose} className="ml-2 shrink-0 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}

// ─── Payment modal ─────────────────────────────────────────────────────────────

function PaymentModal({ total, methods, onConfirm, onClose, loading }: {
  total: number
  methods: { id: string; type: PaymentMethodType; label: string; is_active: boolean }[]
  onConfirm: (method: PaymentMethodType, reference: string) => void
  onClose: () => void
  loading: boolean
}) {
  const enabledMethods = methods.filter((m) => m.type !== "split")
  const [method, setMethod] = useState<PaymentMethodType>(enabledMethods[0]?.type ?? "cash")
  const [reference, setReference] = useState("")
  const [validationError, setValidationError] = useState("")

  function handleConfirm() {
    setValidationError("")
    if (method === "card" && !reference.trim()) {
      setValidationError("Card payment requires a transaction reference number.")
      return
    }
    onConfirm(method, reference.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-gray-900">Complete Sale</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg bg-odfe-teal/5 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-wide text-gray-500">Amount Due</p>
            <p className="mt-1 text-3xl text-odfe-teal" style={{ fontFamily: "Anton, sans-serif" }}>
              ₹{total.toFixed(2)}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {enabledMethods.map((m) => (
                <button key={m.id} onClick={() => { setMethod(m.type); setValidationError("") }}
                  className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                    method === m.type
                      ? "border-odfe-teal bg-odfe-teal text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-odfe-teal/40"
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {method === "card" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Transaction Reference <span className="text-red-500">*</span>
              </label>
              <input autoFocus value={reference}
                onChange={(e) => { setReference(e.target.value); setValidationError("") }}
                placeholder="e.g. TXN123456"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal" />
            </div>
          )}
          {method === "upi" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">UPI Reference (optional)</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. UTR number"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal" />
            </div>
          )}
          {validationError && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle size={13} />{validationError}
            </p>
          )}
        </div>
        <div className="flex gap-2 border-t px-5 py-4">
          <button onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-odfe-gold py-2.5 text-sm font-semibold text-odfe-charcoal hover:bg-odfe-gold-light disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
            {loading ? "Processing…" : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main POS page ─────────────────────────────────────────────────────────────

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [tables, setTables] = useState<CafeTable[]>([])
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; type: PaymentMethodType; label: string; is_active: boolean }[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [cafeId, setCafeId] = useState<string | null>(null)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [showTablePicker, setShowTablePicker] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [sending, setSending] = useState(false)
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const { lines, totals, selectedTable, appliedCoupon,
    addProduct, incrementLine, decrementLine, removeLine, setTable, applyCoupon, removeCoupon, clearCart } = useCartStore()

  // Load data
  const loadPosData = useCallback(async () => {
    setDataLoading(true)
    setDataError(null)
    try {
      const [context, prods, cats, tbls, methods, validCoupons] = await Promise.all([
        getPosContext(),
        fetchAvailableProducts(),
        fetchCategories(),
        fetchTables(),
        fetchPaymentMethods(),
        fetchValidCoupons(),
      ])
      setCafeId(context.cafeId)
      setEmployeeId(context.employeeId)
      setProducts(prods)
      setCategories(cats)
      setTables(tbls)
      setPaymentMethods(methods)
      setCoupons(validCoupons)
    } catch (err) {
      setDataError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPosData()
  }, [loadPosData])

  const filtered = products.filter((p) => {
    const matchesCategory = !activeCat || p.category_id === activeCat
    const matchesSearch = !productSearch.trim() || p.name.toLowerCase().includes(productSearch.trim().toLowerCase())
    return matchesCategory && matchesSearch
  })

  async function handleApplyCoupon() {
    const code = couponCode.trim()
    if (!code) return
    try {
      const coupon = await validateCoupon(code, totals.subtotal)
      if (!coupon) {
        setToast({ type: "error", message: "Coupon is invalid, expired, fully used, or below minimum order amount." })
        return
      }
      const discountAmount = coupon.discount_type === "percentage"
        ? Math.min((totals.subtotal * coupon.value) / 100, totals.subtotal)
        : Math.min(coupon.value, totals.subtotal)
      applyCoupon({
        code: coupon.code,
        discountType: coupon.discount_type,
        value: coupon.value,
        discountAmount,
      })
      setCouponCode("")
      setToast({ type: "success", message: `Coupon ${coupon.code} applied` })
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "An unexpected error occurred" })
    }
  }

  const handleSendToBrewBar = useCallback(async () => {
    if (!cafeId) { setToast({ type: "error", message: "No cafe session. Please log in again." }); return }
    if (lines.length === 0) { setToast({ type: "error", message: "Cart is empty." }); return }
    setSending(true)
    try {
      const result = await createOrderWithKitchenTicket({
        cafeId, employeeId,
        tableId: selectedTable?.id ?? null,
        tableLabel: selectedTable?.label ?? null,
        customerId: null, lines, totals, coupon: appliedCoupon,
      })
      setPayingOrderId(result.orderId)
      setToast({ type: "success", message: `Order ${result.orderNumber} sent to Brew Bar ✓` })
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to send order." })
    } finally {
      setSending(false)
    }
  }, [cafeId, employeeId, selectedTable, lines, totals, appliedCoupon])

  const handleCompleteSale = useCallback(async (method: PaymentMethodType, reference: string) => {
    if (!cafeId) { setToast({ type: "error", message: "No cafe session." }); return }
    setPaying(true)
    try {
      let orderId = payingOrderId
      if (!orderId) {
        const result = await createOrderWithKitchenTicket({
          cafeId, employeeId,
          tableId: selectedTable?.id ?? null,
          tableLabel: selectedTable?.label ?? null,
          customerId: null, lines, totals, coupon: appliedCoupon,
        })
        orderId = result.orderId
      }
      await createPaymentForOrder({
        cafeId, orderId,
        tableId: selectedTable?.id ?? null,
        method, amount: totals.total, reference: reference || null,
      })
      setToast({ type: "success", message: "Payment completed. Sale closed ✓" })
      setShowPayment(false)
      setPayingOrderId(null)
      clearCart()
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Payment failed." })
    } finally {
      setPaying(false)
    }
  }, [cafeId, employeeId, selectedTable, lines, totals, appliedCoupon, payingOrderId, clearCart])

  if (dataLoading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex items-center gap-3 text-odfe-teal">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm font-medium">Loading POS…</span>
      </div>
    </div>
  )

  if (dataError) return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
      <AlertCircle size={24} className="text-red-600" />
      <p className="max-w-md text-sm text-red-700">{dataError}</p>
      <button onClick={loadPosData} className="rounded-lg bg-odfe-teal px-4 py-2 text-sm font-semibold text-white">
        Retry
      </button>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Left: Products */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-odfe-teal px-5 py-3">
          <Coffee size={18} className="text-odfe-gold" />
          <span className="text-xl text-odfe-cream" style={{ fontFamily: "Anton, sans-serif" }}>OdFe POS</span>
          <button onClick={() => setShowTablePicker(true)}
            className="ml-4 flex items-center gap-1.5 rounded-full border border-odfe-gold/40 bg-odfe-gold/10 px-3 py-1 text-sm text-odfe-gold-light hover:bg-odfe-gold/20">
            {selectedTable ? `Table ${selectedTable.label}` : "Select Table"}
            <ChevronDown size={13} />
          </button>
          <div className="ml-auto text-xs text-odfe-cream/50">{cafeId ? "Connected" : "No session"}</div>
        </header>

        {/* Category tabs */}
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2.5">
          <button onClick={() => setActiveCat(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCat === null ? "bg-odfe-teal text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>All</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setActiveCat(c.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCat === c.id ? "bg-odfe-teal text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{c.name}</button>
          ))}
        </div>

        <div className="relative shrink-0 border-b border-gray-200 bg-white px-4 py-3">
          <Search className="absolute left-7 top-6 h-4 w-4 text-gray-400" />
          <input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search products"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"
          />
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
              <Coffee size={32} className="opacity-30" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((product) => (
                <button key={product.id} onClick={() => addProduct(product)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-odfe-teal/40 hover:shadow-md active:translate-y-0">
                  <div className="flex h-20 items-center justify-center bg-gradient-to-br from-odfe-teal/10 to-odfe-sage/10">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <Coffee size={24} className="text-odfe-teal/30" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="text-sm font-medium leading-tight text-gray-800">{product.name}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-base text-odfe-gold" style={{ fontFamily: "Anton, sans-serif" }}>₹{product.price}</span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition group-hover:bg-odfe-gold group-hover:text-white">
                        <Plus size={12} />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <aside className="flex w-80 shrink-0 flex-col border-l border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <ShoppingCart size={16} className="text-odfe-teal" />
            Order
            {totals.itemCount > 0 && (
              <span className="rounded-full bg-odfe-gold/15 px-2 py-0.5 text-xs font-semibold text-odfe-gold">
                {totals.itemCount}
              </span>
            )}
          </div>
          {lines.length > 0 && (
            <button onClick={clearCart} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
              <Trash2 size={12} />Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-gray-300">
              <ShoppingCart size={28} />
              <p className="text-xs">Add items to begin</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 px-3 py-2">
              {lines.map((line) => (
                <div key={line.id} className="flex items-start gap-2 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{line.productName}</p>
                    <p className="text-xs text-gray-400">₹{line.unitPrice} each</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 px-1 py-0.5">
                    <button onClick={() => decrementLine(line.id)} className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100"><Minus size={11} /></button>
                    <span className="w-5 text-center text-xs font-semibold text-gray-700">{line.quantity}</span>
                    <button onClick={() => incrementLine(line.id)} className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100"><Plus size={11} /></button>
                  </div>
                  <div className="flex w-14 flex-col items-end">
                    <span className="text-sm text-odfe-teal" style={{ fontFamily: "Anton, sans-serif" }}>₹{(line.unitPrice * line.quantity).toFixed(0)}</span>
                    <button onClick={() => removeLine(line.id)} className="mt-0.5 text-gray-200 hover:text-red-400"><X size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <>
            <div className="space-y-1.5 border-t border-gray-100 px-4 py-3 text-sm">
              <div className="flex gap-2 pb-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  list="pos-coupons"
                  placeholder="Coupon code"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"
                />
                <datalist id="pos-coupons">
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.code} />
                  ))}
                </datalist>
                <button onClick={handleApplyCoupon} className="rounded-lg border border-odfe-teal px-3 py-2 text-xs font-medium text-odfe-teal">
                  Apply
                </button>
              </div>
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1"><Tag size={12} />{appliedCoupon ? `Coupon (${appliedCoupon.code})` : "Discount"}</span>
                  <span>−₹{totals.discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500"><span>Tax</span><span>₹{totals.taxTotal.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-1.5 font-semibold text-gray-900">
                <span>Total</span>
                <span className="text-lg text-odfe-teal" style={{ fontFamily: "Anton, sans-serif" }}>₹{totals.total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-gray-100 p-4">
              <button onClick={handleSendToBrewBar} disabled={sending || paying}
                className="flex items-center justify-center gap-2 rounded-lg bg-odfe-teal py-3 text-sm font-semibold text-white transition hover:bg-odfe-teal-light disabled:opacity-50">
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sending ? "Sending…" : "Send to Brew Bar"}
              </button>
              <button onClick={() => setShowPayment(true)} disabled={sending || paying || paymentMethods.length === 0}
                className="flex items-center justify-center gap-2 rounded-lg bg-odfe-gold py-3 text-sm font-semibold text-odfe-charcoal transition hover:bg-odfe-gold-light disabled:opacity-50">
                <CreditCard size={15} />Complete Sale
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Table picker */}
      {showTablePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-semibold text-gray-900">Select Table</h2>
              <button onClick={() => setShowTablePicker(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4">
              <button onClick={() => { setTable(null); setShowTablePicker(false) }}
                className="rounded-xl border border-dashed border-gray-200 py-3 text-sm text-gray-400 hover:border-gray-300">None</button>
              {tables.map((t) => (
                <button key={t.id} disabled={t.status === "occupied"}
                  onClick={() => { setTable(t); setShowTablePicker(false) }}
                  className={`rounded-xl border py-3 text-sm font-medium transition-colors ${
                    selectedTable?.id === t.id ? "border-odfe-teal bg-odfe-teal text-white"
                    : t.status === "occupied" ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
                    : "border-gray-200 text-gray-700 hover:border-odfe-teal/50"
                  }`}>
                  <div>{t.label}</div>
                  <div className="mt-0.5 text-[10px] opacity-70 capitalize">{t.status}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal total={totals.total} methods={paymentMethods} loading={paying}
          onClose={() => setShowPayment(false)} onConfirm={handleCompleteSale} />
      )}

      {/* Toast */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}
