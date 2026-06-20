# ODFE — Odoo Food Experience

**Enterprise Restaurant POS Suite for Odoo 19**

ODFE transforms Odoo into a premium, production-ready Restaurant POS system with modular architecture, real-time kitchen display, self-ordering QR, customer display, advanced analytics, and seamless payment integration.

## Architecture

16 modular Odoo addons:

| Addon | Purpose |
|-------|---------|
| `odfe_base` | Shared models, mixins, base configuration |
| `odfe_auth` | Authentication, employees, roles & permissions |
| `odfe_product` | Product catalog, categories, taxes, UoM |
| `odfe_payment` | Payment methods (cash, card, UPI, QR) |
| `odfe_floor` | Floor & table management |
| `odfe_customer` | Customer profiles & loyalty |
| `odfe_coupon` | Coupons, promotions, discounts |
| `odfe_booking` | Reservations & scheduling |
| `odfe_pos` | Core POS — sessions, orders, cart, receipts |
| `odfe_kds` | Kitchen Display System |
| `odfe_customer_display` | Customer-facing order display |
| `odfe_self_order` | QR-based self ordering |
| `odfe_dashboard` | Sales & analytics dashboards |
| `odfe_reports` | PDF/XLSX reporting |
| `odfe_realtime` | WebSocket & bus real-time sync |

## Tech Stack

- **Framework:** Odoo 19
- **Frontend:** OWL 2, JavaScript ES2023, SCSS
- **Backend:** Python, Odoo ORM, PostgreSQL
- **Charts:** ApexCharts
- **Icons:** Lucide
- **Typography:** Manrope, Space Grotesk, Inter

## Quick Start

```bash
# Clone & setup
git clone <repo> odfe
cd odfe

# Run setup
chmod +x scripts/setup.sh && ./scripts/setup.sh

# Install Odoo dependencies
pip install -r requirements.txt

# Launch with Docker
docker-compose up -d
```

## Design

Premium, minimal, handcrafted UI inspired by Apple, Stripe, Linear, and Square POS. Dark theme with deep forest primary (#05363A), accent green (#32D26B), and 8px grid system.

## License

See LICENSE file.
