/**
 * Employee authentication service.
 * All Supabase auth calls live here — pages import functions, not raw clients.
 * Never uses service role key.
 */
import { createClient } from "@/lib/supabase/client"
import { isEmployeeRole } from "@/lib/auth/role-mapper"
import type { AuthUser } from "@/types/app"
import type { AnyRole } from "@/types/database"

// ─── Error messages — exact, never generic ────────────────────────────────────

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid login credentials. Check your email and password.",
  PROFILE_NOT_FOUND:   "Profile not found. Contact your administrator.",
  ACCOUNT_INACTIVE:    "Your account is inactive. Contact your administrator.",
  NO_CAFE:             "No cafe assigned to this account. Contact your administrator.",
  EMPLOYEE_NOT_FOUND:  "Employee record not found for this profile.",
  UNSUPPORTED_ROLE:    "Unsupported role. Only admin, cashier, and kitchen can log in here.",
} as const

// ─── resolveProfile ───────────────────────────────────────────────────────────

async function resolveProfile(userId: string): Promise<{
  id: string
  cafe_id: string
  role: AnyRole
  full_name: string
  email: string
  avatar_url: string | null
  is_active: boolean
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("id, cafe_id, role, full_name, email, avatar_url, is_active")
    .eq("id", userId)
    .single()

  if (error || !data) throw new Error(AUTH_ERRORS.PROFILE_NOT_FOUND)
  if (!data.is_active)  throw new Error(AUTH_ERRORS.ACCOUNT_INACTIVE)
  if (!data.cafe_id)    throw new Error(AUTH_ERRORS.NO_CAFE)

  return data
}

// ─── resolveEmployee ──────────────────────────────────────────────────────────

async function resolveEmployee(profileId: string): Promise<{ id: string }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", profileId)
    .single()

  if (error || !data) throw new Error(AUTH_ERRORS.EMPLOYEE_NOT_FOUND)
  return data
}

// ─── signInEmployee ───────────────────────────────────────────────────────────

export async function signInEmployee(
  email: string,
  password: string
): Promise<AuthUser> {
  const supabase = createClient()

  // Step 1: Supabase auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (authError || !authData.user) {
    throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS)
  }

  const userId = authData.user.id

  // Step 2: Profile lookup + validation
  const profile = await resolveProfile(userId)

  // Step 3: Employee roles only on this login route
  if (!isEmployeeRole(profile.role)) {
    // Sign them back out — wrong login page
    await supabase.auth.signOut()
    throw new Error(AUTH_ERRORS.UNSUPPORTED_ROLE)
  }

  // Step 4: Employee record must exist
  await resolveEmployee(userId)

  // Step 5: Build AuthUser
  const user: AuthUser = {
    id:        userId,
    email:     profile.email,
    role:      profile.role,
    fullName:  profile.full_name,
    cafeId:    profile.cafe_id,
    cafeName:  "",           // loaded separately in layout if needed
    avatarUrl: profile.avatar_url,
  }

  return user
}

// ─── restoreSession ───────────────────────────────────────────────────────────

/**
 * Called on app boot (in a client component or provider).
 * Re-hydrates AuthUser from the existing Supabase session without re-login.
 * Returns null if no session or if session is invalid.
 */
export async function restoreSession(): Promise<AuthUser | null> {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  try {
    const profile = await resolveProfile(session.user.id)
    if (!isEmployeeRole(profile.role)) return null

    return {
      id:        session.user.id,
      email:     profile.email,
      role:      profile.role,
      fullName:  profile.full_name,
      cafeId:    profile.cafe_id,
      cafeName:  "",
      avatarUrl: profile.avatar_url,
    }
  } catch {
    return null
  }
}

// ─── signOut ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}