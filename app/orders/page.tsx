"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "@/lib/services/_shared"
import type { Customer, Employee, Order, Profile, CafeTable } from "@/types/database"

type EmployeeWithProfile = Employee & { profile?: Pick<Profile, "full_name" | "email"> | null }

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Record<string, Customer>>({})
  const [tables, setTables] = useState<Record<string, CafeTable>>({})
  const [employees, setEmployees] = useState<Record<string, EmployeeWithProfile>>({})
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
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

        const [customerRows, tableRows, employeeRows] = await Promise.all([
          supabase.from("customers").select("*").eq("cafe_id", cafeId),
          supabase.from("cafe_tables").select("*").eq("cafe_id", cafeId),
          supabase.from("employees").select("*, profiles(full_name, email)").eq("cafe_id", cafeId),
        ])
        if (customerRows.error) throw new Error(customerRows.error.message)
        if (tableRows.error) throw new Error(tableRows.error.message)
        if (employeeRows.error) throw new Error(employeeRows.error.message)

        setOrders(orderRows ?? [])
        setCustomers(Object.fromEntries((customerRows.data ?? []).map((row) => [row.id, row])))
        setTables(Object.fromEntries((tableRows.data ?? []).map((row) => [row.id, row])))
        setEmployees(Object.fromEntries(((employeeRows.data ?? []) as EmployeeWithProfile[]).map((row) => [row.id, row])))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
                <tr key={order.id}>
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
      </PageContainer>
    </AdminLayout>
  )
}
