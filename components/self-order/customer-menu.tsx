"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Coffee, Minus, Plus, Search, ShoppingCart, Tag, Trash2, X } from "lucide-react"
import { useCartStore } from "@/store/cart-store"
import { createOrderWithKitchenTicket } from "@/lib/orders/create-order"
import { ProductImage } from "@/components/products/product-image"
import { validateSelfOrderCoupon, type PublicMenuCategory, type PublicMenuProduct, type SelfOrderMode } from "@/lib/services/self-order.service"
import type { Customer, Product } from "@/types/database"

type Props = {
  cafeId: string
  cafeName: string
  tableId: string | null
  tableLabel: string | null
  customer: Customer
  menu: PublicMenuCategory[]
  mode: SelfOrderMode
}

function productForCart(product: PublicMenuProduct, cafeId: string): Product {
  return {
    id: product.id,
    cafe_id: cafeId,
    category_id: product.categoryId,
    name: product.name,
    description: product.description,
    price: product.price,
    tax_rate: product.taxRate,
    discount: product.discount,
    image_url: product.imageUrl,
    is_available: true,
    sort_order: 0,
    created_at: "",
    updated_at: "",
  }
}

function MenuProductImage({ product }: { product: PublicMenuProduct }) {
  return (
    <ProductImage
      src={product.imageUrl}
      alt={product.name}
      className="h-full w-full object-cover"
    />
  )
}

export function CustomerMenu({ cafeId, cafeName, tableId, tableLabel, customer, menu, mode }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const hasTableContext = Boolean(tableId)
  const orderingEnabled = mode === "online_ordering" && hasTableContext

  const {
    lines,
    totals,
    appliedCoupon,
    addProduct,
    incrementLine,
    decrementLine,
    removeLine,
    applyCoupon,
    removeCoupon,
    clearCart,
  } = useCartStore()

  const products = useMemo(() => menu.flatMap((category) => category.products), [menu])
  const filteredProducts = products.filter((product) => {
    const matchesCategory = !activeCategory || product.categoryId === activeCategory
    const matchesSearch = !search.trim() || product.name.toLowerCase().includes(search.trim().toLowerCase())
    return matchesCategory && matchesSearch
  })

  async function handleApplyCoupon() {
    setError(null)
    const code = couponCode.trim()
    if (!code) return

    const coupon = await validateSelfOrderCoupon(cafeId, code, totals.subtotal)
    if (!coupon) {
      setError("Coupon is invalid, expired, fully used, or below minimum order amount.")
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
  }

  async function handlePlaceOrder() {
    if (!orderingEnabled || placing) return
    setError(null)
    if (!tableId) {
      setError("Scan the QR code on your table to place an order.")
      return
    }
    if (lines.length === 0) {
      setError("Add items to your cart before placing an order.")
      return
    }

    setPlacing(true)
    try {
      const createdOrder = await createOrderWithKitchenTicket({
        cafeId,
        employeeId: null,
        customerId: customer.id,
        tableId,
        lines,
        coupon: appliedCoupon,
        notes: null,
        source: "self_order",
      })

      if (process.env.NODE_ENV === "development") {
        console.log("Created self-order result:", createdOrder)
      }

      if (!createdOrder.orderId) {
        throw new Error("Unable to open the created order.")
      }

      clearCart()
      router.push(`/customer/orders/${createdOrder.orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order.")
    } finally {
      setPlacing(false)
    }
  }

  return (
    <main className="grid gap-4 p-4 lg:grid-cols-[1fr_340px]">
      <section className="min-w-0">
        <div className="mb-3 rounded-xl bg-white p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${!activeCategory ? "bg-odfe-teal text-white" : "bg-gray-100 text-gray-600"}`}
            >
              All
            </button>
            {menu.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${activeCategory === category.id ? "bg-odfe-teal text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {category.name}
              </button>
            ))}
          </div>
          {mode === "qr_menu" && (
            <p className="mt-3 rounded-lg bg-odfe-gold/10 px-3 py-2 text-xs text-odfe-charcoal">
              QR menu mode is view-only. Please call staff to place an order.
            </p>
          )}
          {mode === "online_ordering" && !hasTableContext && (
            <p className="mt-3 rounded-lg bg-odfe-gold/10 px-3 py-2 text-xs text-odfe-charcoal">
              Scan the QR code on your table to place an order.
            </p>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center text-sm text-gray-400 shadow-sm">
            No menu items available.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="flex h-28 items-center justify-center bg-odfe-teal/5">
                  <MenuProductImage product={product} />
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{product.name}</p>
                      {product.description && <p className="mt-1 line-clamp-2 text-xs text-gray-400">{product.description}</p>}
                    </div>
                    <p className="font-display text-base text-odfe-gold">₹{product.price}</p>
                  </div>
                  <button
                    onClick={() => addProduct(productForCart(product, cafeId))}
                    disabled={!orderingEnabled}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-odfe-teal py-2 text-xs font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <aside className="h-fit rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ShoppingCart size={16} className="text-odfe-teal" />
            Cart
          </div>
          {lines.length > 0 && orderingEnabled && (
            <button onClick={clearCart} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
              <Trash2 size={12} />Clear
            </button>
          )}
        </div>
        {!orderingEnabled ? (
          <div className="p-6 text-center text-sm text-gray-400">
            {mode === "qr_menu"
              ? "Cart is disabled in QR menu mode."
              : "Scan the QR code on your table to place an order."}
          </div>
        ) : lines.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">Add items to begin.</div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 px-3 py-2">
              {lines.map((line) => (
                <div key={line.id} className="flex items-start gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{line.productName}</p>
                    <p className="text-xs text-gray-400">₹{line.unitPrice} each</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 px-1 py-0.5">
                    <button onClick={() => decrementLine(line.id)} className="flex h-6 w-6 items-center justify-center text-gray-400"><Minus size={12} /></button>
                    <span className="w-5 text-center text-xs font-semibold">{line.quantity}</span>
                    <button onClick={() => incrementLine(line.id)} className="flex h-6 w-6 items-center justify-center text-gray-400"><Plus size={12} /></button>
                  </div>
                  <button onClick={() => removeLine(line.id)} className="mt-1 text-gray-300 hover:text-red-400"><X size={13} /></button>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t px-4 py-3 text-sm">
              <div className="flex gap-2 pb-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-odfe-teal"
                />
                <button onClick={handleApplyCoupon} className="rounded-lg border border-odfe-teal px-3 py-2 text-xs font-medium text-odfe-teal">Apply</button>
              </div>
              {appliedCoupon && (
                <button onClick={removeCoupon} className="flex items-center gap-1 text-xs text-green-700">
                  <Tag size={12} />{appliedCoupon.code} applied. Remove
                </button>
              )}
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{totals.discountTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Tax</span><span>₹{totals.taxTotal.toFixed(2)}</span></div>
              <div className="flex justify-between border-t pt-2 font-semibold text-gray-900"><span>Total</span><span>₹{totals.total.toFixed(2)}</span></div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                onClick={handlePlaceOrder}
                disabled={placing || !orderingEnabled}
                className="mt-2 w-full rounded-lg bg-odfe-gold py-3 text-sm font-semibold text-odfe-charcoal disabled:opacity-50"
              >
                {placing ? "Placing order..." : "Place order"}
              </button>
            </div>
          </>
        )}
      </aside>
    </main>
  )
}
