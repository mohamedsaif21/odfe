import Link from "next/link";
import {
  HiOutlineUserGroup,
  HiOutlineStar,
  HiOutlineChatBubbleLeftRight,
} from "react-icons/hi2";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Owner, Sakura Bistro",
    content:
      "ODFE transformed our operations. The kitchen display alone reduced order errors by 60%. The self-order kiosk boosted average order value by 25%.",
    rating: 5,
  },
  {
    name: "Marcus Rodriguez",
    role: "Manager, Fiesta Cantina",
    content:
      "We switched from a legacy POS and never looked back. The realtime sync means our floor staff always have accurate table status.",
    rating: 5,
  },
  {
    name: "Priya Patel",
    role: "Founder, Chai & Spice",
    content:
      "The analytics dashboard gives me insights I never had before. I can see peak hours, top dishes, and revenue trends at a glance.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="relative section-padding">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <span className="glass mb-4 inline-block px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-400">
            Testimonials
          </span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl">
            Loved by Restaurant Owners
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="glass-card flex flex-col p-7">
              <div className="mb-4 flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <HiOutlineStar
                    key={i}
                    className="h-5 w-5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-text-secondary">
                &ldquo;{t.content}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-400">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-muted">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
