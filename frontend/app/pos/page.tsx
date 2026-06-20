"use client";

import { useState } from "react";
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

const categories = [
  { id: "all", label: "All", emoji: "☕" },
  { id: "espresso", label: "Espresso", emoji: "☕" },
  { id: "tea", label: "Tea", emoji: "🍵" },
  { id: "bakery", label: "Bakery", emoji: "🥐" },
  { id: "smoothies", label: "Smoothies", emoji: "🥤" },
  { id: "specials", label: "Specials", emoji: "✨" },
];

const products = [
  { id: 1, name: "Espresso", price: 120, category: "espresso", image: "☕" },
  { id: 2, name: "Latte", price: 180, category: "espresso", image: "☕" },
  { id: 3, name: "Mocha", price: 210, category: "espresso", image: "🍫" },
  { id: 4, name: "Americano", price: 150, category: "espresso", image: "☕" },
  { id: 5, name: "Flat White", price: 190, category: "espresso", image: "☕" },
  { id: 6, name: "Cold Brew", price: 200, category: "espresso", image: "🧊" },
  { id: 7, name: "Green Tea", price: 130, category: "tea", image: "🍵" },
  { id: 8, name: "Masala Tea", price: 100, category: "tea", image: "🫖" },
  { id: 9, name: "Lemon Tea", price: 120, category: "tea", image: "🍋" },
  { id: 10, name: "Matcha", price: 220, category: "tea", image: "🍵" },
  { id: 11, name: "Croissant", price: 150, category: "bakery", image: "🥐" },
  { id: 12, name: "Brownie", price: 160, category: "bakery", image: "🟫" },
  { id: 13, name: "Cookies", price: 90, category: "bakery", image: "🍪" },
  { id: 14, name: "Cheesecake", price: 220, category: "bakery", image: "🍰" },
  { id: 15, name: "Muffins", price: 140, category: "bakery", image: "🧁" },
  { id: 16, name: "Sandwiches", price: 180, category: "bakery", image: "🥪" },
  { id: 17, name: "Wraps", price: 190, category: "bakery", image: "🌯" },
  { id: 18, name: "Smoothies", price: 200, category: "smoothies", image: "🥤" },
  { id: 19, name: "Milkshakes", price: 210, category: "smoothies", image: "🧋" },
  { id: 20, name: "Seasonal Specials", price: 250, category: "specials", image: "✨" },
  { id: 21, name: "Combo Offers", price: 350, category: "specials", image: "🏷️" },
];

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function POSPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");

  const filtered = products.filter(
    (p) =>
      (activeCategory === "all" || p.category === activeCategory) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: (typeof products)[0]) => {
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

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
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
              <span>{cat.emoji}</span>
              {cat.label}
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
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="glass-card flex flex-col items-center p-4 text-center hover:border-brand-500/30"
              >
                <span className="mb-2 text-3xl">{product.image}</span>
                <p className="text-sm font-semibold text-text-primary">{product.name}</p>
                <p className="mt-1 text-sm font-bold text-brand-400">
                  ₹{product.price.toFixed(2)}
                </p>
              </button>
            ))}
          </div>
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
                  <span className="text-xl">{item.image}</span>
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
          <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-[var(--glass-secondary)] p-4 text-left transition-all hover:border-brand-500/30 hover:bg-brand-primary/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20">
              <HiOutlineCreditCard className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Card</p>
              <p className="text-xs text-text-muted">Credit / Debit</p>
            </div>
          </button>

          <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-[var(--glass-secondary)] p-4 text-left transition-all hover:border-brand-500/30 hover:bg-brand-primary/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <HiOutlineCurrencyDollar className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Cash</p>
              <p className="text-xs text-text-muted">Pay with cash</p>
            </div>
          </button>

          <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-[var(--glass-secondary)] p-4 text-left transition-all hover:border-brand-500/30 hover:bg-brand-primary/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
              <HiOutlineDevicePhoneMobile className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Mobile Pay</p>
              <p className="text-xs text-text-muted">Apple Pay, Google Pay</p>
            </div>
          </button>

          <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-[var(--glass-secondary)] p-4 text-left transition-all hover:border-brand-500/30 hover:bg-brand-primary/20">
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
            disabled={cart.length === 0}
            className="btn-primary w-full text-base"
          >
            Complete Sale — ₹{total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
