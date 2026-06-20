"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlineClipboardDocumentList,
  HiOutlineUsers,
  HiOutlineRectangleStack,
  HiOutlineCalendarDays,
  HiOutlineCurrencyDollar,
  HiOutlineTicket,
  HiOutlineTv,
  HiOutlineDevicePhoneMobile,
  HiOutlineQueueList,
  HiOutlineChartBar,
  HiOutlineCog6Tooth,
  HiOutlineArrowRight,
  HiOutlineBell,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/utils/api";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const quickActions = [
  { label: "Open POS", icon: HiOutlineShoppingBag, href: "/pos", color: "from-brand-500 to-emerald-600" },
  { label: "Brew Bar", icon: HiOutlineTv, href: "/kitchen", color: "from-amber-500 to-orange-600" },
  { label: "Orders", icon: HiOutlineClipboardDocumentList, href: "/orders", color: "from-violet-500 to-purple-600" },
  { label: "Self-Order", icon: HiOutlineDevicePhoneMobile, href: "/self-order", color: "from-cyan-500 to-blue-600" },
];

const sidebarItems = [
  { label: "Dashboard", icon: HiOutlineHome, href: "/dashboard", active: true },
  { label: "POS", icon: HiOutlineShoppingBag, href: "/pos" },
  { label: "Orders", icon: HiOutlineClipboardDocumentList, href: "/orders" },
  { label: "Products", icon: HiOutlineQueueList, href: "/products" },
  { label: "Customers", icon: HiOutlineUsers, href: "/customers" },
  { label: "Tables", icon: HiOutlineRectangleStack, href: "/tables" },
  { label: "Bookings", icon: HiOutlineCalendarDays, href: "/bookings" },
  { label: "Payments", icon: HiOutlineCurrencyDollar, href: "/payments" },
  { label: "Coupons", icon: HiOutlineTicket, href: "/coupons" },
  { label: "Brew Bar", icon: HiOutlineTv, href: "/kitchen" },
  { label: "Customer Display", icon: HiOutlineDevicePhoneMobile, href: "/customer-display" },
  { label: "Self-Order", icon: HiOutlineQueueList, href: "/self-order" },
  { label: "Reports", icon: HiOutlineChartBar, href: "/reports" },
  { label: "Settings", icon: HiOutlineCog6Tooth, href: "/settings" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState([
    { label: "Today's Revenue", value: "₹0", change: "0%", up: true },
    { label: "Orders", value: "0", change: "0%", up: true },
    { label: "Avg Order", value: "₹0", change: "0%", up: true },
    { label: "Active Tables", value: "0/0", change: "0%", up: true },
  ]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetchApi("/dashboard");
        if (response.success && response.data) {
          setKpis(response.data.kpis);
          setRecentOrders(response.data.recentOrders);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div className="flex min-h-screen bg-surface-950">
      <aside className="hidden w-64 shrink-0 border-r border-border p-4 lg:block">
        <Link href="/" className="mb-8 flex items-center gap-2 px-3">
          <Logo size={38} showText linked={false} />
        </Link>

        <nav className="space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                item.active
                  ? "bg-brand-500/15 text-brand-400"
                  : "text-text-muted hover:bg-[var(--glass-border)] hover:text-brand-primary"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
            <p className="text-sm text-text-muted">Welcome back, {user?.name || 'Admin'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-xl p-2.5 text-text-muted transition-colors hover:bg-[var(--glass-border)] hover:text-brand-primary">
              <HiOutlineMagnifyingGlass className="h-5 w-5" />
            </button>
            <button className="relative rounded-xl p-2.5 text-text-muted transition-colors hover:bg-[var(--glass-border)] hover:text-brand-primary">
              <HiOutlineBell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500" />
            </button>
          </div>
        </header>

        <div className="p-6">
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {kpis.map((kpi) => (
              <motion.div key={kpi.label} variants={item} className="glass-card p-5">
                <p className="text-sm text-text-muted">{kpi.label}</p>
                {loading ? (
                  <div className="mt-2 h-8 w-24 rounded bg-surface-800 animate-pulse" />
                ) : (
                  <p className="mt-2 text-2xl font-bold text-text-primary">{kpi.value}</p>
                )}
                <p className={`mt-1 text-xs font-medium ${kpi.up ? 'text-brand-400' : 'text-red-400'}`}>
                  {kpi.change}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <div className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Quick Actions</h2>
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-4 sm:grid-cols-4"
            >
              {quickActions.map((action) => (
                <motion.div key={action.href} variants={item}>
                  <Link
                    href={action.href}
                    className="glass-card group flex flex-col items-center p-6 h-full"
                  >
                    <div
                      className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${action.color} text-text-primary`}
                    >
                      <action.icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">{action.label}</span>
                    <HiOutlineArrowRight className="mt-2 h-4 w-4 text-text-muted transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="glass-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Recent Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 font-medium text-text-muted">Order ID</th>
                    <th className="pb-3 font-medium text-text-muted">Table</th>
                    <th className="pb-3 font-medium text-text-muted">Items</th>
                    <th className="pb-3 font-medium text-text-muted">Total</th>
                    <th className="pb-3 font-medium text-text-muted">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted">Loading orders...</td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted">No recent orders found.</td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="text-text-secondary">
                        <td className="py-3 font-medium text-text-primary">{order.id}</td>
                        <td className="py-3">{order.table}</td>
                        <td className="py-3">{order.items} items</td>
                        <td className="py-3 font-medium text-text-primary">{order.total}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              order.status === "Queued"
                                ? "bg-blue-500/15 text-blue-400"
                                : order.status === "Brewing"
                                ? "bg-amber-500/15 text-amber-400"
                                : order.status === "Served"
                                ? "bg-violet-500/15 text-violet-400"
                                : "bg-brand-500/15 text-brand-400"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
