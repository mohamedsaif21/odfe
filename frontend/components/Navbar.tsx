"use client";

import Link from "next/link";
import { useState } from "react";
import {
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineLogin,
} from "react-icons/hi";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass mt-4 flex items-center justify-between px-6 py-3">
          <Logo size={36} showText linked />

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            <Link href="/login" className="btn-secondary !px-5 !py-2.5 text-sm">
              Sign In
            </Link>
            <Link href="/dashboard" className="btn-primary !px-5 !py-2.5 text-sm">
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="rounded-xl p-2 text-text-secondary transition-colors hover:bg-card hover:text-text-primary md:hidden"
          >
            {open ? <HiOutlineX size={22} /> : <HiOutlineMenu size={22} />}
          </button>
        </div>

        {open && (
          <div className="glass-strong mt-2 p-6 md:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">Theme</span>
                <ThemeToggle />
              </div>
              <hr className="border-border" />
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="btn-secondary flex items-center justify-center gap-2 !py-3 text-sm"
              >
                <HiOutlineLogin size={16} />
                Sign In
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="btn-primary flex items-center justify-center gap-2 !py-3 text-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
