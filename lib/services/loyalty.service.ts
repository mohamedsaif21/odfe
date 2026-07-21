import { createClient } from "@/lib/supabase/client"
import { getCafeId, getAuthenticatedProfile } from "./_shared"
import type { DbClient, InsertTables, UpdateTables } from "./_shared"
import type {
  Customer, LoyaltyTier, WalletTransaction,
  RewardRedemption, ReferralCode,
} from "@/types/database"

// ─── Loyalty Tiers ───────────────────────────────────────────────────────

export async function fetchLoyaltyTiers(client?: DbClient): Promise<LoyaltyTier[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("loyalty_tiers")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("min_points", { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createLoyaltyTier(
  input: { name: string; min_points: number; discount_percent: number; benefits?: string },
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const payload: InsertTables<"loyalty_tiers"> = {
    cafe_id: cafeId,
    name: input.name,
    min_points: input.min_points,
    discount_percent: input.discount_percent,
    benefits: input.benefits ?? null,
    is_active: true,
  }

  const { data, error } = await supabase
    .from("loyalty_tiers")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateLoyaltyTier(
  id: string,
  input: Partial<{ name: string; min_points: number; discount_percent: number; benefits: string; is_active: boolean }>,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const updates: UpdateTables<"loyalty_tiers"> = input

  const { data, error } = await supabase
    .from("loyalty_tiers")
    .update(updates)
    .eq("id", id)
    .eq("cafe_id", cafeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteLoyaltyTier(id: string, client?: DbClient) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { error } = await supabase
    .from("loyalty_tiers")
    .update({ is_active: false })
    .eq("id", id)
    .eq("cafe_id", cafeId)

  if (error) throw new Error(error.message)
}

// ─── Customers (Loyalty) ─────────────────────────────────────────────────

export type CustomerWithLoyalty = Customer & {
  tier: LoyaltyTier | null
}

export async function fetchCustomersWithLoyalty(
  search?: string,
  client?: DbClient
): Promise<CustomerWithLoyalty[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  let query = supabase
    .from("customers")
    .select("*, tier:loyalty_tiers(*)")
    .eq("cafe_id", cafeId)
    .order("name", { ascending: true })

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as CustomerWithLoyalty[]
}

export async function getCustomerLoyaltyDetail(
  customerId: string,
  client?: DbClient
): Promise<{
  customer: CustomerWithLoyalty
  transactions: WalletTransaction[]
  redemptions: RewardRedemption[]
} | null> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data: customer, error: custError } = await supabase
    .from("customers")
    .select("*, tier:loyalty_tiers(*)")
    .eq("id", customerId)
    .eq("cafe_id", cafeId)
    .single()

  if (custError) throw new Error(custError.message)
  if (!customer) return null

  const [txRes, redRes] = await Promise.all([
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .eq("cafe_id", cafeId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("reward_redemptions")
      .select("*")
      .eq("customer_id", customerId)
      .eq("cafe_id", cafeId)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  return {
    customer: customer as unknown as CustomerWithLoyalty,
    transactions: txRes.data ?? [],
    redemptions: redRes.data ?? [],
  }
}

// ─── Points Operations ───────────────────────────────────────────────────

export async function earnPoints(
  customerId: string,
  orderId: string,
  amount: number,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  const { error } = await supabase.rpc("earn_loyalty_points", {
    p_customer_id: customerId,
    p_cafe_id: cafeId,
    p_order_id: orderId,
    p_amount: amount,
    p_profile_id: profile.id,
  })

  if (error) throw new Error(error.message)
}

export async function redeemPoints(
  customerId: string,
  points: number,
  orderId: string,
  client?: DbClient
): Promise<number> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  const { data, error } = await supabase.rpc("redeem_loyalty_points", {
    p_customer_id: customerId,
    p_cafe_id: cafeId,
    p_points: points,
    p_order_id: orderId,
    p_profile_id: profile.id,
  })

  if (error) throw new Error(error.message)
  return Number(data ?? 0)
}

export async function applyBirthdayReward(
  customerId: string,
  orderId: string,
  client?: DbClient
): Promise<number> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  const { data, error } = await supabase.rpc("apply_birthday_reward", {
    p_customer_id: customerId,
    p_cafe_id: cafeId,
    p_order_id: orderId,
    p_profile_id: profile.id,
  })

  if (error) throw new Error(error.message)
  return Number(data ?? 0)
}

export async function applyReferralReward(
  customerId: string,
  referralCode: string,
  client?: DbClient
): Promise<number> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  const { data, error } = await supabase.rpc("apply_referral_reward", {
    p_customer_id: customerId,
    p_cafe_id: cafeId,
    p_referral_code: referralCode,
    p_profile_id: profile.id,
  })

  if (error) throw new Error(error.message)
  return Number(data ?? 0)
}

// ─── Wallet ──────────────────────────────────────────────────────────────

export async function getWalletTransactions(
  customerId: string,
  client?: DbClient
): Promise<WalletTransaction[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function addWalletCredit(
  customerId: string,
  amount: number,
  description: string,
  client?: DbClient
) {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)
  const profile = await getAuthenticatedProfile(client)

  const { error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      cafe_id: cafeId,
      customer_id: customerId,
      amount,
      type: "credit",
      reference: null,
      description,
      created_by: profile.id,
    })

  if (txError) throw new Error(txError.message)

  const { data: cust } = await supabase
    .from("customers")
    .select("wallet_balance")
    .eq("id", customerId)
    .eq("cafe_id", cafeId)
    .single()

  if (cust) {
    const { error: updateError } = await supabase
      .from("customers")
      .update({ wallet_balance: Number(cust.wallet_balance) + amount })
      .eq("id", customerId)
      .eq("cafe_id", cafeId)

    if (updateError) throw new Error(updateError.message)
  }
}

// ─── Referral Codes ──────────────────────────────────────────────────────

export async function fetchReferralCodes(
  customerId: string,
  client?: DbClient
): Promise<ReferralCode[]> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const { data, error } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("customer_id", customerId)
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────

export async function getLoyaltyStats(client?: DbClient): Promise<{
  totalCustomers: number
  totalPointsEarned: number
  totalPointsRedeemed: number
  totalWalletBalance: number
  topTier: string | null
}> {
  const supabase = client ?? createClient()
  const cafeId = await getCafeId(client)

  const [custRes, redRes, walletRes] = await Promise.all([
    supabase
      .from("customers")
      .select("total_points_earned, loyalty_points, wallet_balance, tier_id")
      .eq("cafe_id", cafeId),
    supabase
      .from("reward_redemptions")
      .select("points_used, value")
      .eq("cafe_id", cafeId),
    supabase
      .from("wallet_transactions")
      .select("amount, type")
      .eq("cafe_id", cafeId),
  ])

  const customers = custRes.data ?? []
  const redemptions = redRes.data ?? []
  const wallets = walletRes.data ?? []

  const totalPointsEarned = customers.reduce((s, c) => s + Number(c.total_points_earned), 0)
  const totalPointsRedeemed = redemptions.reduce((s, r) => s + r.points_used, 0)
  const totalWalletBalance = customers.reduce((s, c) => s + Number(c.wallet_balance), 0)

  const tierCustomers = customers.filter((c) => c.tier_id)
  let topTier: string | null = null
  if (tierCustomers.length > 0) {
    const { data: tiers } = await supabase
      .from("loyalty_tiers")
      .select("name")
      .in("id", Array.from(new Set(tierCustomers.map((c) => c.tier_id!))))
      .eq("cafe_id", cafeId)

    topTier = tiers?.[0]?.name ?? null
  }

  return {
    totalCustomers: customers.length,
    totalPointsEarned,
    totalPointsRedeemed,
    totalWalletBalance,
    topTier,
  }
}
