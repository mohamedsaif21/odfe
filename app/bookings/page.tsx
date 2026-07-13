"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, RefreshCw } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "@/lib/services/_shared"
import type { Booking, CafeTable, Customer } from "@/types/database"

export default function BookingsPage() {
  const [cafeId, setCafeId] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [tables, setTables] = useState<CafeTable[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    party_size: "2",
    booking_date: "",
    booking_time: "",
    table_id: "",
    notes: "",
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const activeCafeId = await getCafeId(supabase)
      setCafeId(activeCafeId)
      const [bookingRows, tableRows, customerRows] = await Promise.all([
        supabase.from("bookings").select("*").eq("cafe_id", activeCafeId).order("booking_date", { ascending: true }).order("booking_time", { ascending: true }),
        supabase.from("cafe_tables").select("*").eq("cafe_id", activeCafeId).order("label"),
        supabase.from("customers").select("*").eq("cafe_id", activeCafeId).order("name"),
      ])
      if (bookingRows.error) throw new Error(bookingRows.error.message)
      if (tableRows.error) throw new Error(tableRows.error.message)
      if (customerRows.error) throw new Error(customerRows.error.message)
      setBookings(bookingRows.data ?? [])
      setTables(tableRows.data ?? [])
      setCustomers(customerRows.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function createBooking() {
    if (!cafeId) return
    if (!form.customer_name.trim() || !form.booking_date || !form.booking_time) {
      setError("Customer name, date, and time are required.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const matchedCustomer = customers.find((customer) =>
        customer.phone && form.customer_phone && customer.phone === form.customer_phone
      )
      const { error: insertError } = await supabase.from("bookings").insert({
        cafe_id: cafeId,
        customer_id: matchedCustomer?.id ?? null,
        table_id: form.table_id || null,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        party_size: Number(form.party_size),
        booking_date: form.booking_date,
        booking_time: form.booking_time,
        status: "pending",
        notes: form.notes.trim() || null,
      })
      if (insertError) throw new Error(insertError.message)
      setSuccess("Booking created")
      setForm({ customer_name: "", customer_phone: "", party_size: "2", booking_date: "", booking_time: "", table_id: "", notes: "" })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking")
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(booking: Booking, status: Booking["status"]) {
    setError(null)
    const previous = bookings
    setBookings((rows) => rows.map((row) => row.id === booking.id ? { ...row, status } : row))
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", booking.id)
        .eq("cafe_id", booking.cafe_id)
      if (updateError) throw new Error(updateError.message)
      setSuccess(`Booking ${status}`)
    } catch (err) {
      setBookings(previous)
      setError(err instanceof Error ? err.message : "Failed to update booking")
    }
  }

  function tableLabel(tableId: string | null) {
    if (!tableId) return "-"
    return tables.find((table) => table.id === tableId)?.label ?? "-"
  }

  return (
    <AdminLayout title="Bookings">
      <PageContainer>
        <div className="mb-4 flex items-center justify-between">
          <PageHeader title="Bookings" description="Reservations and table bookings" />
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        </div>
        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        <div className="mb-6 rounded-lg border border-cream-200 bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Customer name" />
            <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="Phone" />
            <Input type="number" min="1" value={form.party_size} onChange={(e) => setForm({ ...form, party_size: e.target.value })} placeholder="Party size" />
            <Select value={form.table_id} onChange={(e) => setForm({ ...form, table_id: e.target.value })}>
              <option value="">No table assigned</option>
              {tables.map((table) => <option key={table.id} value={table.id}>{table.label}</option>)}
            </Select>
            <Input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} />
            <Input type="time" value={form.booking_time} onChange={(e) => setForm({ ...form, booking_time: e.target.value })} />
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="lg:col-span-2" />
          </div>
          <Button className="mt-3" onClick={createBooking} disabled={saving}>
            <Plus className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Create booking"}
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60">
              <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Table</th><th className="px-4 py-3">Party</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading bookings...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No bookings found</td></tr>
              ) : bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-4 py-3"><p className="font-medium">{booking.customer_name}</p><p className="text-xs text-muted-foreground">{booking.customer_phone ?? "-"}</p></td>
                  <td className="px-4 py-3">{booking.booking_date}</td>
                  <td className="px-4 py-3">{booking.booking_time}</td>
                  <td className="px-4 py-3">{tableLabel(booking.table_id)}</td>
                  <td className="px-4 py-3">{booking.party_size}</td>
                  <td className="px-4 py-3 capitalize">{booking.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(booking, "confirmed")}>Confirm</Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(booking, "cancelled")}>Cancel</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
