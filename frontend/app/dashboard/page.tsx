"use client";

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

const kpis = [
  { label: "Today's Revenue", value: "₹12,458", change: "+12.5%", up: true },
  { label: "Orders", value: "284", change: "+8.2%", up: true },
  { label: "Avg Order", value: "₹43.87", change: "+3.1%", up: true },
  { label: "Active Tables", value: "18/24", change: "75%", up: true },
];

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
  return (
    <div className="flex min-h-screen bg-surface-950">
      <aside className="hidden w-64 shrink-0 border-r border-white/5 p-4 lg:block">
        <Link href="/" className="mb-8 flex items-center gap-2 px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700">
            <span className="text-xs font-extrabold text-white">O</span>
          </div>
          <span className="text-base font-bold text-white">ODFE</span>
        </Link>

        <nav className="space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                item.active
                  ? "bg-brand-500/15 text-brand-400"
                  : "text-surface-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-surface-500">Welcome back, Admin</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-xl p-2.5 text-surface-400 transition-colors hover:bg-white/5 hover:text-white">
              <HiOutlineMagnifyingGlass className="h-5 w-5" />
            </button>
            <button className="relative rounded-xl p-2.5 text-surface-400 transition-colors hover:bg-white/5 hover:text-white">
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
                <p className="text-sm text-surface-400">{kpi.label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{kpi.value}</p>
                <p className="mt-1 text-xs font-medium text-brand-400">
                  {kpi.change}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <div className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Quick Actions</h2>
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
                      className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${action.color} text-white`}
                    >
                      <action.icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-semibold text-white">{action.label}</span>
                    <HiOutlineArrowRight className="mt-2 h-4 w-4 text-surface-500 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="glass-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Recent Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="pb-3 font-medium text-surface-400">Order ID</th>
                    <th className="pb-3 font-medium text-surface-400">Table</th>
                    <th className="pb-3 font-medium text-surface-400">Items</th>
                    <th className="pb-3 font-medium text-surface-400">Total</th>
                    <th className="pb-3 font-medium text-surface-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { id: "#1234", table: "T-05", items: 4, total: "₹67.50", status: "Brewing" },
                    { id: "#1233", table: "T-12", items: 2, total: "₹34.00", status: "Served" },
                    { id: "#1232", table: "T-03", items: 6, total: "₹112.80", status: "Paid" },
                    { id: "#1231", table: "T-08", items: 3, total: "₹52.20", status: "Queued" },
                  ].map((order) => (
                    <tr key={order.id} className="text-surface-300">
                      <td className="py-3 font-medium text-white">{order.id}</td>
                      <td className="py-3">{order.table}</td>
                      <td className="py-3">{order.items} items</td>
                      <td className="py-3 font-medium text-white">{order.total}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
