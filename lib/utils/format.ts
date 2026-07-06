/**
 * Formatting utilities used throughout the POS application.
 */

/** Format a number as Indian Rupees, e.g. ₹1,250.00 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Format a date string or Date as dd MMM yyyy */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

/** Format a date+time string as dd MMM yyyy, hh:mm AM/PM */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

/** Format elapsed seconds as mm:ss */
export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/** Generate a human-readable order number */
export function generateOrderNumber(): string {
  const now = Date.now()
  return `ORD-${now.toString(36).toUpperCase().slice(-6)}`
}

/** Truncate a string to maxLen characters */
export function truncate(str: string, maxLen = 30): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str
}

/** Capitalise the first letter of each word */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Get initials from a full name, e.g. "Aanya Rao" → "AR" */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}