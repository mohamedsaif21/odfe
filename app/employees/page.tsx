"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { fetchEmployees, updateEmployeeRole, type EmployeeWithProfile } from "@/lib/services/employee.service"
import type { EmployeeRole } from "@/types/database"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setEmployees(await fetchEmployees())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function changeRole(id: string, role: EmployeeRole) {
    try {
      await updateEmployeeRole(id, role)
      setSuccess("Employee role updated")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role")
    }
  }

  return (
    <AdminLayout title="Employees">
      <PageContainer>
        <PageHeader title="Employees" description="Staff accounts and role management" />
        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}
        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Change role</th></tr></thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading employees...</td></tr> :
                employees.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No employees found</td></tr> :
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-4 py-3 font-medium">{employee.profiles?.full_name ?? "Unknown"}</td>
                    <td className="px-4 py-3">{employee.profiles?.email ?? "-"}</td>
                    <td className="px-4 py-3"><Badge>{employee.role}</Badge></td>
                    <td className="px-4 py-3">{new Date(employee.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Select value={employee.role} onChange={(e) => changeRole(employee.id, e.target.value as EmployeeRole)} className="w-36">
                        <option value="admin">Admin</option>
                        <option value="cashier">Cashier</option>
                        <option value="kitchen">Kitchen</option>
                      </Select>
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
