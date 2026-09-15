"use client"

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js"

export type RazorpayCheckoutOptions = {
  keyId: string
  amountPaise: number
  currency: string
  orderId: string
  name: string
  description: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
}

export type RazorpayCheckoutResponse = {
  razorpay_payment_id?: string
  razorpay_order_id?: string
  razorpay_signature?: string
}

export class RazorpayCheckoutClosedError extends Error {
  name = "RazorpayCheckoutClosedError"
}

type RazorpayInstance = {
  open: () => void
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance

type RazorpayWindow = Window & {
  Razorpay?: RazorpayConstructor
}

let checkoutScriptPromise: Promise<void> | null = null

function loadCheckoutScript(): Promise<void> {
  if (checkoutScriptPromise) return checkoutScriptPromise

  checkoutScriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Payment is only available in the browser."))
      return
    }

    if ((window as RazorpayWindow).Razorpay) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = RAZORPAY_CHECKOUT_SRC
    script.async = true

    const cleanup = () => {
      script.onload = null
      script.onerror = null
    }

    script.onload = () => {
      cleanup()
      resolve()
    }

    script.onerror = () => {
      cleanup()
      checkoutScriptPromise = null
      reject(new Error("Unable to load the payment window. Please try again."))
    }

    document.head.appendChild(script)
  })

  return checkoutScriptPromise
}

export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutResponse> {
  await loadCheckoutScript()

  const Razorpay = (window as RazorpayWindow).Razorpay
  if (!Razorpay) {
    throw new Error("Unable to load the payment window. Please try again.")
  }

  return new Promise<RazorpayCheckoutResponse>((resolve, reject) => {
    let settled = false

    const instance = new Razorpay({
      key: options.keyId,
      amount: options.amountPaise,
      currency: options.currency,
      order_id: options.orderId,
      name: options.name,
      description: options.description,
      prefill: options.prefill,
      handler: (response: RazorpayCheckoutResponse) => {
        if (settled) return
        settled = true
        resolve(response)
      },
      modal: {
        ondismiss: () => {
          if (settled) return
          settled = true
          reject(new RazorpayCheckoutClosedError("Payment window closed."))
        },
      },
    })

    instance.open()
  })
}