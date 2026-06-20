import Link from "next/link";
import {
  HiOutlineClipboardDocumentList,
  HiOutlineCurrencyDollar,
  HiOutlineUsers,
  HiOutlineRectangleStack,
  HiOutlineQueueList,
  HiOutlineTv,
  HiOutlineChartBar,
  HiOutlineCog6Tooth,
  HiOutlineQrCode,
  HiOutlineBookOpen,
} from "react-icons/hi2";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for small cafes and food trucks.",
    features: [
      "1 Terminal",
      "Basic POS",
      "Order Management",
      "Cash Payments",
      "Basic Reports",
      "Email Support",
    ],
    cta: "Get Started",
    href: "/dashboard",
    popular: false,
  },
  {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "For growing restaurants with multiple terminals.",
    features: [
      "5 Terminals",
      "Full POS Suite",
      "Kitchen Display",
      "All Payment Methods",
      "Customer Profiles",
      "Analytics Dashboard",
      "Self-Order Kiosk",
      "Priority Support",
    ],
    cta: "Start Free Trial",
    href: "/dashboard",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For restaurant chains and franchises.",
    features: [
      "Unlimited Terminals",
      "Everything in Pro",
      "Multi-Location",
      "Advanced Reports (PDF/XLSX)",
      "API Access",
      "Custom Integrations",
      "Dedicated Support",
      "SLA Guarantee",
    ],
    cta: "Contact Sales",
    href: "#",
    popular: false,
  },
];

const moduleIcons = [
  HiOutlineClipboardDocumentList,
  HiOutlineCurrencyDollar,
  HiOutlineUsers,
  HiOutlineRectangleStack,
  HiOutlineQueueList,
  HiOutlineTv,
  HiOutlineChartBar,
  HiOutlineCog6Tooth,
  HiOutlineQrCode,
  HiOutlineBookOpen,
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative section-padding">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <span className="glass mb-4 inline-block px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-400">
            Pricing
          </span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl md:text-5xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
            Start free, upgrade when you need. No hidden fees.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card relative flex flex-col p-8 ${
                plan.popular
                  ? "!border-brand-500/40 ring-1 ring-brand-500/20"
                  : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-1 text-xs font-bold text-text-primary">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-text-primary">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-text-muted">{plan.period}</span>
                )}
              </div>
              <p className="mt-3 text-sm text-text-secondary">{plan.description}</p>
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-text-secondary">
                    <svg
                      className="h-4 w-4 shrink-0 text-brand-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`mt-8 block text-center ${
                  plan.popular ? "btn-primary" : "btn-secondary"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-20">
          <h3 className="mb-8 text-center text-xl font-bold text-text-primary">
            All 15 Modules Included
          </h3>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              "Base",
              "Auth",
              "Product",
              "Payment",
              "Floor",
              "Customer",
              "Coupon",
              "Booking",
              "POS",
              "KDS",
              "Display",
              "Self-Order",
              "Dashboard",
              "Reports",
              "Realtime",
            ].map((mod, i) => (
              <div
                key={mod}
                className="glass-card flex flex-col items-center p-4"
              >
                {(() => {
                  const Icon = moduleIcons[i % moduleIcons.length];
                  return <Icon className="mb-2 h-5 w-5 text-brand-400" />;
                })()}
                <span className="text-xs font-medium text-text-muted">
                  odfe_{mod.toLowerCase().replace("-", "_")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
