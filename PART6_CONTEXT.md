# PART6_CONTEXT.md — OdFe SaaS Project State

## Project Overview

**OdFe** is a Next.js 14+ App Router cafe management SaaS with Supabase backend. Multi-tenant (cafe_id on every table), Zustand state management, Tailwind CSS styling.

---

## What's Already Built (Parts 1-5)

### Part 1 — Foundation
- Next.js app with App Router, TypeScript, Tailwind CSS
- Supabase client setup (server, client, middleware)
- Database types (types/database.ts) — all tables: cafes, profiles, employees, customers, product_categories, products, floors, cafe_tables, orders, order_items, kitchen_tickets, kitchen_ticket_items, payment_methods, payments, coupons, promotions, pos_sessions, self_order_tokens, bookings, settings
- Application types (types/app.ts) — AuthUser, CartLine, CartTotals, AppliedCoupon, OrderWithItems, KitchenTicketWithItems, PaymentEntry, DashboardStats, etc.
- Auth service (lib/auth/auth.service.ts) — signInEmployee, restoreSession, signOut
- Role mapper (lib/auth/role-mapper.ts) — nav items, role redirects, resolveAuthenticatedProfile
- Route guards (lib/auth/guards.ts) — ROUTE_ACCESS, hasAccess, isPublicPath
- Zustand stores: auth-store, cart-store, order-store
- UI components: button, input, select, badge, dialog, card, alert, textarea, confirm-dialog, theme-provider
- Layout components: Admin-layout, admin-sidebar, top-header, profile-menu, theme-toggle, page-container
- Middleware for auth protection
- Login/register pages (employee + customer)
- API routes for onboarding (admin, customer) and health

### Part 2 — Tables CRUD (FULLY BUILT)
- app/tables/page.tsx — full CRUD with floors, status management, QR generation
- components/customers/table-list.tsx — grid with floor filter, status badges, edit/delete/QR actions
- components/customers/table-form.tsx — dialog form for add/edit
- components/customers/qr-dialog.tsx — QR code generation and display
- lib/services/table.service.ts — fetchFloors, fetchTables, createTable, updateTable, deleteTable, generateQrCode

### Part 3 — POS & Brew Bar (FULLY BUILT)
- app/pos/page.tsx — full POS with product grid, category tabs, cart, table picker, payment modal, send-to-brew-bar, complete-sale
- app/brew-bar/page.tsx — Kanban columns (To Cook / Preparing / Completed), ticket cards with elapsed timer, stage advancement
- lib/orders/create-order.ts — createOrderWithKitchenTicket + createPaymentForOrder RPC calls
- lib/orders/realtime.ts — subscribeKitchenTickets, fetchKitchenTickets, updateTicketStage
- store/order-store.ts — Zustand store for orders and kitchen tickets
- store/cart-store.ts — Zustand store for cart with computeTotals

### Part 4 — Missing UI (PLACEHOLDER PAGES)
These pages exist as stubs and need full implementation:
- app/orders/page.tsx — placeholder
- app/products/page.tsx — placeholder
- app/categories/page.tsx — placeholder
- app/customers/page.tsx — placeholder
- app/employees/page.tsx — placeholder
- app/payments/page.tsx — placeholder
- app/coupons/page.tsx — placeholder
- app/customer-display/page.tsx — placeholder
- app/dashboard/page.tsx — placeholder
- app/reports/page.tsx — placeholder
- app/settings/page.tsx — placeholder

### Part 5 — Self-Order & Customer Portal (PARTIALLY BUILT)
- app/self-order/page.tsx — basic customer portal with header, menu placeholder
- app/s/[token]/page.tsx — QR-based self-order with public menu display
- app/customer/login/page.tsx — customer login
- app/customer/register/page.tsx — customer registration
- lib/services/self-order.service.ts — resolveSelfOrderToken, fetchPublicMenu, createSelfOrder, fetchCustomerOrders, fetchCustomerOrder
- API routes for customer onboarding

### Part 6 — What Needs to Be Built
The following pages are placeholders and need full CRUD UI implementation:

1. **Orders** (app/orders/page.tsx) — list all orders with status, items, table, payment status; filter by status/date
2. **Products** (app/products/page.tsx) — CRUD for menu items with categories, pricing, availability toggle
3. **Categories** (app/categories/page.tsx) — CRUD for product categories with icons, colors, sort order
4. **Customers** (app/customers/page.tsx) — customer directory with search, loyalty points
5. **Employees** (app/employees/page.tsx) — staff accounts, role management, PIN setup
6. **Payments** (app/payments/page.tsx) — payment records list, refund, payment methods config
7. **Coupons** (app/coupons/page.tsx) — discount codes CRUD, validation rules
8. **Customer Display** (app/customer-display/page.tsx) — second-screen billing display
9. **Dashboard** (app/dashboard/page.tsx) — today's stats, revenue, orders, active tables
10. **Reports** (app/reports/page.tsx) — revenue analytics, top products
11. **Settings** (app/settings/page.tsx) — cafe configuration

### Service Layer (Already Built)
- lib/services/table.service.ts — fetchFloors, fetchTables, createTable, updateTable, deleteTable, generateQrCode
- lib/services/product.service.ts — fetchProducts, fetchProduct, createProduct, updateProduct, toggleProductAvailability, deleteProduct
- lib/services/category.service.ts — fetchCategories, createCategory, updateCategory, deleteCategory
- lib/services/customer.service.ts — fetchCustomers, createCustomer, updateCustomer, addLoyaltyPoints
- lib/services/employee.service.ts — fetchEmployees, createEmployee, updateEmployeeRole, deactivateEmployee, verifyPin
- lib/services/payment.service.ts — fetchPayments, fetchPaymentMethods, refundPayment, getDailyRevenue
- lib/services/coupon.service.ts — fetchCoupons, createCoupon, toggleCoupon, validateCoupon
- lib/services/self-order.service.ts — resolveSelfOrderToken, fetchPublicMenu, createSelfOrder, fetchCustomerOrders, fetchCustomerOrder
- lib/services/_shared.ts — getAuthenticatedProfile, getCafeId, requireRole, normaliseServiceError

### Database RPC Functions Expected (not yet created in Supabase)
- create_order_with_kitchen_ticket(p_cafe_id, p_employee_id, p_customer_id, p_table_id, p_table_label, p_session_id, p_lines JSONB, p_subtotal, p_discount_total, p_tax_total, p_total, p_coupon_code, p_notes) → JSON { order_id, order_number, kitchen_ticket_id }
- create_payment_for_order(p_cafe_id, p_order_id, p_table_id, p_method, p_amount, p_reference) → JSON { payment_id }
- add_loyalty_points(p_customer_id, p_cafe_id, p_points)

### Key Design Decisions
- All pages use "use client" for interactivity
- AdminLayout wraps admin pages with sidebar + top header
- PageContainer + PageHeader for consistent page structure
- Service layer in lib/services/ with getCafeId() for multi-tenant isolation
- RPC functions for atomic order+kitchen ticket creation
- Realtime subscriptions for brew bar ticket updates
- Zustand stores with persist middleware for auth
- Tailwind with custom colors: odfe-teal, odfe-gold, odfe-cream, odfe-sage, odfe-charcoal
- Font: Anton (display), system sans-serif (body)

### Database Tables (all in types/database.ts)
cafes, profiles, employees, customers, product_categories, products, floors, cafe_tables, orders, order_items, kitchen_tickets, kitchen_ticket_items, payment_methods, payments, coupons, promotions, pos_sessions, self_order_tokens, bookings, settings

### RPC Functions Expected (not yet created in Supabase)
- create_order_with_kitchen_ticket(p_cafe_id, p_employee_id, p_customer_id, p_table_id, p_table_label, p_session_id, p_lines JSONB, p_subtotal, p_discount_total, p_tax_total, p_total, p_coupon_code, p_notes) → JSON { order_id, order_number, kitchen_ticket_id }
- create_payment_for_order(p_cafe_id, p_order_id, p_table_id, p_method, p_amount, p_reference) → JSON { payment_id }
- add_loyalty_points(p_customer_id, p_cafe_id, p_points)

### File Inventory

**Pages (app/):**
- page.tsx (home/landing)
- layout.tsx
- login/page.tsx
- register/page.tsx
- dashboard/page.tsx — PLACEHOLDER
- pos/page.tsx — FULLY BUILT
- orders/page.tsx — PLACEHOLDER
- products/page.tsx — PLACEHOLDER
- categories/page.tsx — PLACEHOLDER
- tables/page.tsx — FULLY BUILT
- customers/page.tsx — PLACEHOLDER
- employees/page.tsx — PLACEHOLDER
- payments/page.tsx — PLACEHOLDER
- coupons/page.tsx — PLACEHOLDER
- brew-bar/page.tsx — FULLY BUILT
- customer-display/page.tsx — PLACEHOLDER
- reports/page.tsx — PLACEHOLDER
- settings/page.tsx — PLACEHOLDER
- dashboard/page.tsx — PLACEHOLDER
- self-order/page.tsx — PARTIALLY BUILT
- s/[token]/page.tsx — PARTIALLY BUILT
- customer/login/page.tsx — built
- customer/register/page.tsx — built

**Service Layer (lib/services/) — All Built:**
- _shared.ts — getAuthenticatedProfile, getCafeId, requireRole, normaliseServiceError
- table.service.ts — fetchFloors, fetchTables, createTable, updateTable, deleteTable, generateQrCode
- product.service.ts — fetchProducts, fetchProduct, createProduct, updateProduct, toggleProductAvailability, deleteProduct
- category.service.ts — fetchCategories, createCategory, updateCategory, deleteCategory
- customer.service.ts — fetchCustomers, createCustomer, updateCustomer, addLoyaltyPoints
- employee.service.ts — fetchEmployees, createEmployee, updateEmployeeRole, deactivateEmployee, verifyPin
- payment.service.ts — fetchPayments, fetchPaymentMethods, refundPayment, getDailyRevenue
- coupon.service.ts — fetchCoupons, createCoupon, toggleCoupon, validateCoupon
- self-order.service.ts — resolveSelfOrderToken, fetchPublicMenu, createSelfOrder, fetchCustomerOrders, fetchCustomerOrder

### UI Components (components/ui/)
button.tsx, input.tsx, select.tsx, badge.tsx, dialog.tsx, card.tsx, alert.tsx, textarea.tsx, confirm-dialog.tsx, theme-provider.tsx

### Layout Components (components/layout/)
Admin-layout.tsx, admin-sidebar.tsx, top-header.tsx, profile-menu.tsx, theme-toggle.tsx, page-container.tsx

### Stores (store/)
- auth-store.ts — Zustand with persist (user, isLoading)
- cart-store.ts — Zustand (lines, totals, selectedTable, selectedCustomer, appliedCoupon, addProduct, incrementLine, decrementLine, removeLine, setLineNotes, setTable, setCustomer, applyCoupon, removeCoupon, clearCart)
- order-store.ts — Zustand (activeOrders, kitchenTickets, activeOrderId, upsert/remove/set)

### Auth
- lib/auth/auth.service.ts — signInEmployee, restoreSession, signOut
- lib/auth/role-mapper.ts — ROLE_REDIRECTS, ADMIN_NAV_ITEMS, getNavItemsForRole, isEmployeeRole, isAdminRole, isCustomerRole, resolveAuthenticatedProfile
- lib/auth/guards.ts — ROUTE_ACCESS, hasAccess, isPublicPath, loginPageFor, unauthorizedRedirect
- middleware.ts — auth protection
- store/auth-store.ts — Zustand with persist

### Supabase Clients
- lib/supabase/client.ts — browser client
- lib/supabase/server.ts — server client
- lib/supabase/middleware.ts — middleware client

### API Routes
- app/api/onboarding/admin/route.ts
- app/api/onboarding/customer/route.ts
- app/api/health/route.ts
- app/api/admin/employees/route.ts

### Key Design Patterns
- All pages use "use client" for interactivity
- AdminLayout wraps admin pages with sidebar + header
- PageContainer + PageHeader for consistent page structure
- Service layer in lib/services/ with getCafeId() for multi-tenant isolation
- RPC functions for atomic order+kitchen ticket creation
- Realtime subscriptions for brew bar
- Zustand stores with persist middleware
- Tailwind custom colors: odfe-teal, odfe-gold, odfe-cream, odfe-sage, odfe-charcoal
- Font: Anton (display), system sans-serif (body)
