"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LuArrowLeft,
  LuMonitor,
  LuClock,
} from "react-icons/lu";
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
  new: {
    label: "Queued",
    dotClass: "bg-cafe-accent",
    headerClass: "text-cafe-accent",
  },
  preparing: {
    label: "Brewing",
    dotClass: "bg-cafe-dark",
    headerClass: "text-cafe-dark",
  },
  ready: {
    label: "Ready",
    dotClass: "bg-cafe-surface",
    headerClass: "text-[#5A6448]",
  },
  done: {
    label: "Served",
    dotClass: "bg-cafe-text-secondary/40",
    headerClass: "text-cafe-text-secondary",
  },
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
            items:
              order.items?.map((i: any) => ({
                name: i.product?.name || "Item",
                qty: i.quantity,
                notes: i.notes,
              })) || [],
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
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const advanceTicket = async (id: string, currentStatus: string) => {
    let nextStatus = "";
    if (currentStatus === "PENDING" || currentStatus === "QUEUED") nextStatus = "BREWING";
    else if (currentStatus === "BREWING") nextStatus = "SERVED";
    else if (currentStatus === "SERVED") nextStatus = "PAID";
    else return;

    try {
      const response = await fetchApi(`/orders/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (response.success) {
        fetchOrders();
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const columns = {
    new: tickets.filter((t) => t.status === "PENDING" || t.status === "QUEUED"),
    preparing: tickets.filter((t) => t.status === "BREWING"),
    ready: tickets.filter((t) => t.status === "SERVED"),
    done: tickets.filter((t) => t.status === "PAID").slice(0, 5),
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-base font-bold text-cafe-text font-display">{ticket.id}</span>
        <span className="badge badge-queued text-xs">{ticket.table}</span>
      </div>
      <p className="mb-2 text-xs text-cafe-text-secondary font-sans">Server: {ticket.server}</p>
      <div className="space-y-1.5">
        {ticket.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm font-sans">
            <span className="text-cafe-text-secondary">{item.name}</span>
            <span className="font-medium text-cafe-text mono-nums">×{item.qty}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-cafe-border pt-3">
        <span className="flex items-center gap-1 text-xs text-cafe-text-secondary font-sans">
          <LuClock className="h-3 w-3" strokeWidth={1.5} />
          {ticket.elapsed}
        </span>
        {ticket.status !== "PAID" && (
          <button
            onClick={() => advanceTicket(ticket.id, ticket.status)}
            className="btn-secondary !px-3 !py-1 !text-xs"
          >
            Advance
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cafe-bg">
      <header className="flex items-center gap-4 border-b border-cafe-border px-6 py-4 bg-cafe-cream/40">
        <Link
          href="/dashboard"
          className="rounded-btn p-2 text-cafe-text-secondary transition-colors hover:text-cafe-accent"
          aria-label="Back to dashboard"
        >
          <LuArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </Link>
        <div className="flex items-center gap-2">
          <LuMonitor className="h-5 w-5 text-cafe-accent" strokeWidth={1.5} />
          <h1 className="text-lg text-cafe-text">Brew Bar</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="badge badge-queued">
            <span className="h-1.5 w-1.5 rounded-full bg-cafe-accent animate-pulse" />
            {columns.new.length} Queued
          </span>
          <span className="badge badge-brewing">
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
                  <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotClass}`} />
                  <h2 className={`text-sm font-semibold font-sans ${cfg.headerClass}`}>
                    {cfg.label}
                  </h2>
                  <span className="ml-auto badge badge-paid text-xs">
                    {columns[colKey].length}
                  </span>
                </div>
                <div className="space-y-3">
                  {loading && tickets.length === 0 ? (
                    <div className="text-sm text-cafe-text-secondary p-4 text-center font-sans">Loading...</div>
                  ) : columns[colKey].length === 0 ? (
                    <div className="glass-card flex items-center justify-center p-6 text-sm text-cafe-text-secondary font-sans">
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
