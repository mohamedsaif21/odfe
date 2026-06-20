"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuLayoutDashboard,
  LuShoppingBag,
  LuClipboardList,
  LuPackage,
  LuUsers,
  LuLayoutGrid,
  LuCalendarDays,
  LuCreditCard,
  LuTicket,
  LuMonitor,
  LuSmartphone,
  LuQrCode,
  LuChartBar,
  LuSettings,
  LuArrowRight,
  LuBell,
  LuSearch,
  LuTrendingUp,
  LuTrendingDown,
} from "react-icons/lu";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/utils/api";

const quickActions = [
  { label: "Open POS", icon: LuShoppingBag, href: "/pos" },
  { label: "Brew Bar", icon: LuMonitor, href: "/kitchen" },
  { label: "Orders", icon: LuClipboardList, href: "/orders" },
  { label: "Self-Order", icon: LuSmartphone, href: "/self-order" },
];

const sidebarItems = [
  { label: "Dashboard", icon: LuLayoutDashboard, href: "/dashboard" },
  { label: "POS", icon: LuShoppingBag, href: "/pos" },
  { label: "Orders", icon: LuClipboardList, href: "/orders" },
  { label: "Products", icon: LuPackage, href: "/products" },
  { label: "Customers", icon: LuUsers, href: "/customers" },
  { label: "Tables", icon: LuLayoutGrid, href: "/tables" },
  { label: "Bookings", icon: LuCalendarDays, href: "/bookings" },
  { label: "Payments", icon: LuCreditCard, href: "/payments" },
  { label: "Coupons", icon: LuTicket, href: "/coupons" },
  { label: "Brew Bar", icon: LuMonitor, href: "/kitchen" },
  { label: "Customer Display", icon: LuSmartphone, href: "/customer-display" },
  { label: "Self-Order", icon: LuQrCode, href: "/self-order" },
  { label: "Reports", icon: LuChartBar, href: "/reports" },
  { label: "Settings", icon: LuSettings, href: "/settings" },
];

const statusBadge: Record<string, string> = {
  Queued: "badge badge-queued",
  Brewing: "badge badge-brewing",
  Served: "badge badge-served",
  Paid: "badge badge-paid",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const pathname = usePathname();
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
    <div className="flex min-h-screen bg-cafe-bg">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-cafe-border bg-cafe-cream/60 p-4 lg:block">
        <Link href="/" className="mb-8 flex items-center gap-2 px-3 pt-2">
          <Logo size={34} showText linked={false} />
        </Link>

        <nav className="space-y-0.5">
          {sidebarItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-all duration-220 ${
                  active
                    ? "bg-cafe-accent/10 text-cafe-accent"
                    : "text-cafe-text-secondary hover:bg-cafe-accent/5 hover:text-cafe-text"
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-cafe-border px-6 py-4 bg-cafe-cream/40">
          <div>
            <h1 className="text-xl text-cafe-text">Dashboard</h1>
            <p className="text-sm text-cafe-text-secondary font-sans mt-0.5">
              Welcome back, {user?.name || "Admin"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-btn p-2.5 text-cafe-text-secondary transition-colors hover:bg-cafe-accent/5 hover:text-cafe-accent"
              aria-label="Search"
            >
              <LuSearch className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>
            <button
              className="relative rounded-btn p-2.5 text-cafe-text-secondary transition-colors hover:bg-cafe-accent/5 hover:text-cafe-accent"
              aria-label="Notifications"
            >
              <LuBell className="h-[18px] w-[18px]" strokeWidth={1.5} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cafe-accent" />
            </button>
          </div>
        </header>

        <div className="p-6">
          {/* KPI Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="glass-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-cafe-text-secondary font-sans">
                  {kpi.label}
                </p>
                {loading ? (
                  <div className="mt-3 h-8 w-24 rounded-lg bg-cafe-warm/50 animate-pulse" />
                ) : (
                  <p className="mt-3 text-2xl font-bold text-cafe-text font-display">
                    {kpi.value}
                  </p>
                )}
                <div className={`mt-2 flex items-center gap-1 text-xs font-medium font-sans ${
                  kpi.up ? "text-[#5A6448]" : "text-[#B43C1E]"
                }`}>
                  {kpi.up ? (
                    <LuTrendingUp className="h-3 w-3" strokeWidth={2} />
                  ) : (
                    <LuTrendingDown className="h-3 w-3" strokeWidth={2} />
                  )}
                  {kpi.change}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h2 className="mb-4 text-lg text-cafe-text">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="glass-card group flex flex-col items-center p-6"
                >
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-cafe-accent/10">
                    <action.icon className="h-5 w-5 text-cafe-accent" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-semibold text-cafe-text font-sans">
                    {action.label}
                  </span>
                  <LuArrowRight className="mt-2 h-4 w-4 text-cafe-text-secondary/40 transition-transform duration-220 group-hover:translate-x-1 group-hover:text-cafe-accent" strokeWidth={1.5} />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="glass-panel p-6">
            <h2 className="mb-4 text-lg text-cafe-text">Recent Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-sans">
                <thead>
                  <tr className="border-b border-cafe-border">
                    <th className="pb-3 font-medium text-cafe-text-secondary text-xs uppercase tracking-wider">Order ID</th>
                    <th className="pb-3 font-medium text-cafe-text-secondary text-xs uppercase tracking-wider">Table</th>
                    <th className="pb-3 font-medium text-cafe-text-secondary text-xs uppercase tracking-wider">Items</th>
                    <th className="pb-3 font-medium text-cafe-text-secondary text-xs uppercase tracking-wider">Total</th>
                    <th className="pb-3 font-medium text-cafe-text-secondary text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cafe-border/50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-cafe-text-secondary">
                        Loading orders...
                      </td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-cafe-text-secondary">
                        No recent orders found.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="text-cafe-text-secondary hover:bg-cafe-cream/30 transition-colors duration-220">
                        <td className="py-3 font-medium text-cafe-text">{order.id}</td>
                        <td className="py-3">{order.table}</td>
                        <td className="py-3">{order.items} items</td>
                        <td className="py-3 font-medium text-cafe-text mono-nums">{order.total}</td>
                        <td className="py-3">
                          <span className={statusBadge[order.status] || "badge badge-queued"}>
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
