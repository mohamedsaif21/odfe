import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"
import { env, serverEnv } from "@/lib/config/env"

/**
 * Supabase server client (authenticated user).
 * Use in Server Components, Route Handlers, and Server Actions.
 *
 * Reads the session cookie automatically via next/headers.
 * Still subject to RLS — operates as the authenticated user.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component — cookie mutation is
            // fine from middleware; in SC it's a no-op (session refresh only).
          }
        },
      },
    }
  )
}

/**
 * Supabase admin client using the service role key.
 * Bypasses RLS — use ONLY in trusted server-side admin operations.
 * Never expose to the browser or return its data raw to clients.
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    env.supabaseUrl,
    serverEnv.serviceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // no-op in Server Components
          }
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
