"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineUsers,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineStar,
} from "react-icons/hi2";

const customers = [
  { id: 1, name: "Sarah Johnson", email: "sarah@email.com", phone: "+1 555-0101", loyaltyPoints: 1250, totalSpent: 1842.50, visits: 34, avatar: "SJ" },
  { id: 2, name: "Mike Chen", email: "mike@email.com", phone: "+1 555-0102", loyaltyPoints: 890, totalSpent: 1256.80, visits: 22, avatar: "MC" },
  { id: 3, name: "Emily Davis", email: "emily@email.com", phone: "+1 555-0103", loyaltyPoints: 2100, totalSpent: 3245.00, visits: 56, avatar: "ED" },
  { id: 4, name: "James Wilson", email: "james@email.com", phone: "+1 555-0104", loyaltyPoints: 450, totalSpent: 620.40, visits: 12, avatar: "JW" },
  { id: 5, name: "Lisa Park", email: "lisa@email.com", phone: "+1 555-0105", loyaltyPoints: 1680, totalSpent: 2480.20, visits: 41, avatar: "LP" },
  { id: 6, name: "David Brown", email: "david@email.com", phone: "+1 555-0106", loyaltyPoints: 320, totalSpent: 445.60, visits: 8, avatar: "DB" },
  { id: 7, name: "Anna Kim", email: "anna@email.com", phone: "+1 555-0107", loyaltyPoints: 1950, totalSpent: 2890.00, visits: 48, avatar: "AK" },
  { id: 8, name: "Tom Harris", email: "tom@email.com", phone: "+1 555-0108", loyaltyPoints: 720, totalSpent: 1020.30, visits: 18, avatar: "TH" },
];

export default function CustomersPage() {
  const [search, setSearch] = useState("");

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface-950">
      <header className="flex items-center gap-4 border-b border-border px-6 py-4">
        <Link
          href="/dashboard"
          className="rounded-xl p-2 text-text-muted transition-colors hover:bg-[var(--glass-border)] hover:text-brand-primary"
        >
          <HiOutlineArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <HiOutlineUsers className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-bold text-text-primary">Customers</h1>
        </div>
        <button className="btn-primary ml-auto flex items-center gap-2 text-sm">
          <HiOutlinePlus className="h-4 w-4" />
          Add Customer
        </button>
      </header>

      <div className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-[var(--glass-secondary)] py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-surface-500 outline-none focus:border-brand-500/50"
            />
          </div>
          <div className="text-sm text-text-muted">{filtered.length} customers</div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((customer) => (
            <div key={customer.id} className="glass-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-text-primary">
                  {customer.avatar}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-text-primary">{customer.name}</h3>
                  <p className="truncate text-xs text-text-muted">{customer.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Loyalty Points</span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-amber-400">
                    <HiOutlineStar className="h-3.5 w-3.5" />
                    {customer.loyaltyPoints.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Total Spent</span>
                  <span className="text-sm font-semibold text-brand-400">
                    ${customer.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Visits</span>
                  <span className="text-sm font-medium text-text-secondary">{customer.visits}</span>
                </div>
              </div>

              <button className="mt-4 w-full rounded-xl bg-[var(--glass-secondary)] py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-brand-primary/20 hover:text-brand-primary">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
