import { NextRequest } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"
import { successResponse, errorResponse } from "@/lib/api/response"
import { z } from "zod"

const bodySchema = z.object({
  fullName: z.string().min(1).max(100),
  email: z.string().email(),
  temporaryPassword: z.string().min(6),
  role: z.enum(["cashier", "kitchen"]),
  pin: z.string().length(4).optional(),
})

/**
 * POST /api/admin/employees
 *
 * Creates a new employee (cashier or kitchen) under the admin's cafe.
 * Requires admin role.
 *
 * Expected Supabase SQL function:
 *   create_employee(
 *     p_admin_id UUID,
 *     p_full_name TEXT,
 *     p_email TEXT,
 *     p_password TEXT,
 *     p_role TEXT,
 *     p_pin TEXT
 *   ) RETURNS JSON { auth_id, profile_id, employee_id }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return errorResponse("Authentication required", 401)
    }

    const profile = await resolveAuthenticatedProfile(session.user.id, supabase)

    if (profile.role !== "admin") {
      return errorResponse("Admin access required", 403)
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("Invalid input", 400, { issues: parsed.error.issues })
    }

    const { fullName, email, temporaryPassword, role, pin } = parsed.data

    const adminClient = await createAdminClient()

    // Step 1: Create Auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { role, full_name: fullName },
    })

    if (authError || !authUser.user) {
      return errorResponse(authError?.message ?? "Failed to create user", 500)
    }

    try {
      // Step 2: Create profile + employee via RPC
      const { data: rpcResult, error: rpcError } = await (adminClient.rpc as any)("create_employee", {
        p_admin_id: session.user.id,
        p_full_name: fullName,
        p_email: email,
        p_password: temporaryPassword,
        p_role: role,
        p_pin: pin ?? null,
      })

      if (rpcError) {
        // Cleanup: remove the created Auth user
        await adminClient.auth.admin.deleteUser(authUser.user.id)

        if (rpcError.message?.includes("function") && rpcError.message?.includes("not found")) {
          return errorResponse(
            "Employee creation database function is not available. Apply the Supabase SQL migration first.",
            503
          )
        }
        return errorResponse(rpcError.message, 500)
      }

      return successResponse(rpcResult, 201)
    } catch (err) {
      // Cleanup on failure
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      throw err
    }
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Employee creation failed",
      500
    )
  }
}
