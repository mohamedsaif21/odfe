import {
  HiOutlineCurrencyDollar,
  HiOutlineClipboardDocumentList,
  HiOutlineUsers,
  HiOutlineChartBar,
  HiOutlineQueueList,
  HiOutlineCog6Tooth,
  HiOutlineTv,
  HiOutlineQrCode,
  HiOutlineRectangleStack,
} from "react-icons/hi2";

const features = [
  {
    icon: HiOutlineQueueList,
    title: "Point of Sale",
    description:
      "Lightning-fast POS with product cards, cart management, discount popups, and split/tax modifiers.",
    color: "from-brand-500 to-emerald-600",
  },
  {
    icon: HiOutlineTv,
    title: "Kitchen Display",
    description:
      "Realtime KDS with ticket cards, timers, priority flags, and auto-update via WebSocket.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: HiOutlineQrCode,
    title: "Self-Order Kiosk",
    description:
      "QR-based mobile ordering — customers scan, browse, and pay from their own devices.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: HiOutlineRectangleStack,
    title: "Table Management",
    description:
      "Visual floor plan with drag-and-drop tables, status tracking, and booking integration.",
    color: "from-cyan-500 to-blue-600",
  },
  {
    icon: HiOutlineClipboardDocumentList,
    title: "Order Management",
    description:
      "Complete order lifecycle — create, modify, split, merge, and track from start to finish.",
    color: "from-rose-500 to-pink-600",
  },
  {
    icon: HiOutlineCurrencyDollar,
    title: "Payments",
    description:
      "Multi-method payments — cash, card, UPI, QR codes — with automatic change calculation.",
    color: "from-teal-500 to-cyan-600",
  },
  {
    icon: HiOutlineUsers,
    title: "Customer Profiles",
    description:
      "Loyalty programs, order history, preferences, and CRM built right into your POS.",
    color: "from-indigo-500 to-blue-600",
  },
  {
    icon: HiOutlineChartBar,
    title: "Analytics & Reports",
    description:
      "Sales dashboards, revenue reports, PDF/XLSX exports, and real-time KPI cards.",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: HiOutlineCog6Tooth,
    title: "Admin Settings",
    description:
      "Role-based access, employee management, floor configuration, and full system control.",
    color: "from-slate-500 to-gray-600",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative section-padding">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <span className="glass mb-4 inline-block px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-400">
            Features
          </span>
          <h2 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl md:text-5xl">
            Everything Your Restaurant Needs
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
            A complete suite of tools designed for modern restaurants, cafes,
            food trucks, and cloud kitchens.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="glass-card group p-7">
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} text-text-primary shadow-lg`}
              >
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-text-primary">{f.title}</h3>
              <p className="text-sm leading-relaxed text-text-muted">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
