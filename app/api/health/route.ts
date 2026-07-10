import { NextResponse } from "next/server"

export async function GET() {
  const supabaseAvailable = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase: supabaseAvailable ? "configured" : "missing",
  })
}
