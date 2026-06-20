"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineTv,
  HiOutlineClock,
  HiOutlineCheckCircle,
} from "react-icons/hi2";
import { fetchApi } from "@/utils/api";

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
  createdAt: string;
  status: string;
}

const columnConfig = {
  new: { label: "Queued", color: "border-blue-500/30", headerColor: "text-blue-400", dotColor: "bg-blue-400" },
  preparing: { label: "Brewing", color: "border-amber-500/30", headerColor: "text-amber-400", dotColor: "bg-amber-400" },
  ready: { label: "Ready", color: "border-emerald-500/30", headerColor: "text-emerald-400", dotColor: "bg-emerald-400" },
  done: { label: "Served", color: "border-surface-500/30", headerColor: "text-text-muted", dotColor: "bg-surface-400" },
};

export default function KitchenPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const response = await fetchApi("/orders");
      if (response.success && response.data) {
        const formattedTickets = response.data.map((order: any) => {
          const createdAt = new Date(order.createdAt);
          const elapsedMins = Math.floor((Date.now() - createdAt.getTime()) / 60000);
          return {
            id: order.orderNo,
            table: order.table?.name || "Takeaway",
            server: order.user?.name || "System",
            status: order.status,
            createdAt: order.createdAt,
            time: createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            elapsed: `${elapsedMins}m`,
            items: order.items?.map((i: any) => ({
              name: i.product?.name || "Item",
              qty: i.quantity,
              notes: i.notes
            })) || []
          };
        });
        setTickets(formattedTickets);
      }
    } catch (error) {
      console.error("Failed to fetch tickets", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Poll every 10 seconds for real-time feel until socket is added
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const advanceTicket = async (id: string, currentStatus: string) => {
    let nextStatus = "";
    if (currentStatus === "PENDING" || currentStatus === "QUEUED") nextStatus = "BREWING";
    else if (currentStatus === "BREWING") nextStatus = "SERVED";
    else if (currentStatus === "SERVED") nextStatus = "PAID"; // Assuming POS handles PAID mostly, KDS might clear it.
    else return;

    try {
      const response = await fetchApi(`/orders/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.success) {
        fetchOrders(); // Refresh
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const columns = {
    new: tickets.filter(t => t.status === "PENDING" || t.status === "QUEUED"),
    preparing: tickets.filter(t => t.status === "BREWING"),
    ready: tickets.filter(t => t.status === "SERVED"),
    done: tickets.filter(t => t.status === "PAID").slice(0, 5), // show only last 5 paid
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
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
        {ticket.status !== "PAID" && (
          <button 
            onClick={() => advanceTicket(ticket.id, ticket.status)}
            className="rounded-lg bg-[var(--glass-secondary)] px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-brand-primary/20 hover:text-brand-primary"
          >
            Advance
          </button>
        )}
      </div>
    </div>
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
                  {loading && tickets.length === 0 ? (
                    <div className="text-sm text-text-muted p-4 text-center">Loading...</div>
                  ) : columns[colKey].length === 0 ? (
                    <div className="glass-card flex items-center justify-center p-6 text-sm text-text-muted">
                      Empty
                    </div>
                  ) : (
                    columns[colKey].map((ticket) => (
                      <TicketCard key={ticket.id} ticket={ticket} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
