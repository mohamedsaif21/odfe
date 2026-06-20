"use client";

import { useTheme } from "./ThemeContext";
import { HiOutlineSun, HiOutlineMoon } from "react-icons/hi";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-text-primary transition-colors duration-150 hover:border-brand-primary hover:text-brand-primary focus:outline-none"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <HiOutlineSun className="h-5 w-5" />
      ) : (
        <HiOutlineMoon className="h-5 w-5" />
      )}
    </button>
  );
}
