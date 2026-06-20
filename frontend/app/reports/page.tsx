"use client";

import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineChartBar,
  HiOutlineCurrencyDollar,
  HiOutlineQueueList,
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineDocumentArrowDown,
  HiOutlineCalendarDays,
} from "react-icons/hi2";

const reportTypes = [
  { id: "sales", label: "Sales Report", icon: HiOutlineChartBar, description: "Total sales, items sold, and trends", color: "from-brand-500 to-emerald-600" },
  { id: "revenue", label: "Revenue", icon: HiOutlineCurrencyDollar, description: "Revenue breakdown by period", color: "from-violet-500 to-purple-600" },
  { id: "products", label: "Products", icon: HiOutlineQueueList, description: "Top selling products and inventory", color: "from-amber-500 to-orange-600" },
  { id: "employees", label: "Employees", icon: HiOutlineUsers, description: "Staff performance and hours", color: "from-cyan-500 to-blue-600" },
  { id: "sessions", label: "Sessions", icon: HiOutlineClock, description: "POS session summaries", color: "from-rose-500 to-red-600" },
];

const recentReports = [
  { id: 1, name: "Daily Sales - Jun 19", type: "Sales", generated: "Jun 19, 2026 11:59 PM", size: "2.4 MB" },
  { id: 2, name: "Weekly Revenue - W25", type: "Revenue", generated: "Jun 18, 2026 8:00 AM", size: "5.1 MB" },
  { id: 3, name: "Product Summary - Jun 18", type: "Products", generated: "Jun 18, 2026 11:59 PM", size: "1.8 MB" },
  { id: 4, name: "Employee Hours - June", type: "Employees", generated: "Jun 15, 2026 9:00 AM", size: "890 KB" },
  { id: 5, name: "Session Report - Jun 17", type: "Sessions", generated: "Jun 17, 2026 11:59 PM", size: "1.2 MB" },
];

export default function ReportsPage() {
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
          <HiOutlineChartBar className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-bold text-text-primary">Reports</h1>
        </div>
      </header>

      <div className="p-6">
        {/* Date Range Picker Concept */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-[var(--glass-secondary)] px-4 py-2.5">
            <HiOutlineCalendarDays className="h-4 w-4 text-text-muted" />
            <span className="text-sm text-text-secondary">Jun 1, 2026 — Jun 20, 2026</span>
          </div>
          <div className="flex gap-1.5 rounded-xl bg-[var(--glass-secondary)] p-1">
            {["Today", "This Week", "This Month", "Custom"].map((range) => (
              <button
                key={range}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  range === "This Month"
                    ? "bg-brand-500/20 text-brand-400"
                    : "text-text-muted hover:text-brand-primary"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Report Types */}
        <div className="mb-8">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Generate Report</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {reportTypes.map((report) => (
              <button key={report.id} className="glass-card p-5 text-left">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${report.color}`}>
                  <report.icon className="h-5 w-5 text-text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">{report.label}</h3>
                <p className="mt-1 text-xs text-text-muted">{report.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-text-primary">Recent Reports</h2>
            <button className="btn-primary flex items-center gap-2 text-sm">
              <HiOutlineDocumentArrowDown className="h-4 w-4" />
              Export All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium text-text-muted">Report</th>
                  <th className="px-5 py-3 font-medium text-text-muted">Type</th>
                  <th className="px-5 py-3 font-medium text-text-muted">Generated</th>
                  <th className="px-5 py-3 font-medium text-text-muted">Size</th>
                  <th className="px-5 py-3 font-medium text-text-muted">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentReports.map((report) => (
                  <tr key={report.id} className="text-text-secondary transition-colors hover:bg-[var(--glass-border)]">
                    <td className="px-5 py-3 font-medium text-text-primary">{report.name}</td>
                    <td className="px-5 py-3">{report.type}</td>
                    <td className="px-5 py-3 text-text-muted">{report.generated}</td>
                    <td className="px-5 py-3 text-text-muted">{report.size}</td>
                    <td className="px-5 py-3">
                      <button className="rounded-lg bg-[var(--glass-secondary)] px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-brand-primary/20 hover:text-brand-primary">
                        <HiOutlineDocumentArrowDown className="mr-1 inline h-3.5 w-3.5" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
