"use client";

import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineCog6Tooth,
  HiOutlineBuildingStorefront,
  HiOutlineShoppingBag,
  HiOutlineCurrencyDollar,
  HiOutlineBell,
  HiOutlineShieldCheck,
  HiOutlineUser,
  HiOutlineChevronRight,
} from "react-icons/hi2";

const settingsSections = [
  { id: "general", label: "General", icon: HiOutlineBuildingStorefront, description: "Store name, logo, timezone, and basic settings", href: "#" },
  { id: "pos", label: "POS Settings", icon: HiOutlineShoppingBag, description: "Receipt format, order prefixes, and POS behavior", href: "#" },
  { id: "payments", label: "Payments", icon: HiOutlineCurrencyDollar, description: "Payment methods, tax rates, and currency settings", href: "#" },
  { id: "notifications", label: "Notifications", icon: HiOutlineBell, description: "Email alerts, push notifications, and sound settings", href: "#" },
  { id: "roles", label: "Roles & Permissions", icon: HiOutlineShieldCheck, description: "Manage staff roles, access control, and permissions", href: "#" },
  { id: "profile", label: "Profile", icon: HiOutlineUser, description: "Your account information, password, and preferences", href: "/settings/profile" },
];

export default function SettingsPage() {
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
          <HiOutlineCog6Tooth className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-bold text-text-primary">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl p-6">
        <div className="space-y-3">
          {settingsSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="glass-card flex items-center gap-4 p-5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--glass-border)]">
                <section.icon className="h-5 w-5 text-brand-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-text-primary">{section.label}</h3>
                <p className="mt-0.5 text-xs text-text-muted">{section.description}</p>
              </div>
              <HiOutlineChevronRight className="h-5 w-5 text-text-muted" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
