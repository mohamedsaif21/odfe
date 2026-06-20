"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineClipboardDocumentList,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
} from "react-icons/hi2";
import { fetchApi } from "@/utils/api";

const statusColors: Record<string, string> = {
  PENDING: "bg-blue-500/15 text-blue-400",
  QUEUED: "bg-blue-500/15 text-blue-400",
  BREWING: "bg-amber-500/15 text-amber-400",
  SERVED: "bg-emerald-500/15 text-emerald-400",
  PAID: "bg-brand-500/15 text-brand-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

const filters = ["All", "PENDING", "QUEUED", "BREWING", "SERVED", "PAID", "CANCELLED"];

interface Order {
  id: string;
  orderNo: string;
  table: string;
  items: number;
  total: string;
  status: string;
  time: string;
  server: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetchApi("/orders");
        if (response.success && response.data) {
          const formattedOrders = response.data.map((order: any) => ({
            id: order.orderNo,
            orderNo: order.orderNo,
            table: order.table?.name || "Takeaway",
            items: order.items?.length || 0,
            total: `₹${Number(order.total || 0).toFixed(2)}`,
            status: order.status,
            time: new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            server: order.user?.name || "System"
          }));
          setOrders(formattedOrders);
        }
      } catch (error) {
        console.error("Failed to load orders", error);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

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
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-text-muted">
                      Loading orders...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center">
                        <HiOutlineClipboardDocumentList className="mb-3 h-10 w-10 opacity-30" />
                        <p className="text-sm">No orders found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
