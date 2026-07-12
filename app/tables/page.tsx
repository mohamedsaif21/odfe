"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { TableForm } from "@/components/tables/table-form"
import { TableList } from "@/components/tables/table-list"
import { QrDialog } from "@/components/tables/qr-dialog"
import {
  fetchFloors,
  fetchTables,
  createTable,
  updateTable,
  deleteTable,
  generateQrCode,
} from "@/lib/services/table.service"
import type { CafeTable, Floor, TableStatus } from "@/types/database"

export default function TablesPage() {
  const [floors, setFloors] = useState<Floor[]>([])
  const [tables, setTables] = useState<CafeTable[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<CafeTable | null>(null)
  const [deletingTable, setDeletingTable] = useState<CafeTable | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [qrTable, setQrTable] = useState<CafeTable | null>(null)
  const [qrLoadingId, setQrLoadingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [floorsData, tablesData] = await Promise.all([fetchFloors(), fetchTables()])
      setFloors(floorsData)
      setTables(tablesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tables")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!successMsg) return
    const t = setTimeout(() => setSuccessMsg(null), 3000)
    return () => clearTimeout(t)
  }, [successMsg])

  function openAddForm() {
    setEditingTable(null)
    setFormOpen(true)
  }

  function openEditForm(table: CafeTable) {
    setEditingTable(table)
    setFormOpen(true)
  }

  async function handleFormSubmit(input: { label: string; seats: number; floor_id?: string; status?: TableStatus }) {
    if (editingTable) {
      await updateTable(editingTable.id, input)
      setSuccessMsg("Table updated")
    } else {
      await createTable({ label: input.label, seats: input.seats, floor_id: input.floor_id })
      setSuccessMsg("Table added")
    }
    setFormOpen(false)
    await loadData()
  }

  async function handleStatusChange(table: CafeTable, status: TableStatus) {
    setError(null)
    const previous = table.status
    setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, status } : t)))
    try {
      await updateTable(table.id, { status })
      setSuccessMsg(`${table.label} marked ${status}`)
    } catch (err) {
      setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, status: previous } : t)))
      setError(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTable) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteTable(deletingTable.id)
      setSuccessMsg("Table deleted")
      setDeletingTable(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete table")
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleShowQr(table: CafeTable) {
    setError(null)
    if (table.qr_token) {
      setQrTable(table)
      return
    }
    setQrLoadingId(table.id)
    try {
      const token = await generateQrCode(table.id)
      const updated = { ...table, qr_token: token }
      setTables((prev) => prev.map((t) => (t.id === table.id ? updated : t)))
      setQrTable(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate QR token")
    } finally {
      setQrLoadingId(null)
    }
  }

  return (
    <AdminLayout title="Tables">
      <PageContainer>
        <div className="mb-4 flex items-center justify-between">
          <PageHeader title="Tables" description="Manage cafe tables and floor layout" />
          <Button onClick={openAddForm}>
            <Plus className="mr-2 h-4 w-4" />
            Add Table
          </Button>
        </div>

        {error && (
          <div className="mb-4">
            <Alert type="error" message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {successMsg && (
          <div className="mb-4">
            <Alert type="success" message={successMsg} onDismiss={() => setSuccessMsg(null)} />
          </div>
        )}

        {isLoading ? (
          <div className="rounded-xl border border-dashed border-cream-200 bg-card/50 p-12 text-center">
            <p className="text-sm text-muted-foreground">Loading tables…</p>
          </div>
        ) : (
          <TableList
            tables={tables}
            floors={floors}
            onEdit={openEditForm}
            onDelete={setDeletingTable}
            onStatusChange={handleStatusChange}
            onShowQr={handleShowQr}
            qrLoadingId={qrLoadingId}
          />
        )}
      </PageContainer>

      <TableForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        floors={floors}
        table={editingTable}
      />

      <ConfirmDialog
        open={!!deletingTable}
        title="Delete table"
        description={`This permanently deletes "${deletingTable?.label}" from the database. Unlike Products/Categories, tables use a hard delete — this cannot be undone.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTable(null)}
      />

      <QrDialog open={!!qrTable} onClose={() => setQrTable(null)} table={qrTable} />
    </AdminLayout>
  )
}