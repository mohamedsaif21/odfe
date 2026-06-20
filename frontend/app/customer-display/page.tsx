"use client";

import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineDevicePhoneMobile,
  HiOutlineCheckCircle,
} from "react-icons/hi2";

const orderItems = [
  { name: "Espresso", qty: 2, price: 150 },
  { name: "Croissant", qty: 1, price: 180 },
  { name: "Cappuccino", qty: 2, price: 220 },
  { name: "Blueberry Muffin", qty: 3, price: 160 },
];

const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
const tax = subtotal * 0.08;
const total = subtotal + tax;

export default function CustomerDisplayPage() {
  return (
    <div className="flex min-h-screen bg-surface-950 flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border px-8 py-5">
        <Link
          href="/dashboard"
          className="rounded-xl p-2 text-text-muted transition-colors hover:bg-[var(--glass-border)] hover:text-brand-primary"
        >
          <HiOutlineArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <HiOutlineDevicePhoneMobile className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-bold text-text-primary">Customer Display</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Thank You Message */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/20">
              <HiOutlineCheckCircle className="h-8 w-8 text-brand-400" />
            </div>
            <h2 className="text-3xl font-bold text-text-primary">Your Order</h2>
            <p className="mt-2 text-lg text-text-muted">Table T-05 · Order #1248</p>
          </div>

          {/* Order Items */}
          <div className="glass-card p-6">
            <div className="space-y-4">
              {orderItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--glass-border)] text-sm font-bold text-text-primary">
                      {item.qty}
                    </span>
                    <span className="text-lg text-surface-200">{item.name}</span>
                  </div>
                  <span className="text-lg font-semibold text-text-primary">
                    ₹{(item.price * item.qty).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 space-y-3 border-t border-border pt-6">
              <div className="flex justify-between text-text-muted">
                <span className="text-lg">Subtotal</span>
                <span className="text-lg">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span className="text-lg">Tax (8%)</span>
                <span className="text-lg">₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="text-2xl font-bold text-text-primary">Total</span>
                <span className="text-2xl font-bold gradient-text">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Thank You */}
          <div className="mt-8 text-center">
            <p className="text-xl font-semibold text-brand-400">Thank you for dining with us!</p>
            <p className="mt-2 text-sm text-text-muted">We hope to see you again soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
