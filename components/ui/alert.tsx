"use client"

import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface AlertProps {
  type: "success" | "error"
  message: string
  onDismiss?: () => void
}

export function Alert({ type, message, onDismiss }: AlertProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm",
        type === "success"
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      <span className="flex items-center gap-2">
        {type === "success" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0" />
        )}
        {message}
      </span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-xs underline opacity-70 hover:opacity-100">
          Dismiss
        </button>
      )}
    </div>
  )
}