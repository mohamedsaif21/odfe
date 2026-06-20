import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeContext";

export const metadata: Metadata = {
  title: "ODFE — Odoo Food Experience",
  description:
    "Premium Restaurant & Cafe POS system built on Odoo 19. Manage orders, payments, kitchen display, and more.",
  keywords: [
    "POS",
    "restaurant",
    "cafe",
    "Odoo",
    "food",
    "order management",
    "kitchen display",
  ],
  icons: {
    icon: [
      { url: "/dark_logo.jpeg", sizes: "any" },
      { url: "/light_logo.jpeg", sizes: "any", type: "image/jpeg" },
    ],
    apple: [
      { url: "/dark_logo.jpeg", sizes: "180x180", type: "image/jpeg" },
    ],
  },
  openGraph: {
    title: "ODFE — Odoo Food Experience",
    description:
      "Premium Restaurant & Cafe POS system built on Odoo 19.",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#04090d" },
  ],
  width: "device-width",
  initialScale: 1,
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/dark_logo.jpeg" sizes="any" />
        <link rel="apple-touch-icon" href="/dark_logo.jpeg" sizes="180x180" />
        <link rel="preload" href="/light_logo.jpeg" as="image" />
        <link rel="preload" href="/dark_logo.jpeg" as="image" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(theme);
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg text-text-primary antialiased">
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
