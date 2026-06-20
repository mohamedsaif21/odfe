"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineShoppingBag,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineMinus,
  HiOutlineTrash,
  HiOutlineCreditCard,
  HiOutlineCurrencyDollar,
  HiOutlineDevicePhoneMobile,
  HiOutlineBanknotes,
} from "react-icons/hi2";
import { fetchApi } from "@/utils/api";

interface Category {
  id: string;
  name: string;
  color?: string;
  emoji?: string; // Optional if we want to map colors/ids to emojis
}

interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  image: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

// Fallback mapping for emojis since DB might not have them
const categoryEmojiMap: Record<string, string> = {
  all: "☕",
  espresso: "☕",
  tea: "🍵",
  bakery: "🥐",
  smoothies: "🥤",
  specials: "✨",
};

export default function POSPage() {
  const [categories, setCategories] = useState<Category[]>([{ id: "all", name: "All" }]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchApi("/products");
        if (response.success && response.data) {
          const fetchedCategories = response.data.categories;
          setCategories([
            { id: "all", name: "All" },
            ...fetchedCategories
          ]);
          setProducts(response.data.products);
        }
      } catch (error) {
        console.error("Failed to load POS data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = products.filter(
    (p) =>
      (activeCategory === "all" || p.categoryId === activeCategory) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    
    try {
      const payload = {
        total,
        paymentMethod,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };
      
      const response = await fetchApi("/orders", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      if (response.success) {
        alert(`Order ${response.data.orderNo} created successfully!`);
        setCart([]);
      } else {
        alert(response.message || "Failed to create order");
      }
    } catch (error) {
      console.error("Order submission failed:", error);
      alert("Order submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-surface-950 text-surface-200">
      {/* Left Panel - Products */}
      <div className="flex flex-1 flex-col border-r border-border">
        <header className="flex items-center gap-4 border-b border-border px-6 py-4">
          <Link
            href="/dashboard"
            className="rounded-xl p-2 text-text-muted transition-colors hover:bg-[var(--glass-border)] hover:text-brand-primary"
          >
            <HiOutlineArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <HiOutlineShoppingBag className="h-5 w-5 text-brand-400" />
            <h1 className="text-lg font-bold text-text-primary">POS</h1>
          </div>
        </header>

        {/* Category Tabs */}
        <div className="flex gap-2 border-b border-border px-6 py-3 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? "bg-brand-500/20 text-brand-400"
                  : "text-text-muted hover:bg-[var(--glass-border)] hover:text-brand-primary"
              }`}
            >
              <span>{categoryEmojiMap[cat.id] || "🍽️"}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-6 py-3">
          <div className="relative">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-[var(--glass-secondary)] py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-surface-500 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
             <div className="flex items-center justify-center h-full">
               <p className="text-text-muted">Loading products...</p>
             </div>
          ) : filtered.length === 0 ? (
             <div className="flex items-center justify-center h-full">
               <p className="text-text-muted">No products found.</p>
             </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {filtered.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="glass-card flex flex-col items-center p-4 text-center hover:border-brand-500/30"
                >
                  <span className="mb-2 text-3xl">{product.image || "☕"}</span>
                  <p className="text-sm font-semibold text-text-primary">{product.name}</p>
                  <p className="mt-1 text-sm font-bold text-brand-400">
                    ₹{product.price.toFixed(2)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle Panel - Cart */}
      <div className="flex w-[380px] flex-col border-r border-border">
        <header className="border-b border-border px-6 py-4">
          <h2 className="text-base font-bold text-text-primary">
            Current Order
            {cart.length > 0 && (
              <span className="ml-2 rounded-full bg-brand-500/20 px-2 py-0.5 text-xs text-brand-400">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            )}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-text-muted">
              <HiOutlineShoppingBag className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs">Tap a product to add it</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-[var(--glass-secondary)] p-3"
                >
                  <span className="text-xl">{item.image || "☕"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{item.name}</p>
                    <p className="text-xs text-brand-400">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="rounded-lg bg-[var(--glass-secondary)] p-1 text-text-muted hover:bg-brand-primary/20 hover:text-brand-primary"
                    >
                      <HiOutlineMinus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-text-primary">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="rounded-lg bg-[var(--glass-secondary)] p-1 text-text-muted hover:bg-brand-primary/20 hover:text-brand-primary"
                    >
                      <HiOutlinePlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="ml-1 rounded-lg p-1 text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <HiOutlineTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-border p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Tax (8%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-lg font-bold text-text-primary">
              <span>Total</span>
              <span className="gradient-text">₹{total.toFixed(2)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              disabled={cart.length === 0}
              className="btn-primary w-full py-2 px-0 text-sm flex items-center justify-center gap-2"
            >
              Send to Brew Bar
            </button>
            <button
              disabled={cart.length === 0}
              className="btn-secondary w-full py-2 px-0 text-sm"
            >
              Hold
            </button>
            <button
              disabled={cart.length === 0}
              className="btn-secondary w-full py-2 px-0 text-sm"
            >
              Print
            </button>
            <button
              disabled={cart.length === 0}
              className="btn-secondary w-full py-2 px-0 text-sm !bg-red-500/10 !text-red-400 !border-red-500/20 hover:!bg-red-500/20"
              onClick={() => setCart([])}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Payment */}
      <div className="flex w-[320px] flex-col bg-surface-950/50 p-6">
        <h2 className="mb-6 text-base font-bold text-text-primary">Payment</h2>

        <div className="space-y-3">
          <button 
            onClick={() => setPaymentMethod("card")}
            className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${paymentMethod === 'card' ? 'border-brand-500 bg-brand-500/10' : 'border-border bg-[var(--glass-secondary)] hover:border-brand-500/30 hover:bg-brand-primary/20'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20">
              <HiOutlineCreditCard className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Card</p>
              <p className="text-xs text-text-muted">Credit / Debit</p>
            </div>
          </button>

          <button 
            onClick={() => setPaymentMethod("cash")}
            className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border bg-[var(--glass-secondary)] hover:border-emerald-500/30 hover:bg-emerald-500/20'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <HiOutlineCurrencyDollar className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Cash</p>
              <p className="text-xs text-text-muted">Pay with cash</p>
            </div>
          </button>

          <button 
             onClick={() => setPaymentMethod("mobile")}
             className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${paymentMethod === 'mobile' ? 'border-blue-500 bg-blue-500/10' : 'border-border bg-[var(--glass-secondary)] hover:border-blue-500/30 hover:bg-blue-500/20'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
              <HiOutlineDevicePhoneMobile className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Mobile Pay</p>
              <p className="text-xs text-text-muted">Apple Pay, Google Pay</p>
            </div>
          </button>

          <button 
             onClick={() => setPaymentMethod("split")}
             className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${paymentMethod === 'split' ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-[var(--glass-secondary)] hover:border-violet-500/30 hover:bg-violet-500/20'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
              <HiOutlineBanknotes className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Split</p>
              <p className="text-xs text-text-muted">Split payment</p>
            </div>
          </button>
        </div>

        <div className="mt-auto">
          <button
            onClick={handleCompleteSale}
            disabled={cart.length === 0 || submitting}
            className="btn-primary w-full text-base"
          >
            {submitting ? "Processing..." : `Complete Sale — ₹${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
