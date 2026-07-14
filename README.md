# ☕ Premium Cafe POS

[![Next.js](https://img.shields.io/badge/Next.js-14.2.0-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-SSR-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Zustand](https://img.shields.io/badge/State-Zustand-443322?style=for-the-badge)](https://github.com/pmndrs/zustand)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

An enterprise-grade, highly responsive **Multi-Tenant Point of Sale (POS) and Kitchen Management System** engineered specifically for premium cafes. Built on top of **Next.js 14 (App Router)**, **Supabase SSR**, and **Zustand**, the platform delivers absolute precision in real-time order tracking, state synchronisation, and rigorous data isolation.

---

## 🏗️ Architectural Core Pillars

### 1. Robust Multi-Tenant Isolation (Row-Level Security)
Every database table—from core `cafes` configuration to transactional `orders` and `kitchen_tickets`—features strict isolation using a tenant grouping vector (`cafe_id`). 
* **Automatic Scoping:** Server operations leverage `createServerClient` via `@supabase/ssr` to read session tokens directly from secure HTTP-only cookies, automatically evaluating Supabase Row-Level Security (RLS) policies based on the authenticated context.
* **Administrative Operations:** High-privilege administrative tasks utilize a secure `createAdminClient` via the Supabase Service Role Key, entirely bypassing RLS on isolated, trusted server-side execution cycles.
* **RLS Hardening:** Apply `supabase/rls_hardening.sql` after the base schema/seed SQL. It replaces broad cafe-wide policies with role-specific policies for admin, cashier, kitchen, customer, and public QR visitors.
* **E2E Journey SQL:** Apply `supabase/e2e_journey_support.sql` after the base schema/seed SQL. It provides the admin onboarding and employee creation RPCs used by the app.

### 2. Decoupled, Atomic State Management Engine
The client layer implements a granular, decoupled reactive store system powered by **Zustand**. Instead of relying on monolithic state topologies, runtime contexts are separated across highly focused, atomic memory stores:
* **`useCartStore`:** Manages client-side cart lines, atomic mutations (increment, decrement, custom operational notes), and real-time reactive calculations for multi-tier discounts (item-level vs. flat/percentage coupon validation).
* **`useOrderStore`:** Regulates structural layout synchronization between active front-of-house POS orders and real-time back-of-house kitchen stage ticket states (`to_cook` → `preparing` → `completed`).
* **`useAuthStore`:** Safely handles encrypted persistent authentication state structures using localized client storage middleware.

### 3. Modular Service Design Pattern
Database interactions are entirely abstracted into clear domain-driven boundary services (`product.service`, `category.service`, `table.service`, etc.). Services consistently expose strict input-validation layers paired with robust TypeScript typing generated directly from the live PostgreSQL schema.

---

## 🛠️ Tech Stack & Key Dependencies

* **Framework:** Next.js 14.2.0 (App Router, Server Actions, Server Components)
* **Language:** TypeScript 5.3.3 (Strict Type System matching Supabase definitions)
* **Database & Auth:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
* **State Management:** Zustand 4.5.0 (with targeted persistence middleware)
* **Styling System:** Tailwind CSS 3.4.1, `clsx`, `tailwind-merge`
* **Data Utility & Export:** `xlsx` (Excel Reporting Engine), `jspdf` (Invoice Generation)
* **Real-time Utility:** `qrcode` (Dynamic table tokens generation for customer self-ordering)

---

## 🗂️ System Anatomy & Repository Blueprint

```bash
├── app/                      # Next.js App Router Structure
│   ├── categories/           # Category administration dashboard entries
│   ├── coupons/              # Discount code & automated promotion portals
│   ├── customers/            # High-fidelity directory & customer loyalty points tracker
│   ├── employees/            # Granular staff role controls & secure PIN management
│   ├── payments/             # Centralized financial transaction accounting journals
│   ├── products/             # Premium interactive menu control management
│   └── tables/               # Dynamic visual floor layouts and QR token handlers
├── components/               # Custom UI Component Architecture
│   ├── layout/               # High-fidelity Shell, Sidebar, and Navigation Primitives
│   └── ui/                   # High-polish design tokens (Dialogs, Buttons, Alerts, Badges)
├── lib/                      # Architecture Foundation Infrastructure
│   ├── services/             # Pure functional database operations data layers
│   │   ├── _shared.ts        # Common middleware and session extraction helpers
│   │   └── *.service.ts      # Domain-specific persistence endpoints
│   └── supabase/             # Client/Server context initialization vectors
├── store/                    # Decoupled React memory synchronization layers
│   ├── auth-store.ts         # Session state engine
│   ├── cart-store.ts         # High-precision real-time transactional math accumulator
│   └── order-store.ts        # In-memory kitchen routing visual matrix
└── types/                    # Domain Type Specifications
    ├── database.ts           # Exact mirrored representation of the remote schema
    └── app.ts                # Ephemeral UI states, cart contracts, and API structures

---

## 💎 Premium Component Design Tokens
The user interface relies entirely on tailored, production-grade design micro-primitives constructed around clean, desaturated aesthetics. Key styling properties focus heavily on sophisticated tones like deep Charcoal (#2D3748), rich Teal (#0D9488), Muted Sage, and soft Cream, completely skipping distracting primary colors.

Button.tsx: Custom component featuring specific variations (default, outline, ghost, secondary) combined beautifully via tailwind-merge.
Dialog.tsx & ConfirmDialog.tsx: Native React portals built around semantic focus controls, programmatic ESC-key handlers, and body overflow locks.
Alert.tsx: Muted functional alert boxes matching status configurations via specialized semantic design vectors.

## 🚀 Setting Up Local Development
1. Environmental Variables Configuration
Create a .env.local file in the root of the workspace:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_private_high_privilege_service_key
2. Dependency Installation
npm install
3. Initiate Dev Server
npm run dev
4. Code Quality & Formatting Check
npm run lint
README.md Displaying README.md.
