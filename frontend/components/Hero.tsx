import Link from "next/link";
import {
  LuZap,
  LuMonitor,
  LuSmartphone,
  LuChartBar,
} from "react-icons/lu";

const highlights = [
  {
    icon: LuZap,
    label: "Smart POS",
    sub: "Fast billing and order management.",
  },
  {
    icon: LuMonitor,
    label: "Kitchen Display",
    sub: "Track every order in real time.",
  },
  {
    icon: LuSmartphone,
    label: "QR Self Ordering",
    sub: "Customers order from their table.",
  },
  {
    icon: LuChartBar,
    label: "Business Analytics",
    sub: "Monitor sales and performance.",
  },
];

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center pt-24">
      {/* Subtle warm ambient glow */}
      <div className="pointer-events-none absolute top-32 left-1/4 h-80 w-80 rounded-full bg-cafe-accent/8 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-32 right-1/3 h-64 w-64 rounded-full bg-cafe-surface/40 blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Tag */}
          <div className="glass-panel mb-8 inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-cafe-accent tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-cafe-accent" />
            Odoo 19 · OWL · PostgreSQL · WebSocket
          </div>

          {/* Headline */}
          <h1 className="max-w-4xl text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Everything Your{" "}
            <span className="text-cafe-accent">Cafe</span>
            <br />
            Needs in One Platform
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-base text-cafe-text-secondary sm:text-lg md:text-xl font-sans leading-relaxed">
            ODFE is a complete Odoo 19 powered Cafe Point of Sale platform — 
            integrated POS, Kitchen Display, QR Self Ordering, Analytics, 
            and everything in between.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link href="/dashboard" className="btn-primary flex items-center gap-2 text-base">
              Launch POS
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="#features" className="btn-secondary text-base">
              Explore Features
            </Link>
          </div>

          {/* Highlight cards */}
          <div className="mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="glass-card flex flex-col items-center p-5 hover:translate-y-[-4px]"
              >
                <item.icon className="mb-2 h-6 w-6 text-cafe-accent" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-cafe-text font-sans">
                  {item.label}
                </span>
                <span className="mt-1 text-xs text-cafe-text-secondary text-center">
                  {item.sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cafe-bg to-transparent" />
    </section>
  );
}
