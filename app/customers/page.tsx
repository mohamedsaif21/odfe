"use client"

import { useEffect, useState } from "react"
import { Plus, Search } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import { createCustomer, fetchCustomers, updateCustomer } from "@/lib/services/customer.service"
import type { Customer } from "@/types/database"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setCustomers(await fetchCustomers(search.trim() || undefined))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit() {
    if (!form.name.trim()) return
    try {
      if (editing) {
        await updateCustomer(editing.id, form)
        setSuccess("Customer updated")
      } else {
        await createCustomer(form)
        setSuccess("Customer added")
      }
      setEditing(null)
      setForm({ name: "", email: "", phone: "" })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customer")
    }
  }

  function startEdit(customer: Customer) {
    setEditing(customer)
    setForm({ name: customer.name, email: customer.email ?? "", phone: customer.phone ?? "" })
  }

  return (
    <AdminLayout title="Customers">
      <PageContainer>
        <PageHeader title="Customers" description="Customer directory and loyalty points" />
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
          <Button onClick={submit}><Plus className="mr-2 h-4 w-4" />{editing ? "Update" : "Add"}</Button>
        </div>
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-charcoal/40" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers" className="pl-9" />
          </div>
          <Button variant="outline" onClick={load}>Search</Button>
        </div>
        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}
        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Loyalty</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading customers...</td></tr> :
                customers.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No customers found</td></tr> :
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-3 font-medium">{customer.name}</td>
                    <td className="px-4 py-3">{customer.email ?? "-"}</td>
                    <td className="px-4 py-3">{customer.phone ?? "-"}</td>
                    <td className="px-4 py-3">{customer.loyalty_points}</td>
                    <td className="px-4 py-3 text-right"><Button variant="outline" size="sm" onClick={() => startEdit(customer)}>Edit</Button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
