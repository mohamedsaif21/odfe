"use client"

import { useEffect, useRef, useState } from "react"
import { Printer, X, Loader2 } from "lucide-react"
import QRCode from "qrcode"
import { OdfeLogo } from "@/components/branding/odfe-logo"
import type { CafeInfo } from "@/lib/services/cafe.service"
import type { PaymentTender } from "@/types/app"

export interface ReceiptItem {
  name: string
  qty: number
  price: number
  total: number
}

export interface ReceiptData {
  orderNumber: string
  date: string
  table: string | null
  cashier: string | null
  items: ReceiptItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  tenders: PaymentTender[]
  couponCode?: string | null
}

type PrintableReceiptProps = {
  cafe: CafeInfo
  receipt: ReceiptData
  onClose: () => void
}

function ReceiptQR({ orderNumber }: { orderNumber: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, orderNumber, {
      width: 80,
      margin: 1,
      color: { dark: "#1e293b", light: "#ffffff" },
    })
  }, [orderNumber])

  return <canvas ref={canvasRef} className="mx-auto" />
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function PrintableReceipt({ cafe, receipt, onClose }: PrintableReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  const discountTotal = receipt.discount > 0 ? receipt.discount : 0

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .receipt-actions { display: none !important; }
          .receipt-modal-overlay { background: white !important; position: static !important; }
          .receipt-modal-inner { box-shadow: none !important; max-width: 320px !important; margin: 0 auto !important; }
        }
      `}</style>

      <div className="receipt-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-white">
        <div className="receipt-modal-inner w-full max-w-sm rounded-2xl bg-white shadow-2xl print:rounded-none print:shadow-none">
          {/* Actions bar */}
          <div className="receipt-actions flex items-center justify-between border-b px-5 py-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-odfe-teal px-4 py-2 text-sm font-semibold text-white hover:bg-odfe-teal-light"
            >
              <Printer size={15} /> Print
            </button>
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Close
            </button>
          </div>

          {/* Receipt content */}
          <div ref={printRef} className="px-6 py-5" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
            {/* Header */}
            <div className="text-center">
              {cafe.logoUrl ? (
                <img src={cafe.logoUrl} alt={cafe.name} className="mx-auto mb-2 h-12 w-auto object-contain" />
              ) : (
                <div className="mb-2 flex justify-center">
                  <OdfeLogo variant="full" size="sm" />
                </div>
              )}
              <h1 className="text-sm font-bold uppercase tracking-wide text-gray-900">{cafe.name}</h1>
              {cafe.address && (
                <p className="mt-0.5 text-[10px] leading-tight text-gray-500">{cafe.address}</p>
              )}
              {cafe.gst && (
                <p className="text-[10px] text-gray-400">GST: {cafe.gst}</p>
              )}
            </div>

            <hr className="my-3 border-t border-dashed border-gray-300" />

            {/* Order info */}
            <div className="space-y-0.5 text-[11px] text-gray-600">
              <div className="flex justify-between">
                <span>Order</span>
                <span className="font-semibold text-gray-900">{receipt.orderNumber}</span>
              </div>
              {receipt.table && (
                <div className="flex justify-between">
                  <span>Table</span>
                  <span>{receipt.table}</span>
                </div>
              )}
              {receipt.cashier && (
                <div className="flex justify-between">
                  <span>Cashier</span>
                  <span>{receipt.cashier}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Date</span>
                <span>{formatTime(receipt.date)}</span>
              </div>
            </div>

            <hr className="my-3 border-t border-dashed border-gray-300" />

            {/* Items */}
            <div className="space-y-1.5">
              <div className="flex items-center border-b border-gray-200 pb-1 text-[10px] font-semibold uppercase text-gray-400">
                <span className="flex-1">Item</span>
                <span className="w-8 text-right">Qty</span>
                <span className="w-14 text-right">Price</span>
                <span className="w-16 text-right">Total</span>
              </div>
              {receipt.items.map((item, i) => (
                <div key={i} className="flex items-center text-[11px] text-gray-700">
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className="w-8 text-right">{item.qty}</span>
                  <span className="w-14 text-right">₹{item.price.toFixed(2)}</span>
                  <span className="w-16 text-right font-medium">₹{item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <hr className="my-3 border-t border-dashed border-gray-300" />

            {/* Totals */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>₹{receipt.subtotal.toFixed(2)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Discount
                    {receipt.couponCode ? ` (${receipt.couponCode})` : ""}
                  </span>
                  <span>-₹{discountTotal.toFixed(2)}</span>
                </div>
              )}
              {receipt.tax > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Tax</span>
                  <span>₹{receipt.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-300 pt-1 text-sm font-bold text-gray-900">
                <span>Grand Total</span>
                <span>₹{receipt.total.toFixed(2)}</span>
              </div>
            </div>

            <hr className="my-3 border-t border-dashed border-gray-300" />

            {/* Payment Details */}
            <div className="space-y-1 text-[11px]">
              <p className="text-[10px] font-semibold uppercase text-gray-400">Payment Details</p>
              {receipt.tenders.map((tender, i) => (
                <div key={i} className="flex justify-between text-gray-700">
                  <span className="capitalize">
                    {tender.method}
                    {tender.reference ? ` (${tender.reference})` : ""}
                  </span>
                  <span className="font-medium">₹{tender.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <hr className="my-3 border-t border-dashed border-gray-300" />

            {/* QR Code */}
            <div className="flex justify-center">
              <ReceiptQR orderNumber={receipt.orderNumber} />
            </div>

            {/* Footer */}
            {cafe.receiptFooter && (
              <p className="mt-2 text-center text-[10px] text-gray-400">{cafe.receiptFooter}</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
