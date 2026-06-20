"use client";

import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineTv,
  HiOutlineClock,
  HiOutlineCheckCircle,
} from "react-icons/hi2";

interface TicketItem {
  name: string;
  qty: number;
  notes?: string;
}

interface Ticket {
  id: string;
  table: string;
  server: string;
  items: TicketItem[];
  time: string;
  elapsed: string;
}

const columns = {
  new: [
    { id: "#1245", table: "T-01", server: "Alex", items: [{ name: "Espresso", qty: 2 }, { name: "Croissant", qty: 2 }, { name: "Cold Brew", qty: 1 }], time: "2 min ago", elapsed: "2m" },
    { id: "#1246", table: "T-09", server: "Maria", items: [{ name: "Latte", qty: 1 }, { name: "Lemon Tea", qty: 2 }], time: "30s ago", elapsed: "0m" },
  ],
  preparing: [
    { id: "#1244", table: "T-12", server: "Maria", items: [{ name: "Mocha", qty: 1 }, { name: "Brownie", qty: 2 }, { name: "Cookies", qty: 1 }], time: "8 min ago", elapsed: "8m" },
    { id: "#1243", table: "T-05", server: "Alex", items: [{ name: "Americano", qty: 2 }, { name: "Cheesecake", qty: 4 }, { name: "Flat White", qty: 2 }], time: "12 min ago", elapsed: "12m" },
    { id: "#1247", table: "T-02", server: "John", items: [{ name: "Green Tea", qty: 1 }, { name: "Sandwiches", qty: 1 }], time: "5 min ago", elapsed: "5m" },
  ],
  ready: [
    { id: "#1242", table: "T-08", server: "John", items: [{ name: "Espresso", qty: 1 }, { name: "Muffins", qty: 1 }], time: "15 min ago", elapsed: "15m" },
  ],
  done: [
    { id: "#1241", table: "T-03", server: "Maria", items: [{ name: "Latte", qty: 2 }, { name: "Smoothies", qty: 2 }], time: "20 min ago", elapsed: "20m" },
    { id: "#1240", table: "T-15", server: "Alex", items: [{ name: "Flat White", qty: 3 }, { name: "Wraps", qty: 3 }], time: "25 min ago", elapsed: "25m" },
  ],
};

const columnConfig = {
  new: { label: "Queued", color: "border-blue-500/30", headerColor: "text-blue-400", dotColor: "bg-blue-400" },
  preparing: { label: "Brewing", color: "border-amber-500/30", headerColor: "text-amber-400", dotColor: "bg-amber-400" },
  ready: { label: "Ready", color: "border-emerald-500/30", headerColor: "text-emerald-400", dotColor: "bg-emerald-400" },
  done: { label: "Served", color: "border-surface-500/30", headerColor: "text-text-muted", dotColor: "bg-surface-400" },
};

function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-base font-bold text-text-primary">{ticket.id}</span>
        <span className="rounded-lg bg-[var(--glass-border)] px-2 py-0.5 text-xs font-medium text-text-secondary">
          {ticket.table}
        </span>
      </div>
      <p className="mb-2 text-xs text-text-muted">Server: {ticket.server}</p>
      <div className="space-y-1.5">
        {ticket.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">{item.name}</span>
            <span className="font-medium text-text-primary">×{item.qty}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <HiOutlineClock className="h-3 w-3" />
          {ticket.elapsed}
        </span>
        <button className="rounded-lg bg-[var(--glass-secondary)] px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-brand-primary/20 hover:text-brand-primary">
          Advance
        </button>
      </div>
    </div>
  );
}

export default function KitchenPage() {
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
          <HiOutlineTv className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-bold text-text-primary">Brew Bar</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            {columns.new.length} Queued
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400">
            {columns.preparing.length} Brewing
          </span>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(columns) as Array<keyof typeof columns>).map((colKey) => {
            const cfg = columnConfig[colKey];
            return (
              <div key={colKey}>
                <div className="mb-4 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotColor}`} />
                  <h2 className={`text-sm font-semibold ${cfg.headerColor}`}>
                    {cfg.label}
                  </h2>
                  <span className="ml-auto rounded-full bg-[var(--glass-secondary)] px-2 py-0.5 text-xs text-text-muted">
                    {columns[colKey].length}
                  </span>
                </div>
                <div className="space-y-3">
                  {columns[colKey].map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
