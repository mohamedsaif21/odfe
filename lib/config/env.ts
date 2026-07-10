function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    if (typeof window !== "undefined") {
      return ""
    }
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

export const env = {
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
}

export const serverEnv = {
  serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
}
