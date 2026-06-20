"use client";

import Link from "next/link";
import { useState } from "react";
import { LuMenu, LuX } from "react-icons/lu";
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
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="glass-panel mt-4 flex items-center justify-between px-6 py-3 shadow-nav">
          {/* Logo */}
          <Logo size={38} showText linked />

          {/* Center nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-cafe-text-secondary transition-colors duration-220 hover:text-cafe-text"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="btn-secondary !px-5 !py-2.5 text-sm">
              Sign In
            </Link>
            <Link href="/dashboard" className="btn-primary !px-5 !py-2.5 text-sm">
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="rounded-btn p-2 text-cafe-text-secondary transition-colors hover:text-cafe-text md:hidden"
            aria-label="Toggle navigation"
          >
            {open ? <LuX size={22} /> : <LuMenu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="glass-panel mt-2 p-6 md:hidden animate-fade-up">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-cafe-text-secondary transition-colors hover:text-cafe-text"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-cafe-border" />
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="btn-secondary flex items-center justify-center !py-3 text-sm"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="btn-primary flex items-center justify-center !py-3 text-sm"
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
