import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"
import type { AnyRole } from "@/types/database"
import { resolveAuthenticatedProfile } from "@/lib/auth/role-mapper"

export type DbClient = ReturnType<typeof createClient>

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export async function getAuthenticatedProfile(
  client?: DbClient
): Promise<{
  id: string
  cafeId: string
  role: AnyRole
  fullName: string
  email: string
}> {
  const supabase = client ?? createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return resolveAuthenticatedProfile(session.user.id, supabase)
}

export async function getCafeId(client?: DbClient): Promise<string> {
  const profile = await getAuthenticatedProfile(client)
  if (!profile.cafeId) throw new Error("Missing cafe assignment")
  return profile.cafeId
}

export async function getPosContext(client?: DbClient): Promise<{
  cafeId: string
  employeeId: string | null
  role: AnyRole
}> {
  const supabase = client ?? createClient()
  const profile = await getAuthenticatedProfile(supabase)

  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", profile.id)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)

  return {
    cafeId: profile.cafeId,
    employeeId: data?.id ?? null,
    role: profile.role,
  }
}

export async function requireRole(
  allowedRoles: AnyRole[],
  client?: DbClient
): Promise<{ id: string; cafeId: string; role: AnyRole }> {
  const profile = await getAuthenticatedProfile(client)
  if (!allowedRoles.includes(profile.role)) {
    throw new Error(`Access denied. Required role: ${allowedRoles.join(" or ")}`)
  }
  return profile
}

export function normaliseServiceError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "An unexpected error occurred"
}
