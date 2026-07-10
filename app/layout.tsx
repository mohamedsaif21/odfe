import type { Metadata } from "next"
import { Inter, Anton } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/ui/theme-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display" })

export const metadata: Metadata = {
  title: "Premium Cafe POS",
  description: "Premium Cafe Point of Sale System",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${anton.variable}`}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
