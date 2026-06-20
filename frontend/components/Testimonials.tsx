import { LuStar } from "react-icons/lu";

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
    <section className="section-padding">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <span className="mb-4 inline-block rounded-full bg-cafe-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cafe-accent">
            Testimonials
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl">
            Loved by Cafe Owners
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="glass-card flex flex-col p-7">
              <div className="mb-4 flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <LuStar
                    key={i}
                    className="h-4 w-4 fill-cafe-accent text-cafe-accent"
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-cafe-text-secondary font-sans">
                &ldquo;{t.content}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cafe-accent/10 text-sm font-bold text-cafe-accent">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-cafe-text font-sans">{t.name}</p>
                  <p className="text-xs text-cafe-text-secondary font-sans">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
