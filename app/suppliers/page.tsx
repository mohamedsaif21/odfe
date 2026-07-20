"use client"

import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Plus, Search, X, Phone, Mail, MapPin, User, Building2 } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  fetchSuppliers, createSupplier, updateSupplier, deleteSupplier,
} from "@/lib/services/supplier.service"
import type { Supplier } from "@/types/database"

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formContact, setFormContact] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState<Supplier | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSuppliers(await fetchSuppliers())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(t)
  }, [success])

  function openCreate() {
    setEditingId(null)
    setFormName(""); setFormContact(""); setFormPhone("")
    setFormEmail(""); setFormAddress("")
    setShowForm(true)
  }

  function openEdit(s: Supplier) {
    setEditingId(s.id)
    setFormName(s.name)
    setFormContact(s.contact_person ?? "")
    setFormPhone(s.phone ?? "")
    setFormEmail(s.email ?? "")
    setFormAddress(s.address ?? "")
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!formName.trim()) { setError("Name is required"); return }
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await updateSupplier(editingId, {
          name: formName.trim(),
          contact_person: formContact.trim() || undefined,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          address: formAddress.trim() || undefined,
        })
        setSuccess("Supplier updated")
      } else {
        await createSupplier({
          name: formName.trim(),
          contact_person: formContact.trim() || undefined,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          address: formAddress.trim() || undefined,
        })
        setSuccess("Supplier created")
      }
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setSaving(true)
    try {
      await deleteSupplier(deleting.id)
      setSuccess(`"${deleting.name}" deactivated`)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setSaving(false)
    }
  }

  const filtered = suppliers.filter((s) =>
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase())
  )

  const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"

  return (
    <AdminLayout title="Suppliers">
      <PageContainer>
        <PageHeader title="Suppliers" description="Manage your vendors and suppliers" />

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-cream-200 bg-white p-3">
            <p className="text-xs text-gray-500">Total Suppliers</p>
            <p className="text-xl font-bold text-odfe-teal">{suppliers.length}</p>
          </div>
          <div className="rounded-lg border border-cream-200 bg-white p-3">
            <p className="text-xs text-gray-500">Active</p>
            <p className="text-xl font-bold text-green-600">{suppliers.filter((s) => s.is_active).length}</p>
          </div>
          <div className="rounded-lg border border-cream-200 bg-white p-3">
            <p className="text-xs text-gray-500">Inactive</p>
            <p className="text-xl font-bold text-gray-400">{suppliers.filter((s) => !s.is_active).length}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className={`${inputClass} pl-9`} />
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg bg-odfe-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-odfe-teal-light">
            <Plus size={15} /> Add Supplier
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-cream-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-charcoal">
              {editingId ? "Edit Supplier" : "New Supplier"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Company name *" required className={inputClass} />
              <input value={formContact} onChange={(e) => setFormContact(e.target.value)} placeholder="Contact person" className={inputClass} />
              <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Phone number" className={inputClass} />
              <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email address" type="email" className={inputClass} />
              <textarea value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Address" rows={2} className={`${inputClass} sm:col-span-2`} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 hidden sm:table-cell">Contact</th>
                <th className="px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 hidden lg:table-cell">Email</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading suppliers...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No suppliers found</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-cream-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="shrink-0 text-gray-400" />
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-gray-600">{s.contact_person || "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {s.phone ? (
                        <span className="flex items-center gap-1"><Phone size={12} className="text-gray-400" />{s.phone}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {s.email ? (
                        <span className="flex items-center gap-1"><Mail size={12} className="text-gray-400" />{s.email}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                        {s.is_active && (
                          <button onClick={() => setDeleting(s)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Deactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ConfirmDialog
          open={!!deleting}
          title="Deactivate supplier"
          description={`Deactivate "${deleting?.name}"? Purchase history is preserved.`}
          confirmLabel="Deactivate"
          isLoading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      </PageContainer>
    </AdminLayout>
  )
}
