"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineQueueList,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineMinus,
  HiOutlineShoppingBag,
  HiOutlineTrash,
} from "react-icons/hi2";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const categories = [
  { id: "all", label: "All", emoji: "☕" },
  { id: "espresso", label: "Espresso", emoji: "☕" },
  { id: "tea", label: "Tea", emoji: "🍵" },
  { id: "bakery", label: "Bakery", emoji: "🥐" },
  { id: "smoothies", label: "Smoothies", emoji: "🥤" },
];

const menuItems = [
  { id: 1, name: "Espresso", price: 150, category: "espresso", image: "☕", desc: "Single origin espresso shot" },
  { id: 2, name: "Cappuccino", price: 220, category: "espresso", image: "☕", desc: "Espresso, steamed milk, thick foam" },
  { id: 3, name: "Matcha Latte", price: 250, category: "tea", image: "🍵", desc: "Ceremonial grade matcha with oat milk" },
  { id: 4, name: "Croissant", price: 180, category: "bakery", image: "🥐", desc: "Butter croissant baked fresh daily" },
  { id: 5, name: "Banana Smoothie", price: 280, category: "smoothies", image: "🥤", desc: "Banana, honey, Greek yogurt" },
  { id: 6, name: "Americano", price: 160, category: "espresso", image: "☕", desc: "Espresso topped with hot water" },
  { id: 7, name: "Chai Latte", price: 200, category: "tea", image: "🍵", desc: "Spiced chai blend with steamed milk" },
  { id: 8, name: "Blueberry Muffin", price: 160, category: "bakery", image: "🧁", desc: "Blueberry muffin with streusel topping" },
  { id: 9, name: "Berry Smoothie", price: 300, category: "smoothies", image: "🥤", desc: "Mixed berries, almond milk, chia seeds" },
];

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function SelfOrderPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const filtered = menuItems.filter(
    (item) => activeCategory === "all" || item.category === activeCategory
  );

  const addToCart = (item: (typeof menuItems)[0]) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);
  const totalPrice = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border px-6 py-4">
        <Link
          href="/dashboard"
          className="rounded-xl p-2 text-text-muted transition-colors hover:bg-[var(--glass-border)] hover:text-brand-primary"
        >
          <HiOutlineArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <HiOutlineQueueList className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-bold text-text-primary">Self-Order</h1>
        </div>
        <button
          onClick={() => setShowCart(!showCart)}
          className="relative ml-auto rounded-xl bg-[var(--glass-secondary)] p-2.5 text-text-muted transition-colors hover:bg-brand-primary/20 hover:text-brand-primary"
        >
          <HiOutlineShoppingBag className="h-5 w-5" />
          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-text-primary">
              {totalItems}
            </span>
          )}
        </button>
      </header>

      {/* QR Code Display */}
      <div className="px-6 pt-6">
        <div className="glass-card mb-6 flex flex-col items-center p-6">
          <p className="mb-3 text-sm text-text-muted">Scan to order from your phone</p>
          <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-surface p-2">
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-sm ${
                    Math.random() > 0.4 ? "bg-surface-950" : "bg-surface"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-text-muted">Table T-05 · ODFE Self-Order</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto px-6 pb-3">
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

      {/* Menu Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-4"
      >
        {filtered.map((item) => (
          <motion.button
            key={item.id}
            variants={itemVariants}
            whileTap={{ scale: 0.95 }}
            onClick={() => addToCart(item)}
            className="glass-card flex flex-col items-center p-5 text-center hover:border-brand-500/30"
          >
            <span className="mb-3 text-4xl">{item.image}</span>
            <h3 className="text-sm font-semibold text-text-primary">{item.name}</h3>
            <p className="mt-1 text-xs text-text-muted">{item.desc}</p>
            <p className="mt-2 text-base font-bold text-brand-400">₹{item.price.toFixed(2)}</p>
          </motion.button>
        ))}
      </motion.div>

      {/* Cart Panel */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="flex-1 bg-bg/80 backdrop-blur-sm absolute inset-0" onClick={() => setShowCart(false)} />
          <div className="relative z-10 w-full max-w-md animate-in slide-in-from-bottom-full rounded-t-3xl border border-border bg-card p-6 shadow-premium sm:rounded-3xl sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">Your Order</h2>
              <button onClick={() => setShowCart(false)} className="text-text-muted hover:text-brand-primary">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="py-12 text-center text-text-muted">Cart is empty</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-[var(--glass-secondary)] p-3">
                      <span className="text-xl">{item.image}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary">{item.name}</p>
                        <p className="text-xs text-brand-400">₹{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQuantity(item.id, -1)} className="rounded-lg bg-[var(--glass-secondary)] p-1 text-text-muted hover:bg-brand-primary/20 hover:text-brand-primary">
                          <HiOutlineMinus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium text-text-primary">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="rounded-lg bg-[var(--glass-secondary)] p-1 text-text-muted hover:bg-brand-primary/20 hover:text-brand-primary">
                          <HiOutlinePlus className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeFromCart(item.id)} className="ml-1 rounded-lg p-1 text-red-400/60 hover:bg-red-500/10 hover:text-red-400">
                          <HiOutlineTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-4 flex justify-between text-lg font-bold text-text-primary">
                  <span>Total</span>
                  <span className="gradient-text">₹{totalPrice.toFixed(2)}</span>
                </div>
                <button className="btn-primary w-full">Place Order</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
