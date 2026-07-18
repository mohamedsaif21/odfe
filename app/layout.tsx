import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/auth/AuthProvider"

export const metadata: Metadata = {
  title: {
    default: "OdFe - Premium Cafe POS",
    template: "%s | OdFe",
  },
  description: "Premium Cafe POS SaaS for ordering, payments, kitchen operations, customer self-ordering, and analytics.",
  icons: {
    icon: "/assets/logo/odfe-icon.png",
  },
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
