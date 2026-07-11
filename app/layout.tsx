import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/auth/AuthProvider"

export const metadata: Metadata = {
  title: {
    default: "OdFe — Premium Cafe POS",
    template: "%s | OdFe POS",
  },
  description: "Premium Cafe POS SaaS",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}