import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core palette
        cafe: {
          bg: "#E8E3D3",
          surface: "#AEB59A",
          accent: "#A16C3A",
          dark: "#652304",
          text: "#2A2118",
          "text-secondary": "#6F6459",
          border: "rgba(101,35,4,0.12)",
          glass: "rgba(255,255,255,0.45)",
          hover: "#B57B45",
          shadow: "rgba(60,40,20,0.08)",
          cream: "#F5F0E4",
          warm: "#D4C9B5",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["'DM Serif Display'", "Georgia", "serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        card: "18px",
        btn: "14px",
        input: "14px",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      boxShadow: {
        card: "0 10px 30px rgba(60,40,20,0.08)",
        "card-hover": "0 16px 40px rgba(60,40,20,0.12)",
        soft: "0 4px 16px rgba(60,40,20,0.06)",
        nav: "0 8px 24px rgba(60,40,20,0.06)",
      },
      animation: {
        "fade-in": "fadeIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-up": "fadeUp 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "scale-in": "scaleIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
