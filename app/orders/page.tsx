"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "@/lib/services/_shared"
import { createPaymentForOrder } from "@/lib/orders/create-order"
import { fetchPaymentMethods } from "@/lib/services/payment.service"
import type { Customer, Employee, Order, Profile, CafeTable, Payment, PaymentMethodType } from "@/types/database"

type EmployeeWithProfile = Employee & { profile?: Pick<Profile, "full_name" | "email"> | null }

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Record<string, Customer>>({})
  const [tables, setTables] = useState<Record<string, CafeTable>>({})
  const [employees, setEmployees] = useState<Record<string, EmployeeWithProfile>>({})
  const [payments, setPayments] = useState<Record<string, Payment[]>>({})
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; type: PaymentMethodType; label: string; is_active: boolean }[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cash")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [collecting, setCollecting] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const cafeId = await getCafeId(supabase)
      const { data: orderRows, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("cafe_id", cafeId)
        .order("created_at", { ascending: false })
      if (orderError) throw new Error(orderError.message)

      const [customerRows, tableRows, employeeRows, paymentRows, methodRows] = await Promise.all([
        supabase.from("customers").select("*").eq("cafe_id", cafeId),
        supabase.from("cafe_tables").select("*").eq("cafe_id", cafeId),
        supabase.from("employees").select("*, profiles(full_name, email)").eq("cafe_id", cafeId),
        supabase.from("payments").select("*").eq("cafe_id", cafeId).order("paid_at", { ascending: false }),
        fetchPaymentMethods(supabase),
      ])
      if (customerRows.error) throw new Error(customerRows.error.message)
      if (tableRows.error) throw new Error(tableRows.error.message)
      if (employeeRows.error) throw new Error(employeeRows.error.message)
      if (paymentRows.error) throw new Error(paymentRows.error.message)

      const groupedPayments: Record<string, Payment[]> = {}
      for (const payment of paymentRows.data ?? []) {
        groupedPayments[payment.order_id] = [...(groupedPayments[payment.order_id] ?? []), payment]
      }

      setOrders(orderRows ?? [])
      setCustomers(Object.fromEntries((customerRows.data ?? []).map((row) => [row.id, row])))
      setTables(Object.fromEntries((tableRows.data ?? []).map((row) => [row.id, row])))
      setEmployees(Object.fromEntries(((employeeRows.data ?? []) as EmployeeWithProfile[]).map((row) => [row.id, row])))
      setPayments(groupedPayments)
      setPaymentMethods(methodRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return orders
    return orders.filter((order) => {
      const customer = order.customer_id ? customers[order.customer_id]?.name : ""
      const employee = order.employee_id ? employees[order.employee_id]?.profile?.full_name : ""
      const table = order.table_id ? tables[order.table_id]?.label : ""
      return [order.order_number, order.status, customer, employee, table].some((value) =>
        value?.toLowerCase().includes(query),
      )
    })
  }, [customers, employees, orders, search, tables])

  const selectedPayments = selectedOrder ? payments[selectedOrder.id] ?? [] : []
  const selectedPaidTotal = selectedPayments
    .filter((payment) => payment.status === "completed")
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
  const selectedBalance = selectedOrder ? Math.max(Number(selectedOrder.total) - selectedPaidTotal, 0) : 0

  function openOrder(order: Order) {
    setSelectedOrder(order)
    setPaymentError(null)
    setPaymentMethod("cash")
    setPaymentAmount(Math.max(Number(order.total) - ((payments[order.id] ?? [])
      .filter((payment) => payment.status === "completed")
      .reduce((sum, payment) => sum + Number(payment.amount), 0)), 0).toFixed(2))
    setPaymentReference("")
  }

  async function handleCollectPayment() {
    if (!selectedOrder || collecting) return
    setPaymentError(null)
    const amount = Number(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Payment amount must be greater than zero.")
      return
    }
    if ((paymentMethod === "card" || paymentMethod === "upi") && !paymentReference.trim()) {
      setPaymentError(paymentMethod === "card" ? "Card payment requires a transaction reference number." : "UPI payment requires a transaction reference number.")
      return
    }

    setCollecting(true)
    try {
      const cafeId = await getCafeId()
      const result = await createPaymentForOrder({
        cafeId,
        orderId: selectedOrder.id,
        method: paymentMethod,
        amount,
        reference: paymentReference.trim() || null,
      })
      await load()
      setSelectedOrder((current) => current ? { ...current, status: result.orderStatus } : current)
      setPaymentAmount(result.remaining.toFixed(2))
      setPaymentReference("")
      if (!result.fullyPaid) {
        setPaymentError(`Payment saved. Remaining balance: ₹${result.remaining.toFixed(2)}.`)
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to collect payment.")
    } finally {
      setCollecting(false)
    }
  }

  return (
    <AdminLayout title="Orders">
      <PageContainer>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader title="Orders" description="All cafe orders and their current status" />
          <div className="relative sm:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-charcoal/40" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders" className="pl-9" />
          </div>
        </div>
        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading orders...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No orders found</td></tr>
              ) : filtered.map((order) => (
                <tr key={order.id} className="cursor-pointer hover:bg-cream-50" onClick={() => openOrder(order)}>
                  <td className="px-4 py-3 font-medium">{order.order_number}</td>
                  <td className="px-4 py-3">{order.customer_id ? customers[order.customer_id]?.name ?? "Unknown" : "Walk-in"}</td>
                  <td className="px-4 py-3">{order.employee_id ? employees[order.employee_id]?.profile?.full_name ?? "Unknown" : "-"}</td>
                  <td className="px-4 py-3">{order.table_id ? tables[order.table_id]?.label ?? "-" : "-"}</td>
                  <td className="px-4 py-3"><Badge>{order.status.replaceAll("_", " ")}</Badge></td>
                  <td className="px-4 py-3 text-right">₹{Number(order.total).toFixed(2)}</td>
                  <td className="px-4 py-3">{new Date(order.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Dialog open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} title={selectedOrder ? `Order ${selectedOrder.order_number}` : "Order"}>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div><p className="text-charcoal/50">Order total</p><p className="font-semibold">₹{Number(selectedOrder.total).toFixed(2)}</p></div>
                <div><p className="text-charcoal/50">Amount paid</p><p className="font-semibold">₹{selectedPaidTotal.toFixed(2)}</p></div>
                <div><p className="text-charcoal/50">Balance</p><p className="font-semibold">₹{selectedBalance.toFixed(2)}</p></div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Payment history</p>
                <div className="rounded-md border border-cream-200">
                  {selectedPayments.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">No payments collected.</p>
                  ) : selectedPayments.map((payment) => (
                    <div key={payment.id} className="grid grid-cols-[1fr_80px_100px] gap-2 border-b border-cream-100 px-3 py-2 text-sm last:border-b-0">
                      <span className="uppercase">{payment.method}</span>
                      <span>₹{Number(payment.amount).toFixed(2)}</span>
                      <Badge>{payment.status}</Badge>
                      <span className="col-span-3 text-xs text-charcoal/50">{payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "Not paid"}{payment.reference ? ` · ${payment.reference}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedOrder.status === "paid" ? (
                <p className="rounded-md bg-cream-100 px-3 py-2 text-sm text-charcoal/70">Paid orders are view-only.</p>
              ) : (
                <div className="space-y-3 border-t border-cream-200 pt-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)} disabled={collecting}>
                      {paymentMethods.filter((method) => method.type !== "split").map((method) => (
                        <option key={method.id} value={method.type}>{method.label}</option>
                      ))}
                    </Select>
                    <Input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} disabled={collecting} />
                    <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder={paymentMethod === "cash" ? "Reference optional" : "Reference required"} disabled={collecting} />
                  </div>
                  {paymentError && <Alert type={paymentError.startsWith("Payment saved") ? "success" : "error"} message={paymentError} onDismiss={() => setPaymentError(null)} />}
                  <Button onClick={handleCollectPayment} disabled={collecting || selectedBalance <= 0}>
                    {collecting ? "Processing..." : "Collect payment"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Dialog>
      </PageContainer>
    </AdminLayout>
  )
}
