"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LuArrowLeft,
  LuShoppingBag,
  LuSearch,
  LuPlus,
  LuMinus,
  LuTrash2,
  LuCreditCard,
  LuBanknote,
  LuSmartphone,
  LuSplit,
} from "react-icons/lu";
import { fetchApi } from "@/utils/api";

interface Category {
  id: string;
  name: string;
  color?: string;
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
          setCategories([{ id: "all", name: "All" }, ...response.data.categories]);
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
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      const response = await fetchApi("/orders", {
        method: "POST",
        body: JSON.stringify(payload),
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

  const paymentOptions = [
    { key: "card", label: "Card", sub: "Credit / Debit", icon: LuCreditCard },
    { key: "cash", label: "Cash", sub: "Pay with cash", icon: LuBanknote },
    { key: "mobile", label: "Mobile Pay", sub: "UPI / Wallet", icon: LuSmartphone },
    { key: "split", label: "Split", sub: "Split payment", icon: LuSplit },
  ];

  return (
    <div className="flex h-screen bg-cafe-bg">
      {/* Left Panel — Products */}
      <div className="flex flex-1 flex-col border-r border-cafe-border">
        <header className="flex items-center gap-4 border-b border-cafe-border px-6 py-4 bg-cafe-cream/40">
          <Link
            href="/dashboard"
            className="rounded-btn p-2 text-cafe-text-secondary transition-colors hover:text-cafe-accent"
            aria-label="Back to dashboard"
          >
            <LuArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2">
            <LuShoppingBag className="h-5 w-5 text-cafe-accent" strokeWidth={1.5} />
            <h1 className="text-lg text-cafe-text">POS</h1>
          </div>
        </header>

        {/* Category tabs */}
        <div className="flex gap-2 border-b border-cafe-border px-6 py-3 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-btn px-4 py-2 text-sm font-medium transition-all duration-220 ${
                activeCategory === cat.id
                  ? "bg-cafe-accent/10 text-cafe-accent"
                  : "text-cafe-text-secondary hover:bg-cafe-accent/5 hover:text-cafe-text"
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
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cafe-text-secondary/50" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-cafe-text-secondary font-sans">Loading products...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-cafe-text-secondary font-sans">No products found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {filtered.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="glass-card flex flex-col items-center p-5 text-center"
                >
                  <span className="mb-2 text-3xl">{product.image || "☕"}</span>
                  <p className="text-sm font-semibold text-cafe-text font-sans">{product.name}</p>
                  <p className="mt-1 text-sm font-bold text-cafe-accent mono-nums">
                    ₹{product.price.toFixed(2)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle Panel — Cart */}
      <div className="flex w-[380px] flex-col border-r border-cafe-border bg-cafe-cream/30">
        <header className="border-b border-cafe-border px-6 py-4">
          <h2 className="text-base font-semibold text-cafe-text font-sans">
            Current Order
            {cart.length > 0 && (
              <span className="ml-2 badge badge-queued">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            )}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-cafe-text-secondary">
              <LuShoppingBag className="mb-3 h-12 w-12 opacity-20" strokeWidth={1} />
              <p className="text-sm font-sans">Cart is empty</p>
              <p className="text-xs font-sans mt-1">Tap a product to add it</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-btn border border-cafe-border bg-white/40 p-3"
                >
                  <span className="text-xl">{item.image || "☕"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-cafe-text font-sans">{item.name}</p>
                    <p className="text-xs text-cafe-accent mono-nums">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="rounded-lg bg-cafe-bg/60 p-1 text-cafe-text-secondary hover:bg-cafe-accent/10 hover:text-cafe-accent transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <LuMinus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-cafe-text mono-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="rounded-lg bg-cafe-bg/60 p-1 text-cafe-text-secondary hover:bg-cafe-accent/10 hover:text-cafe-accent transition-colors"
                      aria-label="Increase quantity"
                    >
                      <LuPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="ml-1 rounded-lg p-1 text-cafe-text-secondary/40 hover:bg-[rgba(180,60,30,0.06)] hover:text-[#B43C1E] transition-colors"
                      aria-label="Remove item"
                    >
                      <LuTrash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-cafe-border p-4">
          <div className="space-y-2 text-sm font-sans">
            <div className="flex justify-between text-cafe-text-secondary">
              <span>Subtotal</span>
              <span className="mono-nums">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-cafe-text-secondary">
              <span>Tax (8%)</span>
              <span className="mono-nums">₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-cafe-border pt-2 text-lg font-bold text-cafe-text">
              <span>Total</span>
              <span className="text-cafe-accent mono-nums">₹{total.toFixed(2)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button disabled={cart.length === 0} className="btn-primary w-full !py-2 !px-0 text-sm">
              Send to Brew Bar
            </button>
            <button disabled={cart.length === 0} className="btn-secondary w-full !py-2 !px-0 text-sm">
              Hold
            </button>
            <button disabled={cart.length === 0} className="btn-secondary w-full !py-2 !px-0 text-sm">
              Print
            </button>
            <button
              disabled={cart.length === 0}
              className="btn-secondary w-full !py-2 !px-0 text-sm !text-[#B43C1E] !border-[rgba(180,60,30,0.15)] hover:!bg-[rgba(180,60,30,0.06)]"
              onClick={() => setCart([])}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel — Payment */}
      <div className="flex w-[320px] flex-col bg-cafe-cream/40 p-6">
        <h2 className="mb-6 text-base text-cafe-text">Payment</h2>

        <div className="space-y-3">
          {paymentOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPaymentMethod(opt.key)}
              className={`flex w-full items-center gap-3 rounded-card border p-4 text-left transition-all duration-220 ${
                paymentMethod === opt.key
                  ? "border-cafe-accent bg-cafe-accent/8"
                  : "border-cafe-border bg-white/30 hover:border-cafe-accent/30 hover:bg-cafe-accent/5"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-btn bg-cafe-accent/10">
                <opt.icon className="h-5 w-5 text-cafe-accent" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-cafe-text font-sans">{opt.label}</p>
                <p className="text-xs text-cafe-text-secondary font-sans">{opt.sub}</p>
              </div>
            </button>
          ))}
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
