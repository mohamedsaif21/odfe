"use client";

import { useEffect, useState } from "react";

const stats = [
  { label: "Orders Processed", value: 1240000, suffix: "+" },
  { label: "Active Restaurants", value: 2400, suffix: "+" },
  { label: "Table Turnover", value: 98, suffix: "%" },
  { label: "Uptime", value: 99.9, suffix: "%" },
];

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <span className="text-4xl font-bold text-cafe-text font-display sm:text-5xl">
      {formatNumber(count)}
      {suffix}
    </span>
  );
}

export default function Stats() {
  return (
    <section id="about" className="section-padding">
      <div className="mx-auto max-w-6xl">
        <div className="glass-panel mx-auto max-w-4xl p-10 sm:p-16">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <CountUp target={s.value} suffix={s.suffix} />
                <p className="mt-2 text-sm text-cafe-text-secondary font-sans">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
