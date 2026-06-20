import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "ODFE — Odoo Food Experience",
  description:
    "Premium Cafe POS system built on Odoo 19. Manage orders, payments, kitchen display, and more.",
  keywords: [
    "POS",
    "cafe",
    "Odoo",
    "food",
    "order management",
    "kitchen display",
  ],
  icons: {
    icon: [{ url: "/dark_logo.jpeg", sizes: "any" }],
    apple: [{ url: "/dark_logo.jpeg", sizes: "180x180", type: "image/jpeg" }],
  },
  openGraph: {
    title: "ODFE — Odoo Food Experience",
    description: "Premium Cafe POS system built on Odoo 19.",
    images: [
      {
        url: "/dark_logo.jpeg",
        width: 1200,
        height: 630,
        alt: "ODFE Logo",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#E8E3D3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/dark_logo.jpeg" sizes="any" />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
