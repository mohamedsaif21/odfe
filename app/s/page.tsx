import type { Metadata } from "next"
import { OdfeLogo } from "@/components/branding/odfe-logo"

export const metadata: Metadata = { title: "Self Order" }

export default function SelfOrderRedirectPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-odfe-cream p-4">
      <div className="text-center">
        <OdfeLogo variant="full" size="lg" priority className="mx-auto" />
        <p className="mt-2 text-sm text-odfe-sage">Scan the QR code on your table to start ordering</p>
        <div className="mx-auto mt-4 h-0.5 w-12 rounded-full bg-odfe-gold" />
      </div>
    </div>
  )
}
