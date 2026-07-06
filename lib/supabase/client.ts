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