import Link from "next/link";
import { LuHeart } from "react-icons/lu";
import Logo from "./Logo";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "POS System", href: "/pos" },
    { label: "Kitchen Display", href: "/kitchen" },
  ],
  Company: [
    { label: "About", href: "#about" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Support", href: "#" },
    { label: "Status", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "License", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-cafe-border bg-cafe-bg">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Logo size={38} showText linked={false} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cafe-text-secondary font-sans">
              The premium cafe management platform built on Odoo 19.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-cafe-text-secondary font-sans">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-cafe-text-secondary font-sans transition-colors duration-220 hover:text-cafe-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-cafe-border pt-8 sm:flex-row">
          <p className="text-xs text-cafe-text-secondary font-sans">
            &copy; {new Date().getFullYear()} ODFE. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-xs text-cafe-text-secondary font-sans">
            Built with <LuHeart className="h-3 w-3 text-cafe-accent" strokeWidth={1.5} /> on Odoo 19
          </p>
        </div>
      </div>
    </footer>
  );
}
