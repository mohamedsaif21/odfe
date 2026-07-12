"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import type { CafeTable } from "@/types/database"

interface QrDialogProps {
  open: boolean
  onClose: () => void
  table: CafeTable | null
}

export function QrDialog({ open, onClose, table }: QrDialogProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const path = table?.qr_token ? `/s/${table.qr_token}` : null
  const fullUrl = path ? (typeof window !== "undefined" ? `${window.location.origin}${path}` : path) : null

  useEffect(() => {
    setDataUrl(null)
    setError(null)
    setCopied(false)
    if (!open || !fullUrl) return

    let cancelled = false
    QRCode.toDataURL(fullUrl, { margin: 1, width: 240 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to generate QR image")
      })

    return () => {
      cancelled = true
    }
  }, [open, fullUrl])

  async function handleCopy() {
    if (!fullUrl) return
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable — ignore silently
    }
  }

  if (!table) return null

  return (
    <Dialog open={open} onClose={onClose} title={`QR — ${table.label}`}>
      {!fullUrl ? (
        <p className="text-sm text-charcoal/60">No QR token generated yet for this table.</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR code for ${table.label}`}
              className="h-48 w-48 rounded-md border border-cream-200"
            />
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded-md border border-dashed border-cream-200 text-xs text-charcoal/40">
              Generating…
            </div>
          )}
          <div className="flex w-full items-center gap-2 rounded-md border border-cream-200 bg-cream/40 px-3 py-2">
            <code className="flex-1 truncate text-xs text-charcoal/80">{fullUrl}</code>
            <Button variant="ghost" size="sm" onClick={handleCopy} aria-label="Copy URL">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}