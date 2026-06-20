"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineClipboardDocumentList,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
} from "react-icons/hi2";

const orders = [
  { id: "#1245", table: "T-01", items: 5, total: "$87.50", status: "New", time: "2 min ago", server: "Alex" },
  { id: "#1244", table: "T-12", items: 3, total: "$42.00", status: "Preparing", time: "8 min ago", server: "Maria" },
  { id: "#1243", table: "T-05", items: 8, total: "$156.20", status: "Preparing", time: "12 min ago", server: "Alex" },
  { id: "#1242", table: "T-08", items: 2, total: "$28.50", status: "Ready", time: "15 min ago", server: "John" },
  { id: "#1241", table: "T-03", items: 4, total: "$64.80", status: "Served", time: "20 min ago", server: "Maria" },
  { id: "#1240", table: "T-15", items: 6, total: "$112.00", status: "Paid", time: "25 min ago", server: "Alex" },
  { id: "#1239", table: "T-10", items: 3, total: "$47.50", status: "Paid", time: "30 min ago", server: "John" },
  { id: "#1238", table: "T-07", items: 7, total: "$134.90", status: "Cancelled", time: "35 min ago", server: "Maria" },
  { id: "#1237", table: "T-02", items: 2, total: "$29.80", status: "Paid", time: "40 min ago", server: "Alex" },
  { id: "#1236", table: "T-11", items: 4, total: "$73.20", status: "Served", time: "45 min ago", server: "John" },
];

const statusColors: Record<string, string> = {
  New: "bg-blue-500/15 text-blue-400",
  Preparing: "bg-amber-500/15 text-amber-400",
  Ready: "bg-emerald-500/15 text-emerald-400",
  Served: "bg-violet-500/15 text-violet-400",
  Paid: "bg-brand-500/15 text-brand-400",
  Cancelled: "bg-red-500/15 text-red-400",
};

const filters = ["All", "New", "Preparing", "Ready", "Served", "Paid", "Cancelled"];

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = orders.filter(
    (o) =>
      (activeFilter === "All" || o.status === activeFilter) &&
      (o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.table.toLowerCase().includes(search.toLowerCase()))
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
          <HiOutlineClipboardDocumentList className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-bold text-text-primary">Orders</h1>
        </div>
      </header>

      <div className="p-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-[var(--glass-secondary)] p-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  activeFilter === f
                    ? "bg-brand-500/20 text-brand-400"
                    : "text-text-muted hover:text-brand-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-border bg-[var(--glass-secondary)] py-2 pl-10 pr-4 text-sm text-text-primary placeholder-surface-500 outline-none focus:border-brand-500/50"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-4 font-medium text-text-muted">Order</th>
                  <th className="px-5 py-4 font-medium text-text-muted">Table</th>
                  <th className="px-5 py-4 font-medium text-text-muted">Server</th>
                  <th className="px-5 py-4 font-medium text-text-muted">Items</th>
                  <th className="px-5 py-4 font-medium text-text-muted">Total</th>
                  <th className="px-5 py-4 font-medium text-text-muted">Status</th>
                  <th className="px-5 py-4 font-medium text-text-muted">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((order) => (
                  <tr key={order.id} className="text-text-secondary transition-colors hover:bg-[var(--glass-border)]">
                    <td className="px-5 py-4 font-medium text-text-primary">{order.id}</td>
                    <td className="px-5 py-4">{order.table}</td>
                    <td className="px-5 py-4">{order.server}</td>
                    <td className="px-5 py-4">{order.items} items</td>
                    <td className="px-5 py-4 font-medium text-text-primary">{order.total}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusColors[order.status] || "bg-surface-500/15 text-text-muted"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-text-muted">{order.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <HiOutlineClipboardDocumentList className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">No orders found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
