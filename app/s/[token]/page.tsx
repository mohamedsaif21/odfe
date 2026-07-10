"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { resolveSelfOrderToken, fetchPublicMenu } from "@/lib/services/self-order.service"
import type { PublicMenuCategory } from "@/lib/services/self-order.service"

export default function QrSelfOrderPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cafeName, setCafeName] = useState("")
  const [tableLabel, setTableLabel] = useState("")
  const [menu, setMenu] = useState<PublicMenuCategory[]>([])

  useEffect(() => {
    async function init() {
      try {
        const token = params.token
        if (!token) throw new Error("Invalid QR code")

        const supabase = createClient()
        const resolved = await resolveSelfOrderToken(token, supabase)

        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push(`/customer/login?redirect=/s/${token}`)
          return
        }

        setTableLabel(resolved.tableLabel)

        // Load cafe name
        const { data: cafe } = await (supabase
          .from("cafes") as any)
          .select("name")
          .eq("id", resolved.cafeId)
          .single()

        if (cafe) setCafeName(cafe.name)

        // Load public menu
        const categories = await fetchPublicMenu(resolved.cafeId, supabase)
        setMenu(categories)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load menu")
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [params.token, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-odfe-cream">
        <p className="text-sm text-gray-500">Loading menu…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-odfe-cream p-4">
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <p className="mt-2 text-xs text-gray-400">Please scan a valid QR code from your table.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-odfe-cream">
      <header className="bg-odfe-teal px-4 py-4">
        <h1 className="font-display text-2xl text-odfe-cream">{cafeName || "OdFe"}</h1>
        <p className="mt-1 text-sm text-odfe-cream/70">Table {tableLabel}</p>
      </header>

      <main className="p-4">
        {menu.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <p className="text-4xl">🍽️</p>
            <p className="text-sm text-gray-400">No menu items available yet.</p>
          </div>
        ) : (
          menu.map((cat) => (
            <section key={cat.id} className="mb-6">
              <h2 className="mb-3 font-display text-lg text-odfe-teal">{cat.name}</h2>
              <div className="space-y-2">
                {cat.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-gray-400">{product.description}</p>
                      )}
                    </div>
                    <p className="font-display text-base text-odfe-gold">₹{product.price}</p>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
