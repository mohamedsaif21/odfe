import type { Config } from "tailwindcss"
import { fontFamily } from "tailwindcss/defaultTheme"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── OdFe brand palette ───────────────────────────────
        odfe: {
          teal:            "#0B3C43",
          "teal-light":    "#134a52",
          "teal-dark":     "#082a2f",
          "teal-muted":    "#0d4248",
          sage:            "#7FA28D",
          "sage-light":    "#9bb9a8",
          "sage-muted":    "#6a8b78",
          cream:           "#F4F1EA",
          "cream-dark":    "#e8e4db",
          charcoal:        "#1A1A1A",
          "charcoal-light":"#242424",
          "charcoal-muted":"#2e2e2e",
          gold:            "#C09A4D",
          "gold-light":    "#d4b56e",
          "gold-dark":     "#a07d35",
          danger:          "#b9543f",
          "danger-light":  "#d4654d",
        },
        // ─── Shadcn-compatible semantic tokens ────────────────
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        sidebar: {
          DEFAULT:    "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary:    "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:     "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border:     "hsl(var(--sidebar-border))",
          ring:       "hsl(var(--sidebar-ring))",
        },
      },

      fontFamily: {
        // Anton for display (prices, totals, screen headers)
        display: ["Anton", "var(--font-display)", ...fontFamily.sans],
        // Inter for all UI body text
        sans: ["Inter", "var(--font-sans)", ...fontFamily.sans],
        // Mono for order numbers, codes
        mono: ["var(--font-mono)", ...fontFamily.mono],
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to:   { transform: "translateX(0)" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(192,154,77,0)" },
          "50%":       { boxShadow: "0 0 0 6px rgba(192,154,77,0.15)" },
        },
      },

      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 0.2s ease-out",
        "slide-in-right":  "slide-in-right 0.25s ease-out",
        "pulse-gold":      "pulse-gold 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

export default config