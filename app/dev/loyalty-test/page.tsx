"use client";

import { useState } from "react";
import { earnPoints } from "@/lib/services/loyalty.service";

const CUSTOMER_ID = "0cfbe883-9a8f-4467-8498-269852dee56e";
const ORDER_ID = "2465ee45-be53-4474-bb23-c71585811058";

export default function LoyaltyTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const runTest = async () => {
    setLoading(true);
    setResult("");

    try {
      await earnPoints(
        CUSTOMER_ID,
        ORDER_ID,
        300
      );

      setResult("SUCCESS: earnPoints() completed successfully.");
    } catch (error) {
      console.error(error);

      setResult(
        `FAILED: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-xl rounded-xl border p-6">
        <h1 className="text-2xl font-bold">
          Loyalty RPC Test
        </h1>

        <div className="mt-6 space-y-2 text-sm">
          <p>
            <strong>Customer:</strong> Mohamed Saif
          </p>

          <p>
            <strong>Order:</strong>{" "}
            ODFE-20260716-084731-4F6140
          </p>

          <p>
            <strong>Order Total:</strong> ₹300
          </p>

          <p>
            <strong>Expected Points:</strong> 6
          </p>
        </div>

        <button
          onClick={runTest}
          disabled={loading}
          className="mt-6 rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Running..." : "Run Loyalty Test"}
        </button>

        {result && (
          <pre className="mt-6 whitespace-pre-wrap rounded-lg bg-gray-100 p-4">
            {result}
          </pre>
        )}
      </div>
    </main>
  );
}
