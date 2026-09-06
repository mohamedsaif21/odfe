"use client"

import { useState } from "react"

export default function RedeemTestPage() {
  const [message, setMessage] = useState("Waiting for button click...")

  function testButton() {
    console.log("BUTTON CLICK WORKED")
    setMessage("✅ BUTTON CLICK WORKED")
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Loyalty Redemption Test</h1>

      <p>
        Customer: 0cfbe883-9a8f-4467-8498-269852dee56e
      </p>

      <p>
        Order: ODFE-20260716-075050-3B9146
      </p>

      <button
        type="button"
        onClick={testButton}
        style={{
          padding: "12px 24px",
          marginTop: 20,
          cursor: "pointer",
        }}
      >
        Redeem 2 Points
      </button>

      <div
        style={{
          marginTop: 30,
          padding: 20,
          border: "1px solid #ccc",
        }}
      >
        {message}
      </div>
    </main>
  )
}
