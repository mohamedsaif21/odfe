import {
  LuLayoutGrid,
  LuMonitor,
  LuQrCode,
  LuTableProperties,
  LuClipboardList,
  LuCreditCard,
  LuUsers,
  LuChartBar,
  LuSettings,
} from "react-icons/lu";

const features = [
  {
    icon: LuLayoutGrid,
    title: "Point of Sale",
    description:
      "Lightning-fast POS with product cards, cart management, discount popups, and split/tax modifiers.",
  },
  {
    icon: LuMonitor,
    title: "Kitchen Display",
    description:
      "Realtime KDS with ticket cards, timers, priority flags, and auto-update via WebSocket.",
  },
  {
    icon: LuQrCode,
    title: "Self-Order Kiosk",
    description:
      "QR-based mobile ordering — customers scan, browse, and pay from their own devices.",
  },
  {
    icon: LuTableProperties,
    title: "Table Management",
    description:
      "Visual floor plan with drag-and-drop tables, status tracking, and booking integration.",
  },
  {
    icon: LuClipboardList,
    title: "Order Management",
    description:
      "Complete order lifecycle — create, modify, split, merge, and track from start to finish.",
  },
  {
    icon: LuCreditCard,
    title: "Payments",
    description:
      "Multi-method payments — cash, card, UPI, QR codes — with automatic change calculation.",
  },
  {
    icon: LuUsers,
    title: "Customer Profiles",
    description:
      "Loyalty programs, order history, preferences, and CRM built right into your POS.",
  },
  {
    icon: LuChartBar,
    title: "Analytics & Reports",
    description:
      "Sales dashboards, revenue reports, PDF/XLSX exports, and real-time KPI cards.",
  },
  {
    icon: LuSettings,
    title: "Admin Settings",
    description:
      "Role-based access, employee management, floor configuration, and full system control.",
  },
];

export default function Features() {
  return (
    <section id="features" className="section-padding">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block rounded-full bg-cafe-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cafe-accent">
            Features
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl">
            Everything Your Cafe Needs
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-cafe-text-secondary font-sans">
            A complete suite of tools designed for modern cafes,
            restaurants, food trucks, and cloud kitchens.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="glass-card group p-7">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-cafe-accent/10">
                <f.icon className="h-5 w-5 text-cafe-accent" strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 text-lg text-cafe-text font-display">{f.title}</h3>
              <p className="text-sm leading-relaxed text-cafe-text-secondary font-sans">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
