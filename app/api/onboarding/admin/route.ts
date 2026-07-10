import { NextRequest } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import { z } from "zod"

const bodySchema = z.object({
  cafeName: z.string().min(1).max(100),
  fullName: z.string().min(1).max(100),
})

/**
 * POST /api/onboarding/admin
 *
 * Creates a cafe, profile, and admin employee record.
 * Requires a valid authenticated session (from signUp).
 *
 * Expected Supabase SQL function:
 *   onboard_admin_owner(
 *     p_user_id UUID,
 *     p_cafe_name TEXT,
 *     p_full_name TEXT
 *   ) RETURNS JSON { cafe_id, profile_id, employee_id }
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

    const { cafeName, fullName } = parsed.data

    // Attempt to call the expected Supabase RPC
    const adminClient = await createAdminClient()

    const { data: rpcResult, error: rpcError } = await (adminClient.rpc as any)("onboard_admin_owner", {
      p_user_id: session.user.id,
      p_cafe_name: cafeName,
      p_full_name: fullName,
    })

    if (rpcError) {
      if (rpcError.message?.includes("function") && rpcError.message?.includes("not found")) {
        return errorResponse(
          "Onboarding database function is not available. Apply the Supabase SQL migration first.",
          503
        )
      }
      return errorResponse(rpcError.message, 500)
    }

    return successResponse(rpcResult)
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Onboarding failed",
      500
    )
  }
}
