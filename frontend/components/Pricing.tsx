import Link from "next/link";
import { LuCheck } from "react-icons/lu";

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
    description: "For growing cafes with multiple terminals.",
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
    description: "For cafe chains and franchises.",
    features: [
      "Unlimited Terminals",
      "Everything in Pro",
      "Multi-Location",
      "Advanced Reports",
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

export default function Pricing() {
  return (
    <section id="pricing" className="section-padding">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block rounded-full bg-cafe-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cafe-accent">
            Pricing
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-cafe-text-secondary font-sans">
            Start free, upgrade when you need. No hidden fees.
          </p>
        </div>

        {/* Plans */}
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card relative flex flex-col p-8 ${
                plan.popular
                  ? "!border-cafe-accent/30 ring-1 ring-cafe-accent/15"
                  : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cafe-dark px-4 py-1 text-xs font-bold text-white">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg text-cafe-text font-display">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-cafe-text font-display">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-cafe-text-secondary font-sans">{plan.period}</span>
                )}
              </div>
              <p className="mt-3 text-sm text-cafe-text-secondary font-sans">{plan.description}</p>
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-cafe-text-secondary font-sans">
                    <LuCheck className="h-4 w-4 shrink-0 text-cafe-accent" strokeWidth={2} />
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
      </div>
    </section>
  );
}
