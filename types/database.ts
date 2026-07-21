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

export type PurchaseStatus = "draft" | "ordered" | "received" | "cancelled"

export type OrderSource = "pos" | "self_order"

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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          cafe_id: string
          profile_id: string | null
          name: string
          email: string | null
          phone: string | null
          address: string | null
          birthday: string | null
          is_active: boolean
          loyalty_points: number
          visit_count: number
          lifetime_spend: number
          tier_id: string | null
          total_points_earned: number
          referral_code: string | null
          referred_by: string | null
          wallet_balance: number
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          source: OrderSource
          session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>
        Relationships: []
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
        Relationships: []
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
          preparing_at: string | null
          completed_at: string | null
        }
        Insert: Omit<Database["public"]["Tables"]["kitchen_tickets"]["Row"], "id" | "created_at" | "updated_at" | "preparing_at" | "completed_at"> & {
          preparing_at?: string | null
          completed_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["kitchen_tickets"]["Insert"]>
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      inventory_items: {
        Row: {
          id: string
          cafe_id: string
          name: string
          unit: string
          cost_price: number
          stock: number
          reorder_level: number
          expiry_date: string | null
          batch_number: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["inventory_items"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["inventory_items"]["Insert"]>
        Relationships: []
      }
      stock_movements: {
        Row: {
          id: string
          cafe_id: string
          item_id: string
          quantity: number
          type: "in" | "out"
          note: string | null
          is_wastage: boolean
          created_by: string
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["stock_movements"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["stock_movements"]["Insert"]>
        Relationships: []
      }
      product_ingredients: {
        Row: {
          id: string
          cafe_id: string
          product_id: string
          item_id: string
          quantity: number
        }
        Insert: Omit<Database["public"]["Tables"]["product_ingredients"]["Row"], "id">
        Update: Partial<Database["public"]["Tables"]["product_ingredients"]["Insert"]>
        Relationships: []
      }
      suppliers: {
        Row: {
          id: string
          cafe_id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>
        Relationships: []
      }
      purchase_orders: {
        Row: {
          id: string
          cafe_id: string
          supplier_id: string | null
          order_number: string
          status: PurchaseStatus
          total_amount: number
          notes: string | null
          ordered_at: string | null
          received_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["purchase_orders"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["purchase_orders"]["Insert"]>
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          id: string
          cafe_id: string
          purchase_order_id: string
          item_id: string
          quantity: number
          unit_cost: number
          line_total: number
        }
        Insert: Omit<Database["public"]["Tables"]["purchase_order_items"]["Row"], "id">
        Update: Partial<Database["public"]["Tables"]["purchase_order_items"]["Insert"]>
        Relationships: []
      }
      loyalty_tiers: {
        Row: {
          id: string
          cafe_id: string
          name: string
          min_points: number
          discount_percent: number
          benefits: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["loyalty_tiers"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["loyalty_tiers"]["Insert"]>
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          id: string
          cafe_id: string
          customer_id: string
          amount: number
          type: "credit" | "debit"
          reference: string | null
          description: string | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["wallet_transactions"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["wallet_transactions"]["Insert"]>
        Relationships: []
      }
      referral_codes: {
        Row: {
          id: string
          cafe_id: string
          customer_id: string
          code: string
          used_count: number
          reward_given: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["referral_codes"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["referral_codes"]["Insert"]>
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          id: string
          cafe_id: string
          customer_id: string
          order_id: string | null
          reward_type: "points" | "wallet" | "birthday" | "referral" | "tier_discount"
          points_used: number
          value: number
          description: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["reward_redemptions"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["reward_redemptions"]["Insert"]>
        Relationships: []
      }
      expense_categories: {
        Row: {
          id: string
          cafe_id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["expense_categories"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["expense_categories"]["Insert"]>
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          cafe_id: string
          category_id: string
          amount: number
          description: string
          expense_date: string
          is_recurring: boolean
          recurring_frequency: "daily" | "weekly" | "monthly" | "yearly" | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_order_with_kitchen_ticket: {
        Args: {
          p_cafe_id: string
          p_table_id: string | null
          p_customer_id: string | null
          p_employee_id: string | null
          p_session_id: string | null
          p_coupon_code: string | null
          p_notes: string | null
          p_source: "pos" | "self_order"
          p_items: Array<{
            product_id: string
            quantity: number
            notes: string | null
          }>
        }
        Returns: {
          order_id: string
          order_number: string
          ticket_id: string
          subtotal: number
          discount_total: number
          tax_total: number
          total: number
        }
      }
      resolve_public_self_order_token: {
        Args: {
          p_token: string
        }
        Returns:
          | {
              cafe_id: string
              table_id: string
              table_label: string
            }
          | Array<{
              cafe_id: string
              table_id: string
              table_label: string
            }>
      }
      advance_kitchen_ticket: {
        Args: {
          p_ticket_id: string
          p_order_id: string
          p_next_stage: KitchenStage
          p_previous_stage: KitchenStage
        }
        Returns: undefined
      }
      adjust_inventory_stock: {
        Args: {
          p_item_id: string
          p_cafe_id: string
          p_adjustment: number
        }
        Returns: undefined
      }
      receive_purchase_order: {
        Args: {
          p_order_id: string
          p_cafe_id: string
        }
        Returns: undefined
      }
      generate_po_number: {
        Args: {
          p_cafe_id: string
        }
        Returns: string
      }
      earn_loyalty_points: {
        Args: {
          p_customer_id: string
          p_cafe_id: string
          p_order_id: string
          p_amount: number
          p_profile_id: string
        }
        Returns: undefined
      }
      redeem_loyalty_points: {
        Args: {
          p_customer_id: string
          p_cafe_id: string
          p_points: number
          p_order_id: string
          p_profile_id: string
        }
        Returns: number
      }
      apply_birthday_reward: {
        Args: {
          p_customer_id: string
          p_cafe_id: string
          p_order_id: string
          p_profile_id: string
        }
        Returns: number
      }
      apply_referral_reward: {
        Args: {
          p_customer_id: string
          p_cafe_id: string
          p_referral_code: string
          p_profile_id: string
        }
        Returns: number
      }
      deduct_stock_for_order: {
        Args: {
          p_order_id: string
          p_cafe_id: string
          p_profile_id: string
        }
        Returns: undefined
      }
      get_profit_loss: {
        Args: {
          p_cafe_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          total_revenue: number
          total_expenses: number
          net_profit: number
          expense_breakdown: string
        }
      }
    }
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
export type InventoryItem = Tables<"inventory_items">
export type StockMovement = Tables<"stock_movements">
export type ProductIngredient = Tables<"product_ingredients">
export type Supplier = Tables<"suppliers">
export type PurchaseOrder = Tables<"purchase_orders">
export type PurchaseOrderItem = Tables<"purchase_order_items">
export type LoyaltyTier = Tables<"loyalty_tiers">
export type WalletTransaction = Tables<"wallet_transactions">
export type ReferralCode = Tables<"referral_codes">
export type RewardRedemption = Tables<"reward_redemptions">
export type ExpenseCategory = Tables<"expense_categories">
export type Expense = Tables<"expenses">
