import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"
import { env } from "@/lib/config/env"

/**
 * Supabase browser client.
 * Use this in "use client" components and client-side hooks.
 *
 * IMPORTANT: This client respects Row Level Security (RLS) — queries are
 * automatically scoped to the authenticated user's cafe_id via Supabase policies.
 * Never use the service role key here.
 */
export function createClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured")
  }

  return createBrowserClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey
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
