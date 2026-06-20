"use client";

import { useState } from "react";
import { LuChevronDown } from "react-icons/lu";

const faqs = [
  {
    q: "What is ODFE?",
    a: "ODFE (Odoo Food Experience) is a full-stack cafe management platform built on Odoo 19. It includes POS, kitchen display, self-ordering, payments, analytics, and more.",
  },
  {
    q: "Is ODFE open source?",
    a: "Yes! ODFE is open source under the LGPL-3.0 license. You can self-host it or use Docker for quick deployment.",
  },
  {
    q: "What payment methods are supported?",
    a: "Cash, card (debit/credit), UPI, and QR code payments are all supported out of the box.",
  },
  {
    q: "Does it work offline?",
    a: "The POS is designed to be resilient with local caching. Orders sync automatically when connectivity is restored via WebSocket.",
  },
  {
    q: "Can I self-order from my phone?",
    a: "Yes! The Self-Order module lets customers scan a QR code at their table, browse the menu, and place orders from their own device.",
  },
  {
    q: "What tech stack is used?",
    a: "OWL 2 for frontend components, JavaScript ES2023, SCSS, Python, PostgreSQL, and WebSocket for realtime features.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="section-padding">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <span className="mb-4 inline-block rounded-full bg-cafe-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cafe-accent">
            FAQ
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="glass-card overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between p-6 text-left"
                aria-expanded={openIndex === i}
              >
                <span className="text-sm font-semibold text-cafe-text font-sans">
                  {faq.q}
                </span>
                <LuChevronDown
                  className={`h-5 w-5 shrink-0 text-cafe-text-secondary transition-transform duration-280 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                  strokeWidth={1.5}
                />
              </button>
              {openIndex === i && (
                <div className="px-6 pb-6 animate-fade-in">
                  <p className="text-sm leading-relaxed text-cafe-text-secondary font-sans">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
