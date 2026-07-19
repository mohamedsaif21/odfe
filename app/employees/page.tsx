"use client"

import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import {
  Plus, Search, X, Loader2,
  ShoppingCart, DollarSign, Clock, CalendarDays,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { fetchEmployees, updateEmployeeRole, deactivateEmployee, activateEmployee, type EmployeeWithProfile } from "@/lib/services/employee.service"
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "@/lib/services/_shared"
import type { EmployeeRole } from "@/types/database"

type EmployeeStats = {
  ordersHandled: number
  totalSales: number
  sessionsCount: number
  lastActive: string | null
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeWithProfile[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [temporaryPassword, setTemporaryPassword] = useState("")
  const [role, setRole] = useState<"cashier" | "kitchen">("cashier")
  const [pin, setPin] = useState("")

  // Detail modal
  const [detailEmp, setDetailEmp] = useState<EmployeeWithProfile | null>(null)
  const [detailStats, setDetailStats] = useState<EmployeeStats | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEmployees(await fetchEmployees())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function loadEmployeeStats(employeeId: string) {
    setDetailLoading(true)
    try {
      const supabase = createClient()
      const cafeId = await getCafeId(supabase)

      const [ordersRes, sessionsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total, created_at")
          .eq("employee_id", employeeId)
          .eq("cafe_id", cafeId)
          .in("status", ["paid", "completed"]),
        supabase
          .from("pos_sessions")
          .select("id, opened_at, closed_at")
          .eq("employee_id", employeeId)
          .eq("cafe_id", cafeId)
          .order("opened_at", { ascending: false })
          .limit(20),
      ])

      const orders = ordersRes.data ?? []
      const sessions = sessionsRes.data ?? []

      setDetailStats({
        ordersHandled: orders.length,
        totalSales: orders.reduce((s, o) => s + Number(o.total), 0),
        sessionsCount: sessions.length,
        lastActive: sessions.length > 0 && sessions[0].opened_at ? sessions[0].opened_at : null,
      })
    } catch {
      setDetailStats(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function changeRole(id: string, newRole: EmployeeRole) {
    try {
      await updateEmployeeRole(id, newRole)
      setSuccess("Employee role updated")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role")
    }
  }

  async function toggleActive(emp: EmployeeWithProfile) {
    try {
      const currentlyActive = emp.profiles?.is_active ?? true
      if (currentlyActive) {
        await deactivateEmployee(emp.id)
      } else {
        await activateEmployee(emp.id)
      }
      const label = emp.profiles?.full_name ?? "Employee"
      setSuccess(`${label} ${currentlyActive ? "deactivated" : "activated"}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update employee status")
    }
  }

  async function createStaffAccount(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          temporaryPassword,
          role,
          pin: pin.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to create employee")
      setFullName("")
      setEmail("")
      setTemporaryPassword("")
      setRole("cashier")
      setPin("")
      setShowCreate(false)
      setSuccess("Employee account created")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee")
    } finally {
      setCreating(false)
    }
  }

  function openDetail(emp: EmployeeWithProfile) {
    setDetailEmp(emp)
    setDetailStats(null)
    loadEmployeeStats(emp.id)
  }

  const isActive = (emp: EmployeeWithProfile): boolean => emp.profiles?.is_active ?? true
  const filtered = employees.filter((e) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const name = e.profiles?.full_name?.toLowerCase() ?? ""
    const emailVal = e.profiles?.email?.toLowerCase() ?? ""
    return name.includes(q) || emailVal.includes(q)
  })

  const ROLE_BADGE: Record<string, string> = {
    admin: "bg-odfe-teal text-white",
    cashier: "bg-odfe-sage text-odfe-charcoal",
    kitchen: "bg-odfe-gold text-odfe-charcoal",
  }

  const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"

  return (
    <AdminLayout title="Employees">
      <PageContainer>
        <PageHeader title="Employees" description="Staff accounts, roles, and performance" />

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        {/* Action Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className={`${inputClass} pl-9`}
            />
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 rounded-lg bg-odfe-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-odfe-teal-light"
          >
            <Plus size={15} /> Add Employee
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <form onSubmit={createStaffAccount} className="mb-4 rounded-lg border border-cream-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-charcoal">Create staff account</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_140px_100px_auto]">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required className={inputClass} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required className={inputClass} />
              <input type="password" value={temporaryPassword} onChange={(e) => setTemporaryPassword(e.target.value)} placeholder="Temporary password" minLength={6} required className={inputClass} />
              <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                <option value="cashier">Cashier</option>
                <option value="kitchen">Kitchen</option>
              </Select>
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="PIN" maxLength={4} className={inputClass} />
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </form>
        )}

        {/* Employee Cards / Table */}
        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3 hidden sm:table-cell">Role</th>
                <th className="px-4 py-3 hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">Status</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Orders</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Sales</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading employees...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No employees found</td></tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-cream-50 cursor-pointer" onClick={() => openDetail(emp)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-odfe-teal/10 text-xs font-semibold text-odfe-teal">
                          {emp.profiles?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium">{emp.profiles?.full_name ?? "Unknown"}</p>
                          <p className="text-xs text-gray-400 sm:hidden">{emp.role} · {isActive(emp) ? "Active" : "Inactive"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge className={ROLE_BADGE[emp.role] ?? ""}>{emp.role}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500">{emp.profiles?.email ?? "-"}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      {isActive(emp) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm hidden lg:table-cell">—</td>
                    <td className="px-4 py-3 text-right text-sm hidden lg:table-cell">—</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openDetail(emp) }}
                          className="rounded px-2 py-1 text-xs text-odfe-teal hover:bg-odfe-teal/5">
                          View
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleActive(emp) }}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                          {isActive(emp) ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Modal */}
        {(detailEmp || detailLoading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-odfe-teal/10 text-sm font-semibold text-odfe-teal">
                    {detailEmp?.profiles?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{detailEmp?.profiles?.full_name ?? "Loading..."}</h2>
                    {detailEmp && (
                      <Badge className={ROLE_BADGE[detailEmp.role] ?? ""}>{detailEmp.role}</Badge>
                    )}
                  </div>
                </div>
                <button onClick={() => { setDetailEmp(null); setDetailStats(null) }}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="px-5 py-4 space-y-4">
                {detailLoading ? (
                  <div className="flex h-24 items-center justify-center"><Loader2 size={20} className="animate-spin text-odfe-teal" /></div>
                ) : detailStats ? (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-odfe-teal/5 p-3">
                        <div className="flex items-center gap-2 text-odfe-teal">
                          <ShoppingCart size={14} />
                          <span className="text-xs text-gray-500">Orders</span>
                        </div>
                        <p className="mt-1 text-lg font-bold">{detailStats.ordersHandled}</p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-3">
                        <div className="flex items-center gap-2 text-green-600">
                          <DollarSign size={14} />
                          <span className="text-xs text-gray-500">Sales</span>
                        </div>
                        <p className="mt-1 text-lg font-bold">₹{detailStats.totalSales.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-purple-50 p-3">
                        <div className="flex items-center gap-2 text-purple-600">
                          <CalendarDays size={14} />
                          <span className="text-xs text-gray-500">Sessions</span>
                        </div>
                        <p className="mt-1 text-lg font-bold">{detailStats.sessionsCount}</p>
                      </div>
                      <div className="rounded-lg bg-orange-50 p-3">
                        <div className="flex items-center gap-2 text-orange-600">
                          <Clock size={14} />
                          <span className="text-xs text-gray-500">Last Active</span>
                        </div>
                        <p className="mt-1 text-sm font-medium">
                          {detailStats.lastActive
                            ? new Date(detailStats.lastActive).toLocaleDateString()
                            : "Never"
                          }
                        </p>
                      </div>
                    </div>

                    {/* Contact & Status */}
                    <div className="space-y-2 text-sm border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email</span>
                        <span>{detailEmp?.profiles?.email ?? "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status</span>
                        <span className={detailEmp && isActive(detailEmp) ? "text-green-600" : "text-red-500"}>
                          {detailEmp && isActive(detailEmp) ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Joined</span>
                        <span>{detailEmp ? new Date(detailEmp.created_at).toLocaleDateString() : "-"}</span>
                      </div>
                    </div>

                    {/* Role Change */}
                    {detailEmp && (
                      <div className="flex items-center gap-2 border-t pt-3">
                        <span className="text-xs text-gray-500">Change role:</span>
                        <Select
                          value={detailEmp.role}
                          onChange={(e) => {
                            changeRole(detailEmp.id, e.target.value as EmployeeRole)
                            setDetailEmp({ ...detailEmp, role: e.target.value as EmployeeRole })
                          }}
                          className="w-32"
                        >
                          <option value="admin">Admin</option>
                          <option value="cashier">Cashier</option>
                          <option value="kitchen">Kitchen</option>
                        </Select>
                        {detailEmp && (
                          <button
                            onClick={() => toggleActive(detailEmp)}
                            className="ml-auto rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            {isActive(detailEmp) ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
              <div className="border-t px-5 py-4">
                <button onClick={() => { setDetailEmp(null); setDetailStats(null) }}
                  className="w-full rounded-lg bg-odfe-teal py-2.5 text-sm font-semibold text-white">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminLayout>
  )
}
