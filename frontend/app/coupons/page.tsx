"use client";

import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineTicket,
  HiOutlinePlus,
  HiOutlineClock,
  HiOutlineTag,
} from "react-icons/hi2";

const coupons = [
  { id: 1, code: "WELCOME20", discount: 20, type: "Percent", expiry: "Dec 31, 2026", usageCount: 142, maxUsage: 500, active: true },
  { id: 2, code: "LUNCH10", discount: 10, type: "Percent", expiry: "Sep 30, 2026", usageCount: 89, maxUsage: 200, active: true },
  { id: 3, code: "FLAT5", discount: 5, type: "Fixed", expiry: "Aug 15, 2026", usageCount: 56, maxUsage: 100, active: true },
  { id: 4, code: "VIP50", discount: 50, type: "Percent", expiry: "Dec 31, 2026", usageCount: 23, maxUsage: 50, active: true },
  { id: 5, code: "SUMMER15", discount: 15, type: "Percent", expiry: "Jul 31, 2026", usageCount: 200, maxUsage: 200, active: false },
  { id: 6, code: "FREESHIP", discount: 100, type: "Fixed", expiry: "Jun 30, 2026", usageCount: 340, maxUsage: 1000, active: true },
  { id: 7, code: "BIRTHDAY25", discount: 25, type: "Percent", expiry: "Dec 31, 2026", usageCount: 67, maxUsage: 300, active: true },
  { id: 8, code: "HOLIDAY30", discount: 30, type: "Percent", expiry: "Jan 1, 2027", usageCount: 12, maxUsage: 100, active: false },
];

export default function CouponsPage() {
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
          <HiOutlineTicket className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-bold text-text-primary">Coupons</h1>
        </div>
        <button className="btn-primary ml-auto flex items-center gap-2 text-sm">
          <HiOutlinePlus className="h-4 w-4" />
          Create Coupon
        </button>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="glass-card p-5">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20">
                  <HiOutlineTag className="h-5 w-5 text-brand-400" />
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    coupon.active
                      ? "bg-brand-500/15 text-brand-400"
                      : "bg-surface-500/15 text-text-muted"
                  }`}
                >
                  {coupon.active ? "Active" : "Expired"}
                </span>
              </div>

              <h3 className="font-mono text-lg font-bold tracking-wider text-text-primary">
                {coupon.code}
              </h3>
              <p className="mt-1 text-2xl font-bold gradient-text">
                {coupon.type === "Percent" ? `${coupon.discount}%` : `$${coupon.discount}`}
                <span className="ml-1 text-xs text-text-muted">off</span>
              </p>

              <div className="mt-4 space-y-2 text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <HiOutlineClock className="h-3.5 w-3.5" />
                  Expires {coupon.expiry}
                </div>
                <div className="flex justify-between">
                  <span>Usage</span>
                  <span className="text-text-secondary">
                    {coupon.usageCount}/{coupon.maxUsage}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--glass-secondary)]">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{
                      width: `${Math.min((coupon.usageCount / coupon.maxUsage) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
