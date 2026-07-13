import { NextRequest } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import { z } from "zod"

const bodySchema = z.object({
  fullName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  token: z.string().nullable().optional(),
})

/**
 * POST /api/onboarding/customer
 *
 * Creates a customer profile and customer record after signUp.
 * Requires a valid authenticated session.
 *
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return errorResponse("Authentication required", 401)
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("Invalid input", 400, { issues: parsed.error.issues })
    }

    const { fullName, email, phone, token } = parsed.data

    const adminClient = await createAdminClient()
    let cafeId: string | null = null

    if (token) {
      const { data: tokenRow, error: tokenError } = await adminClient
        .from("self_order_tokens")
        .select("cafe_id, is_active")
        .eq("token", token)
        .single()

      if (tokenError || !tokenRow) return errorResponse("Invalid or expired QR code", 400)
      if (!tokenRow.is_active) return errorResponse("This QR code is no longer active", 400)
      cafeId = tokenRow.cafe_id
    } else {
      const { data: cafe, error: cafeError } = await adminClient
        .from("cafes")
        .select("id")
        .order("created_at")
        .limit(1)
        .single()

      if (cafeError || !cafe) {
        return errorResponse(cafeError?.message ?? "No cafe configured", 500)
      }
      cafeId = cafe.id
    }

    const profilePayload = {
      id: session.user.id,
      cafe_id: cafeId,
      role: "customer" as const,
      full_name: fullName,
      email,
      avatar_url: null,
      is_active: true,
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" })

    if (profileError) {
      return errorResponse(profileError.message, 500)
    }

    const { data: existingCustomer, error: existingCustomerError } = await adminClient
      .from("customers")
      .select("id")
      .eq("profile_id", session.user.id)
      .maybeSingle()

    if (existingCustomerError) {
      return errorResponse(existingCustomerError.message, 500)
    }

    if (existingCustomer) {
      const { error: updateCustomerError } = await adminClient
        .from("customers")
        .update({
          cafe_id: cafeId,
          name: fullName,
          email,
          phone: phone ?? null,
          loyalty_points: 0,
        })
        .eq("id", existingCustomer.id)

      if (updateCustomerError) return errorResponse(updateCustomerError.message, 500)
      return successResponse({ profile_id: session.user.id, customer_id: existingCustomer.id })
    }

    const { data: customer, error: customerError } = await adminClient
      .from("customers")
      .insert({
        cafe_id: cafeId,
        profile_id: session.user.id,
        name: fullName,
        email,
        phone: phone ?? null,
        loyalty_points: 0,
      })
      .select("id")
      .single()

    if (customerError || !customer) {
      return errorResponse(customerError?.message ?? "Customer creation failed", 500)
    }

    return successResponse({ profile_id: session.user.id, customer_id: customer.id })
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Customer onboarding failed",
      500
    )
  }
}
