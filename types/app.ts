/**
 * Application-level types — UI state, cart, form shapes, API responses.
 * Separate from database.ts which mirrors Supabase table rows.
 */

import type { AnyRole, EmployeeRole, OrderStatus, PaymentMethodType } from "./database"

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  role: AnyRole
  fullName: string
  cafeId: string
  cafeName: string
  avatarUrl: string | null
}

export interface Session {
  user: AuthUser | null
  isLoading: boolean
}

// ─── Navigation ─────────────────────────────────────────────────────────────

export interface NavItem {
  label: string
  href: string
  icon: string
  roles: AnyRole[]
  badge?: number
}

export type RoleRedirect = {
  [K in EmployeeRole | "customer"]: string
}

// ─── Cart (POS) ──────────────────────────────────────────────────────────────

export interface CartLine {
  id: string            // client-side uuid
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  taxRate: number
  discount: number
  notes: string | null
}

export interface CartTotals {
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  itemCount: number
}

export interface AppliedCoupon {
  code: string
  discountType: "percentage" | "flat"
  value: number
  discountAmount: number
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export interface OrderWithItems {
  id: string
  orderNumber: string
  status: OrderStatus
  tableLabel: string | null
  customerName: string | null
  employeeName: string | null
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  createdAt: string
}

// ─── Kitchen ─────────────────────────────────────────────────────────────────

export interface KitchenTicketWithItems {
  id: string
  orderId: string
  orderNumber: string
  tableLabel: string | null
  stage: "to_cook" | "preparing" | "completed"
  priority: number
  createdAt: string
  updatedAt: string
  preparingAt: string | null
  completedAt: string | null
  items: Array<{
    productName: string
    quantity: number
    notes: string | null
  }>
  elapsedSeconds: number
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export interface PaymentEntry {
  method: PaymentMethodType
  amount: number
  reference: string | null
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface DailyRevenueStat {
  date: string
  revenue: number
  orders: number
}

export interface TopProduct {
  productId: string
  productName: string
  totalSold: number
  totalRevenue: number
}

export interface DashboardStats {
  todayRevenue: number
  todayOrders: number
  averageOrderValue: number
  activeTables: number
  revenueChange: number  // % vs yesterday
  ordersChange: number
}

// ─── API responses ───────────────────────────────────────────────────────────

export interface ApiResult<T> {
  data: T | null
  error: string | null
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface ToastMessage {
  id: string
  type: "success" | "error" | "info" | "warning"
  title: string
  description?: string
}

export type PageProps<
  P extends Record<string, string> = Record<string, string>
> = {
  params: P
  searchParams?: Record<string, string | string[] | undefined>
}
