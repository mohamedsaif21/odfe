import Link from "next/link";

export default function CTA() {
  return (
    <section className="relative section-padding">
      <div className="mx-auto max-w-4xl text-center">
        <div className="glass-strong relative overflow-hidden p-10 sm:p-16">
          <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-brand-400/15 blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-text-primary sm:text-4xl md:text-5xl">
              Ready to Transform Your
              <br />
              <span className="gradient-text">Restaurant Experience?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-text-secondary">
              Join thousands of restaurants already using ODFE to streamline
              operations, delight customers, and boost revenue.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="btn-primary flex items-center gap-2 text-base"
              >
                Get Started Free
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              <Link href="/login" className="btn-secondary text-base">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
