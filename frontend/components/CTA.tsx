import Link from "next/link";

export default function CTA() {
  return (
    <section className="section-padding">
      <div className="mx-auto max-w-4xl text-center">
        <div className="glass-panel relative overflow-hidden p-10 sm:p-16">
          {/* Subtle ambient glows */}
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-cafe-accent/10 blur-[60px]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cafe-surface/30 blur-[60px]" />

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl">
              Ready to Transform Your
              <br />
              <span className="text-cafe-accent">Cafe Experience?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-cafe-text-secondary font-sans">
              Join thousands of cafes already using ODFE to streamline
              operations, delight customers, and boost revenue.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="btn-primary flex items-center gap-2 text-base"
              >
                Get Started Free
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
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
