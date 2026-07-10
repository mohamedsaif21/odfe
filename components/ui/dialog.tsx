"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full max-w-lg rounded-lg bg-white shadow-lg", className)}>
        <div className="flex items-center justify-between border-b border-cream-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-charcoal/60 hover:bg-cream hover:text-charcoal"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  )
}