"use client";

import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineUser,
  HiOutlineCamera,
} from "react-icons/hi2";

export default function ProfileSettingsPage() {
  return (
    <div className="min-h-screen bg-surface-950">
      <header className="flex items-center gap-4 border-b border-border px-6 py-4">
        <Link
          href="/settings"
          className="rounded-xl p-2 text-text-muted transition-colors hover:bg-[var(--glass-border)] hover:text-brand-primary"
        >
          <HiOutlineArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <HiOutlineUser className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-bold text-text-primary">Profile Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl p-6">
        <div className="glass-card p-6">
          {/* Avatar */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-text-primary">
                JD
              </div>
              <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-surface-800 text-text-secondary ring-2 ring-surface-950 hover:bg-surface-700 hover:text-brand-primary">
                <HiOutlineCamera className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-text-muted">Click to change avatar</p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Full Name</label>
              <input
                type="text"
                defaultValue="John Doe"
                className="w-full rounded-xl border border-border bg-[var(--glass-secondary)] px-4 py-2.5 text-sm text-text-primary placeholder-surface-500 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Email</label>
              <input
                type="email"
                defaultValue="john@odfe.com"
                className="w-full rounded-xl border border-border bg-[var(--glass-secondary)] px-4 py-2.5 text-sm text-text-primary placeholder-surface-500 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Role</label>
              <input
                type="text"
                defaultValue="Admin"
                disabled
                className="w-full rounded-xl border border-border bg-[var(--glass-secondary)] px-4 py-2.5 text-sm text-text-muted outline-none"
              />
              <p className="mt-1 text-xs text-text-muted">Contact an administrator to change your role</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Phone</label>
              <input
                type="tel"
                defaultValue="+1 555-0199"
                className="w-full rounded-xl border border-border bg-[var(--glass-secondary)] px-4 py-2.5 text-sm text-text-primary placeholder-surface-500 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button className="btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
