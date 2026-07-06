import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { TopHeader } from "@/components/layout/top-header"

export const metadata: Metadata = {
  title: "Premium Cafe POS",
  description: "Premium Cafe Point of Sale System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AdminSidebar />
          <div className="ml-64 min-h-screen">
            <TopHeader />
            <main className="p-6">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
