"use client";

import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineRectangleStack,
} from "react-icons/hi2";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const tables = [
  { id: "T-01", seats: 2, status: "available" as const, zone: "Indoor" },
  { id: "T-02", seats: 4, status: "occupied" as const, zone: "Indoor", orderSince: "12 min ago" },
  { id: "T-03", seats: 6, status: "reserved" as const, zone: "Indoor", reservedFor: "7:30 PM" },
  { id: "T-04", seats: 2, status: "available" as const, zone: "Indoor" },
  { id: "T-05", seats: 4, status: "occupied" as const, zone: "Patio", orderSince: "25 min ago" },
  { id: "T-06", seats: 8, status: "available" as const, zone: "Private" },
  { id: "T-07", seats: 2, status: "occupied" as const, zone: "Indoor", orderSince: "8 min ago" },
  { id: "T-08", seats: 4, status: "reserved" as const, zone: "Patio", reservedFor: "8:00 PM" },
  { id: "T-09", seats: 6, status: "available" as const, zone: "Patio" },
  { id: "T-10", seats: 2, status: "occupied" as const, zone: "Bar", orderSince: "18 min ago" },
  { id: "T-11", seats: 4, status: "available" as const, zone: "Bar" },
  { id: "T-12", seats: 10, status: "occupied" as const, zone: "Private", orderSince: "42 min ago" },
  { id: "T-13", seats: 2, status: "available" as const, zone: "Indoor" },
  { id: "T-14", seats: 4, status: "reserved" as const, zone: "Indoor", reservedFor: "6:00 PM" },
  { id: "T-15", seats: 6, status: "available" as const, zone: "Patio" },
  { id: "T-16", seats: 2, status: "occupied" as const, zone: "Bar", orderSince: "5 min ago" },
];

const statusConfig = {
  available: { label: "Available", color: "border-emerald-500/40 bg-emerald-500/10", dot: "bg-emerald-400", text: "text-emerald-400" },
  occupied: { label: "Occupied", color: "border-amber-500/40 bg-amber-500/10", dot: "bg-amber-400", text: "text-amber-400" },
  reserved: { label: "Reserved", color: "border-violet-500/40 bg-violet-500/10", dot: "bg-violet-400", text: "text-violet-400" },
};

export default function TablesPage() {
  const available = tables.filter((t) => t.status === "available").length;
  const occupied = tables.filter((t) => t.status === "occupied").length;
  const reserved = tables.filter((t) => t.status === "reserved").length;

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
          <HiOutlineRectangleStack className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-bold text-text-primary">Table Management</h1>
        </div>
      </header>

      <div className="p-6">
        {/* Legend */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          {(["available", "occupied", "reserved"] as const).map((status) => {
            const cfg = statusConfig[status];
            return (
              <div key={status} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-sm text-text-muted">
                  {cfg.label} — {status === "available" ? available : status === "occupied" ? occupied : reserved}
                </span>
              </div>
            );
          })}
        </div>

        {/* Floor Plan Grid */}
        <motion.div 
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {tables.map((table) => {
            const cfg = statusConfig[table.status];
            return (
              <motion.div
                key={table.id}
                variants={item}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`glass-card border ${cfg.color} cursor-pointer p-5`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-text-primary">{table.id}</h3>
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
                    <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {table.seats} seats · {table.zone}
                </p>
                {table.orderSince && (
                  <p className="mt-2 text-xs text-amber-400/80">Order since {table.orderSince}</p>
                )}
                {table.reservedFor && (
                  <p className="mt-2 text-xs text-violet-400/80">Reserved for {table.reservedFor}</p>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
