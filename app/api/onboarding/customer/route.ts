import { NextRequest } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import { z } from "zod"

const bodySchema = z.object({
  fullName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
})

/**
 * POST /api/onboarding/customer
 *
 * Creates a customer profile and customer record after signUp.
 * Requires a valid authenticated session.
 *
 * Expected Supabase SQL function:
 *   onboard_customer(
 *     p_user_id UUID,
 *     p_full_name TEXT,
 *     p_email TEXT,
 *     p_phone TEXT
 *   ) RETURNS JSON { profile_id, customer_id }
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

    const { fullName, email, phone } = parsed.data

    const adminClient = await createAdminClient()

    const { data: rpcResult, error: rpcError } = await (adminClient.rpc as any)("onboard_customer", {
      p_user_id: session.user.id,
      p_full_name: fullName,
      p_email: email,
      p_phone: phone ?? null,
    })

    if (rpcError) {
      if (rpcError.message?.includes("function") && rpcError.message?.includes("not found")) {
        return errorResponse(
          "Customer onboarding database function is not available. Apply the Supabase SQL migration first.",
          503
        )
      }
      return errorResponse(rpcError.message, 500)
    }

    return successResponse(rpcResult)
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Customer onboarding failed",
      500
    )
  }
}
