/**
 * Shared utility: resolve the current user's cafe_id from Supabase auth.
 * Throws with the real error message if auth or profile lookup fails.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client"

export async function getCafeId(): Promise<string> {
  const supabase = createClient()
  const { data: { session }, error: authErr } = await supabase.auth.getSession()
  if (authErr) throw new Error(authErr.message)
  if (!session) throw new Error("Not authenticated. Please log in again.")

  const { data: profile, error: profErr } = await (supabase as any)
    .from("profiles")
    .select("cafe_id")
    .eq("id", session.user.id)
    .single()

  if (profErr) throw new Error(profErr.message)
  if (!profile?.cafe_id) throw new Error("No cafe associated with this account.")
  return profile.cafe_id as string
}