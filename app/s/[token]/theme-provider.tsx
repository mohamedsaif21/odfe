"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function useTheme() {
  const context = React.useContext(NextThemesProvider)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  // This is a bit of a hack to get the types to work correctly
  // The context can be undefined, but the library types don't reflect that
  // in a way that satisfies TypeScript's strict null checks here.
  return context as unknown as {
    theme: string | undefined
    setTheme: (theme: string) => void
  }
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
