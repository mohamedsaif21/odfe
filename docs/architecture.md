# Architecture

## Overview

ODFE follows a modular Odoo 19 architecture with 16 specialized addons. Each addon encapsulates a bounded domain context, following Domain-Driven Design principles.

## Module Dependency Graph

```
odfe_base
  ├── odfe_auth
  ├── odfe_product
  ├── odfe_payment
  ├── odfe_floor
  ├── odfe_customer
  ├── odfe_coupon
  ├── odfe_booking
  ├── odfe_realtime
  ├── odfe_kds
  ├── odfe_customer_display
  ├── odfe_self_order
  ├── odfe_pos
  │     ├── odfe_dashboard
  │     └── odfe_reports
  └── ...
```

## Frontend Architecture

OWL 2 components organized by feature:

```
src/
  services/    — API, payment, kitchen, customer, promotion, websocket
  screens/     — Full-page views (Login, POS, Payment, Receipt, etc.)
  components/  — Reusable UI components (ProductCard, Cart, etc.)
  utils/       — Shared utilities
```

## Data Flow

1. POS terminal → OWL components → API service → Odoo Controllers
2. Controllers → Odoo ORM models → PostgreSQL
3. Realtime updates via WebSocket bus
4. KDS receives live order updates
5. Customer display shows real-time order status
