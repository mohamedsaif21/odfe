import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Json } from "@/types/database"

export type CafeInfo = {
  id: string
  name: string
  logoUrl: string | null
  slug: string
  address: string
  gst: string
  receiptFooter: string
}

export async function fetchCafeInfo(cafeId?: string): Promise<CafeInfo> {
  const supabase = createClient()
  const activeCafeId = cafeId ?? (await getCafeId(supabase))

  const [{ data: cafe, error: cafeError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase.from("cafes").select("id, name, logo_url, slug").eq("id", activeCafeId).single(),
      supabase.from("settings").select("key, value").eq("cafe_id", activeCafeId),
    ])

  if (cafeError || !cafe) throw new Error(cafeError?.message ?? "Cafe not found")
  if (settingsError) throw new Error(settingsError.message)

  const cafeSettings = (settings ?? []).reduce(
    (acc, s) => {
      acc[s.key] = s.value as Record<string, unknown>
      return acc
    },
    {} as Record<string, Record<string, unknown>>
  )

  const info = cafeSettings.cafe_info as
    | { address?: string; gst?: string; receipt_footer?: string }
    | undefined

  return {
    id: cafe.id,
    name: cafe.name,
    logoUrl: cafe.logo_url,
    slug: cafe.slug,
    address: (info?.address as string) ?? "",
    gst: (info?.gst as string) ?? "",
    receiptFooter: (info?.receipt_footer as string) ?? "Thank you for your visit!",
  }
}

export async function saveCafeInfo(
  cafeId: string,
  data: { address?: string; gst?: string; receipt_footer?: string }
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from("settings").upsert(
    {
      cafe_id: cafeId,
      key: "cafe_info",
      value: data as unknown as Json,
    },
    { onConflict: "cafe_id,key" }
  )

  if (error) throw new Error(error.message)
}
