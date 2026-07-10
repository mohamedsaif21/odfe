# PROJECT_CONTEXT.md — Premium Cafe POS

## 1. package.json

```json
{
  "name": "premium-cafe-pos",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.12.0",
    "@supabase/supabase-js": "^2.39.0",
    "clsx": "^2.1.0",
    "jspdf": "^2.5.1",
    "lucide-react": "^0.344.0",
    "next": "14.2.0",
    "next-themes": "^0.4.6",
    "qrcode": "^1.5.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwind-merge": "^2.2.0",
    "xlsx": "^0.18.5",
    "zod": "^3.22.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3"
  }
}
```

## 2. types/database.ts

```ts
/**
 * Database types — generated to match the Supabase schema.
 * Day 2 will wire these against the real Supabase table definitions.
 * Every table includes cafe_id for row-level multi-tenant isolation.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Role enums ────────────────────────────────────────────────────────────

export type EmployeeRole = "admin" | "cashier" | "kitchen"
export type CustomerRole = "customer"
export type AnyRole = EmployeeRole | CustomerRole

export type OrderStatus =
  | "draft"
  | "sent_to_kitchen"
  | "to_cook"
  | "preparing"
  | "completed"
  | "paid"
  | "cancelled"

export type KitchenStage = "to_cook" | "preparing" | "completed"

export type PaymentMethodType = "cash" | "card" | "upi" | "split"

export type TableStatus = "available" | "occupied" | "reserved"

export type DiscountType = "percentage" | "flat"

export type BookingStatus = "pending" | "confirmed" | "cancelled"

// ─── Table row types ────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      cafes: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          owner_id: string
          plan: "starter" | "growth" | "enterprise"
          plan_status: "active" | "trialing" | "past_due" | "cancelled"
          razorpay_subscription_id: string | null
          custom_domain: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["cafes"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["cafes"]["Insert"]>
      }
      profiles: {
        Row: {
          id: string
          cafe_id: string
          role: AnyRole
          full_name: string
          email: string
          avatar_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
      }
      employees: {
        Row: {
          id: string
          cafe_id: string
          profile_id: string
          role: EmployeeRole
          pin: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["employees"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>
      }
      customers: {
        Row: {
          id: string
          cafe_id: string
          profile_id: string | null
          name: string
          email: string | null
          phone: string | null
          loyalty_points: number
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>
      }
      product_categories: {
        Row: {
          id: string
          cafe_id: string
          name: string
          icon: string | null
          color: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["product_categories"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["product_categories"]["Insert"]>
      }
      products: {
        Row: {
          id: string
          cafe_id: string
          category_id: string
          name: string
          description: string | null
          price: number
          tax_rate: number
          discount: number
          image_url: string | null
          is_available: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>
      }
      floors: {
        Row: {
          id: string
          cafe_id: string
          name: string
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["floors"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["floors"]["Insert"]>
      }
      cafe_tables: {
        Row: {
          id: string
          cafe_id: string
          floor_id: string | null
          label: string
          seats: number
          status: TableStatus
          qr_token: string | null
          qr_image_url: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["cafe_tables"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["cafe_tables"]["Insert"]>
      }
      orders: {
        Row: {
          id: string
          cafe_id: string
          order_number: string
          table_id: string | null
          customer_id: string | null
          employee_id: string | null
          status: OrderStatus
          subtotal: number
          discount_total: number
          tax_total: number
          total: number
          coupon_code: string | null
          notes: string | null
          session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>
      }
      order_items: {
        Row: {
          id: string
          cafe_id: string
          order_id: string
          product_id: string
          product_name: string
          unit_price: number
          quantity: number
          discount: number
          tax_rate: number
          line_total: number
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["order_items"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>
      }
      kitchen_tickets: {
        Row: {
          id: string
          cafe_id: string
          order_id: string
          order_number: string
          table_label: string | null
          stage: KitchenStage
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["kitchen_tickets"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["kitchen_tickets"]["Insert"]>
      }
      kitchen_ticket_items: {
        Row: {
          id: string
          cafe_id: string
          ticket_id: string
          product_name: string
          quantity: number
          notes: string | null
        }
        Insert: Omit<Database["public"]["Tables"]["kitchen_ticket_items"]["Row"], "id">
        Update: Partial<Database["public"]["Tables"]["kitchen_ticket_items"]["Insert"]>
      }
      payment_methods: {
        Row: {
          id: string
          cafe_id: string
          type: PaymentMethodType
          label: string
          is_active: boolean
          config: Json | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["payment_methods"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["payment_methods"]["Insert"]>
      }
      payments: {
        Row: {
          id: string
          cafe_id: string
          order_id: string
          method: PaymentMethodType
          amount: number
          reference: string | null
          status: "pending" | "completed" | "failed" | "refunded"
          paid_at: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["payments"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>
      }
      coupons: {
        Row: {
          id: string
          cafe_id: string
          code: string
          discount_type: DiscountType
          value: number
          min_order_amount: number | null
          max_uses: number | null
          used_count: number
          is_active: boolean
          expires_at: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["coupons"]["Row"], "id" | "used_count" | "created_at">
        Update: Partial<Database["public"]["Tables"]["coupons"]["Insert"]>
      }
      promotions: {
        Row: {
          id: string
          cafe_id: string
          name: string
          type: "product_based" | "order_amount" | "quantity_based"
          discount_type: DiscountType
          value: number
          conditions: Json
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["promotions"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["promotions"]["Insert"]>
      }
      pos_sessions: {
        Row: {
          id: string
          cafe_id: string
          employee_id: string
          opened_at: string
          closed_at: string | null
          opening_cash: number
          closing_cash: number | null
          total_orders: number
          total_revenue: number
          notes: string | null
        }
        Insert: Omit<Database["public"]["Tables"]["pos_sessions"]["Row"], "id">
        Update: Partial<Database["public"]["Tables"]["pos_sessions"]["Insert"]>
      }
      self_order_tokens: {
        Row: {
          id: string
          cafe_id: string
          table_id: string
          token: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["self_order_tokens"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["self_order_tokens"]["Insert"]>
      }
      bookings: {
        Row: {
          id: string
          cafe_id: string
          customer_id: string | null
          table_id: string | null
          customer_name: string
          customer_phone: string | null
          party_size: number
          booking_date: string
          booking_time: string
          status: BookingStatus
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>
      }
      settings: {
        Row: {
          id: string
          cafe_id: string
          key: string
          value: Json
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["settings"]["Row"], "id" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ─── Convenience aliases ────────────────────────────────────────────────────

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

// Common row types exported directly
export type Cafe = Tables<"cafes">
export type Profile = Tables<"profiles">
export type Employee = Tables<"employees">
export type Customer = Tables<"customers">
export type ProductCategory = Tables<"product_categories">
export type Product = Tables<"products">
export type Floor = Tables<"floors">
export type CafeTable = Tables<"cafe_tables">
export type Order = Tables<"orders">
export type OrderItem = Tables<"order_items">
export type KitchenTicket = Tables<"kitchen_tickets">
export type KitchenTicketItem = Tables<"kitchen_ticket_items">
export type Payment = Tables<"payments">
export type Coupon = Tables<"coupons">
export type Promotion = Tables<"promotions">
export type PosSession = Tables<"pos_sessions">
export type SelfOrderToken = Tables<"self_order_tokens">
export type Booking = Tables<"bookings">
```

## 3. types/app.ts

```ts
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
```

## 4. lib/supabase/client.ts

```ts
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

/**
 * Supabase browser client.
 * Use this in "use client" components and client-side hooks.
 *
 * IMPORTANT: This client respects Row Level Security (RLS) — queries are
 * automatically scoped to the authenticated user's cafe_id via Supabase policies.
 * Never use the service role key here.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Singleton browser client instance.
 * For use in stores and client hooks where a stable reference is needed.
 */
let _client: ReturnType<typeof createClient> | null = null

export function getClient() {
  if (!_client) {
    _client = createClient()
  }
  return _client
}
```

## 5. lib/supabase/server.ts

```ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

/**
 * Supabase server client.
 * Use in Server Components, Route Handlers, and Server Actions.
 *
 * Reads the session cookie automatically via next/headers.
 * Still subject to RLS — operates as the authenticated user.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component — cookie mutation is
            // fine from middleware; in SC it's a no-op (session refresh only).
          }
        },
      },
    }
  )
}

/**
 * Supabase admin client using the service role key.
 * Bypasses RLS — use ONLY in trusted server-side admin operations.
 * Never expose to the browser or return its data raw to clients.
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // no-op in Server Components
          }
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

## 6. lib/services/_shared.ts

```ts
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

export type DbClient = ReturnType<typeof createClient>

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export async function getCafeId(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("profiles")
    .select("cafe_id")
    .eq("id", session.user.id)
    .single()

  if (error || !data) throw new Error("No cafe profile found")
  return data.cafe_id
}
```

## 7. lib/services/product.service.ts

```ts
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Product } from "@/types/database"

export async function fetchProducts(categoryId?: string): Promise<Product[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  let query = supabase
    .from("products")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("sort_order")

  if (categoryId) query = query.eq("category_id", categoryId)

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single()

  if (error) return null
  return data
}

export async function createProduct(input: {
  category_id: string
  name: string
  price: number
  description?: string
  tax_rate?: number
  discount?: number
  image_url?: string
  sort_order?: number
}) {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("products")
    .insert({
      cafe_id: cafeId,
      ...input,
      tax_rate: input.tax_rate ?? 0,
      discount: input.discount ?? 0,
      is_available: true,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateProduct(id: string, input: Partial<{
  name: string
  price: number
  description: string
  category_id: string
  tax_rate: number
  discount: number
  image_url: string
  is_available: boolean
  sort_order: number
}>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("products")
    .update(input)
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function toggleProductAvailability(id: string, isAvailable: boolean) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("products")
    .update({ is_available: isAvailable })
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteProduct(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from("products")
    .update({ is_available: false })
    .eq("id", id)

  if (error) throw new Error(error.message)
}
```

## 8. lib/services/category.service.ts

```ts
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { ProductCategory } from "@/types/database"

export async function fetchCategories(): Promise<ProductCategory[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("is_active", true)
    .order("sort_order")

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCategory(input: { name: string; icon?: string; color?: string; sort_order?: number }) {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("product_categories")
    .insert({ cafe_id: cafeId, ...input, is_active: true, sort_order: input.sort_order ?? 0 })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCategory(id: string, input: Partial<{ name: string; icon: string; color: string; sort_order: number; is_active: boolean }>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("product_categories")
    .update(input)
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteCategory(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from("product_categories")
    .update({ is_active: false })
    .eq("id", id)

  if (error) throw new Error(error.message)
}
```

## 9. lib/services/table.service.ts

```ts
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { CafeTable, Floor } from "@/types/database"

export async function fetchFloors(): Promise<Floor[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("floors")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("sort_order")

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchTables(floorId?: string): Promise<CafeTable[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  let query = supabase
    .from("cafe_tables")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("label")

  if (floorId) query = query.eq("floor_id", floorId)

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createTable(input: {
  label: string
  seats: number
  floor_id?: string
}) {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("cafe_tables")
    .insert({ cafe_id: cafeId, ...input, status: "available" })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateTable(id: string, input: Partial<{ label: string; seats: number; floor_id: string; status: "available" | "occupied" | "reserved" }>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("cafe_tables")
    .update(input)
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteTable(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from("cafe_tables")
    .delete()
    .eq("id", id)

  if (error) throw new Error(error.message)
}

export async function generateQrCode(tableId: string): Promise<string> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const token = `${cafeId.slice(0, 8)}-${tableId.slice(0, 8)}-${Date.now().toString(36)}`

  const { data, error } = await supabase
    .from("cafe_tables")
    .update({ qr_token: token })
    .eq("id", tableId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return token
}
```

## 10. lib/services/customer.service.ts

```ts
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Customer } from "@/types/database"

export async function fetchCustomers(search?: string): Promise<Customer[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  let query = supabase
    .from("customers")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCustomer(input: {
  name: string
  email?: string
  phone?: string
}) {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("customers")
    .insert({ cafe_id: cafeId, name: input.name, email: input.email ?? null, phone: input.phone ?? null, loyalty_points: 0 })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCustomer(id: string, input: Partial<{ name: string; email: string; phone: string }>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("customers")
    .update(input)
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function addLoyaltyPoints(customerId: string, points: number) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc("add_loyalty_points", {
    p_customer_id: customerId,
    p_points: points,
  })

  if (error) throw new Error(error.message)
  return data
}
```

## 11. lib/services/employee.service.ts

```ts
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Employee } from "@/types/database"
import type { EmployeeRole } from "@/types/database"

export type EmployeeWithProfile = Employee & {
  profiles: { full_name: string; email: string; avatar_url: string | null } | null
}

export async function fetchEmployees(): Promise<EmployeeWithProfile[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("employees")
    .select("*, profiles(full_name, email, avatar_url)")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as EmployeeWithProfile[]
}

export async function createEmployee(input: {
  profile_id: string
  role: EmployeeRole
  pin?: string
}) {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("employees")
    .insert({ cafe_id: cafeId, ...input })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateEmployeeRole(id: string, role: EmployeeRole) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("employees")
    .update({ role })
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deactivateEmployee(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", (await supabase.from("employees").select("profile_id").eq("id", id).single()).data?.profile_id ?? "")

  if (error) throw new Error(error.message)
}

export async function verifyPin(employeeId: string, pin: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("employees")
    .select("pin")
    .eq("id", employeeId)
    .single()

  if (error || !data) return false
  return data.pin === pin
}
```

## 12. lib/services/coupon.service.ts

```ts
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Coupon } from "@/types/database"

export async function fetchCoupons(): Promise<Coupon[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCoupon(input: {
  code: string
  discount_type: "percentage" | "flat"
  value: number
  min_order_amount?: number
  max_uses?: number
  expires_at?: string
}) {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("coupons")
    .insert({ cafe_id: cafeId, ...input, is_active: true })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function toggleCoupon(id: string, isActive: boolean) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("coupons")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function validateCoupon(code: string, orderAmount: number): Promise<Coupon | null> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single()

  if (error || !data) return null

  if (data.max_uses && data.used_count >= data.max_uses) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  if (data.min_order_amount && orderAmount < data.min_order_amount) return null

  return data
}
```

## 13. lib/services/payment.service.ts

```ts
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Payment } from "@/types/database"
import type { PaymentMethodType } from "@/types/database"

export async function fetchPayments(dateFrom?: string, dateTo?: string): Promise<Payment[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  let query = supabase
    .from("payments")
    .select("*, orders(order_number, table_id, customer_id)")
    .eq("cafe_id", cafeId)
    .order("paid_at", { ascending: false })

  if (dateFrom) query = query.gte("paid_at", dateFrom)
  if (dateTo) query = query.lte("paid_at", dateTo)

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchPaymentMethods(): Promise<{ id: string; type: PaymentMethodType; label: string; is_active: boolean }[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("cafe_id", cafeId)
    .eq("is_active", true)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function refundPayment(paymentId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", paymentId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getDailyRevenue(date: string): Promise<number> {
  const supabase = createClient()
  const cafeId = await getCafeId()

  const startOfDay = `${date}T00:00:00Z`
  const endOfDay = `${date}T23:59:59Z`

  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("cafe_id", cafeId)
    .eq("status", "completed")
    .gte("paid_at", startOfDay)
    .lte("paid_at", endOfDay)

  if (error) throw new Error(error.message)
  return (data ?? []).reduce((sum, p) => sum + p.amount, 0)
}
```

## 14. app/products/page.tsx

```tsx
import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Products" }

export default function ProductsPage() {
  return (
    <AdminLayout title="Products">
      <PageContainer>
        <PageHeader title="Products" description="Manage your cafe menu items" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Products — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
```

## 15. app/categories/page.tsx

```tsx
import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Categories" }

export default function CategoriesPage() {
  return (
    <AdminLayout title="Categories">
      <PageContainer>
        <PageHeader title="Categories" description="Organise menu items into sections" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Categories — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
```

## 16. app/tables/page.tsx

```tsx
import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Tables" }

export default function TablesPage() {
  return (
    <AdminLayout title="Tables">
      <PageContainer>
        <PageHeader title="Tables" description="Manage cafe tables and floor layout" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Tables — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
```

## 17. app/customers/page.tsx

```tsx
import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Customers" }

export default function CustomersPage() {
  return (
    <AdminLayout title="Customers">
      <PageContainer>
        <PageHeader title="Customers" description="Customer directory and loyalty points" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Customers — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
```

## 18. app/employees/page.tsx

```tsx
import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Employees" }

export default function EmployeesPage() {
  return (
    <AdminLayout title="Employees">
      <PageContainer>
        <PageHeader title="Employees" description="Staff accounts and role management" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Employees — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
```

## 19. app/coupons/page.tsx

```tsx
import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Coupons" }

export default function CouponsPage() {
  return (
    <AdminLayout title="Coupons">
      <PageContainer>
        <PageHeader title="Coupons" description="Discount codes and automatic promotions" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Coupons — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
```

## 20. app/payments/page.tsx

```tsx
import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Payments" }

export default function PaymentsPage() {
  return (
    <AdminLayout title="Payments">
      <PageContainer>
        <PageHeader title="Payments" description="Payment records and methods" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Payments — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
```

## 21. components/ui/button.tsx

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "sm" | "md" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-teal text-cream hover:bg-teal-600": variant === "default",
            "border border-teal text-teal bg-transparent hover:bg-teal-50": variant === "outline",
            "text-charcoal hover:bg-cream": variant === "ghost",
            "bg-sage text-cream hover:bg-sage-600": variant === "secondary",
          },
          {
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button }
```

## 22. components/ui/card.tsx

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border border-cream-200 bg-white text-charcoal shadow-sm", className)}
      {...props}
    />
  ),
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
)
CardTitle.displayName = "CardTitle"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
)
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardContent }
```

## 23. components/ui/input.tsx

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-cream-200 bg-white px-3 py-2 text-sm text-charcoal file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-charcoal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
```

## 24. components/ui/badge.tsx

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-teal text-cream": variant === "default",
          "bg-green-100 text-green-800": variant === "success",
          "bg-yellow-100 text-yellow-800": variant === "warning",
          "bg-red-100 text-red-800": variant === "danger",
          "border border-border bg-transparent text-muted-foreground": variant === "outline",
        },
        className,
      )}
      {...props}
    />
  )
}
Badge.displayName = "Badge"

export { Badge }
```

## 25. components/ui/select.tsx

```tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-cream-200 bg-white px-3 py-2 text-sm text-charcoal",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  },
)
Select.displayName = "Select"

export { Select }
```

## 26. components/ui/textarea.tsx

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-cream-200 bg-white px-3 py-2 text-sm text-charcoal",
          "placeholder:text-charcoal/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = "Textarea"

export { Textarea }
```

## 27. components/ui/dialog.tsx

```tsx
"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => {},
})

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
  const { onOpenChange } = React.useContext(DialogContext)
  return (
    <span onClick={() => onOpenChange(true)}>{children}</span>
  )
}

export function DialogContent({
  className,
  children,
  title,
}: {
  className?: string
  children: React.ReactNode
  title?: string
}) {
  const { open, onOpenChange } = React.useContext(DialogContext)

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    if (open) {
      document.addEventListener("keydown", handler)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          {title && <h2 className="font-semibold text-gray-900">{title}</h2>}
          <button
            onClick={() => onOpenChange(false)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function DialogFooter({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex items-center justify-end gap-2 border-t px-5 py-4", className)}>
      {children}
    </div>
  )
}
```

## 28. components/ui/confirm-dialog.tsx

```tsx
"use client"

import { Dialog, DialogContent, DialogFooter } from "./dialog"
import { Button } from "./button"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "default"
  onConfirm: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title}>
        <p className="text-sm text-gray-600">{message}</p>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "ghost" : "default"}
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className={variant === "danger" ? "bg-red-600 text-white hover:bg-red-700" : ""}
          >
            {loading ? "Processing…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## 29. components/ui/alert.tsx

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react"

export interface AlertProps {
  type: "success" | "error" | "info" | "warning"
  title?: string
  message: string
  onClose?: () => void
  className?: string
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const styleMap = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
}

const iconColorMap = {
  success: "text-green-600",
  error: "text-red-600",
  info: "text-blue-600",
  warning: "text-yellow-600",
}

export function Alert({ type, title, message, onClose, className }: AlertProps) {
  const Icon = iconMap[type]

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm",
        styleMap[type],
        className,
      )}
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", iconColorMap[type])} />
      <div className="flex-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
```

## 30. Component directory listings

### components/products/
*[empty directory — no files]*

### components/categories/
*[empty directory — no files]*

### components/customers/
*[empty directory — no files]*

### components/employees/
*[directory does not exist]*

### components/coupons/
*[directory does not exist]*

### components/payments/
*[empty directory — no files]*

### components/layout/
```
Admin-layout.tsx
admin-sidebar.tsx
page-container.tsx
profile-menu.tsx
theme-toggle.tsx
top-header.tsx
```

## 31. store/cart-store.ts

```ts
"use client"

import { create } from "zustand"
import type { CartLine, CartTotals, AppliedCoupon } from "@/types/app"
import type { Product, CafeTable, Customer } from "@/types/database"

interface CartState {
  // Items
  lines: CartLine[]

  // Context
  selectedTable: CafeTable | null
  selectedCustomer: Customer | null
  appliedCoupon: AppliedCoupon | null

  // Computed totals (derived, updated on every mutation)
  totals: CartTotals

  // Actions
  addProduct: (product: Product) => void
  incrementLine: (lineId: string) => void
  decrementLine: (lineId: string) => void
  removeLine: (lineId: string) => void
  setLineNotes: (lineId: string, notes: string) => void
  setTable: (table: CafeTable | null) => void
  setCustomer: (customer: Customer | null) => void
  applyCoupon: (coupon: AppliedCoupon) => void
  removeCoupon: () => void
  clearCart: () => void
}

function computeTotals(lines: CartLine[], coupon: AppliedCoupon | null): CartTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
  const itemDiscount = lines.reduce(
    (sum, l) => sum + (l.discount / 100) * l.unitPrice * l.quantity,
    0
  )

  let couponDiscount = 0
  if (coupon) {
    couponDiscount =
      coupon.discountType === "percentage"
        ? (subtotal * coupon.value) / 100
        : coupon.value
    couponDiscount = Math.min(couponDiscount, subtotal)
  }

  const discountTotal = itemDiscount + couponDiscount
  const taxable = subtotal - discountTotal
  const taxTotal = lines.reduce(
    (sum, l) => sum + ((l.taxRate / 100) * l.unitPrice * l.quantity),
    0
  )
  const total = Math.max(taxable + taxTotal, 0)
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)

  return { subtotal, discountTotal, taxTotal, total, itemCount }
}

export const useCartStore = create<CartState>()((set, get) => ({
  lines: [],
  selectedTable: null,
  selectedCustomer: null,
  appliedCoupon: null,
  totals: { subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0, itemCount: 0 },

  addProduct: (product) => {
    const { lines, appliedCoupon } = get()
    const existing = lines.find(
      (l) => l.productId === product.id
    )
    let updated: CartLine[]
    if (existing) {
      updated = lines.map((l) =>
        l.id === existing.id ? { ...l, quantity: l.quantity + 1 } : l
      )
    } else {
      const newLine: CartLine = {
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: 1,
        taxRate: product.tax_rate,
        discount: product.discount,
        notes: null,
      }
      updated = [...lines, newLine]
    }
    set({ lines: updated, totals: computeTotals(updated, appliedCoupon) })
  },

  incrementLine: (lineId) => {
    const { lines, appliedCoupon } = get()
    const updated = lines.map((l) =>
      l.id === lineId ? { ...l, quantity: l.quantity + 1 } : l
    )
    set({ lines: updated, totals: computeTotals(updated, appliedCoupon) })
  },

  decrementLine: (lineId) => {
    const { lines, appliedCoupon } = get()
    const updated = lines
      .map((l) => (l.id === lineId ? { ...l, quantity: l.quantity - 1 } : l))
      .filter((l) => l.quantity > 0)
    set({ lines: updated, totals: computeTotals(updated, appliedCoupon) })
  },

  removeLine: (lineId) => {
    const { lines, appliedCoupon } = get()
    const updated = lines.filter((l) => l.id !== lineId)
    set({ lines: updated, totals: computeTotals(updated, appliedCoupon) })
  },

  setLineNotes: (lineId, notes) => {
    const { lines } = get()
    const updated = lines.map((l) => (l.id === lineId ? { ...l, notes } : l))
    set({ lines: updated })
  },

  setTable: (table) => set({ selectedTable: table }),
  setCustomer: (customer) => set({ selectedCustomer: customer }),

  applyCoupon: (coupon) => {
    const { lines } = get()
    set({ appliedCoupon: coupon, totals: computeTotals(lines, coupon) })
  },

  removeCoupon: () => {
    const { lines } = get()
    set({ appliedCoupon: null, totals: computeTotals(lines, null) })
  },

  clearCart: () =>
    set({
      lines: [],
      selectedTable: null,
      selectedCustomer: null,
      appliedCoupon: null,
      totals: { subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0, itemCount: 0 },
    }),
}))
```

## 32. store/order-store.ts

```ts
"use client"

import { create } from "zustand"
import type { OrderWithItems, KitchenTicketWithItems } from "@/types/app"

interface OrderState {
  // Active orders visible on POS orders list
  activeOrders: OrderWithItems[]
  setActiveOrders: (orders: OrderWithItems[]) => void
  upsertOrder: (order: OrderWithItems) => void

  // Kitchen tickets visible on brew bar
  kitchenTickets: KitchenTicketWithItems[]
  setKitchenTickets: (tickets: KitchenTicketWithItems[]) => void
  upsertTicket: (ticket: KitchenTicketWithItems) => void
  removeTicket: (ticketId: string) => void

  // Currently viewed order in detail panel
  activeOrderId: string | null
  setActiveOrderId: (id: string | null) => void
}

export const useOrderStore = create<OrderState>()((set, get) => ({
  activeOrders: [],
  setActiveOrders: (orders) => set({ activeOrders: orders }),
  upsertOrder: (order) => {
    const { activeOrders } = get()
    const exists = activeOrders.find((o) => o.id === order.id)
    if (exists) {
      set({ activeOrders: activeOrders.map((o) => (o.id === order.id ? order : o)) })
    } else {
      set({ activeOrders: [order, ...activeOrders] })
    }
  },

  kitchenTickets: [],
  setKitchenTickets: (tickets) => set({ kitchenTickets: tickets }),
  upsertTicket: (ticket) => {
    const { kitchenTickets } = get()
    const exists = kitchenTickets.find((t) => t.id === ticket.id)
    if (exists) {
      set({ kitchenTickets: kitchenTickets.map((t) => (t.id === ticket.id ? ticket : t)) })
    } else {
      set({ kitchenTickets: [ticket, ...kitchenTickets] })
    }
  },
  removeTicket: (ticketId) => {
    const { kitchenTickets } = get()
    set({ kitchenTickets: kitchenTickets.filter((t) => t.id !== ticketId) })
  },

  activeOrderId: null,
  setActiveOrderId: (id) => set({ activeOrderId: id }),
}))
```

## 33. store/auth-store.ts

```ts
"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AuthUser } from "@/types/app"

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      clearUser: () => set({ user: null, isLoading: false }),
    }),
    {
      name: "odfe-auth",
      // Only persist user, not loading state
      partialize: (state) => ({ user: state.user }),
    }
  )
)
```
