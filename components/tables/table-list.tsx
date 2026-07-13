"use client"

import { useMemo, useState } from "react"
import { Pencil, Trash2, QrCode, Users } from "lucide-react"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CafeTable, Floor, TableStatus } from "@/types/database"

interface TableListProps {
  tables: CafeTable[]
  floors: Floor[]
  onEdit: (table: CafeTable) => void
  onDelete: (table: CafeTable) => void
  onStatusChange: (table: CafeTable, status: TableStatus) => void
  onShowQr: (table: CafeTable) => void
  qrLoadingId?: string | null
}

const STATUS_VARIANT: Record<TableStatus, "success" | "warning" | "danger"> = {
  available: "success",
  occupied: "danger",
  reserved: "warning",
}

export function TableList({
  tables,
  floors,
  onEdit,
  onDelete,
  onStatusChange,
  onShowQr,
  qrLoadingId,
}: TableListProps) {
  const [floorFilter, setFloorFilter] = useState("")

  const floorName = (id: string | null) => floors.find((f) => f.id === id)?.name ?? "Unassigned"

  const filtered = useMemo(() => {
    if (!floorFilter) return tables
    return tables.filter((t) => t.floor_id === floorFilter)
  }, [tables, floorFilter])

  return (
    <div className="space-y-4">
      <Select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)} className="sm:w-56">
        <option value="">All floors</option>
        {floors.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </Select>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-cream-200 bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {tables.length === 0 ? "No tables yet. Add your first table to get started." : "No tables on this floor."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-lg border border-cream-200 bg-white p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-charcoal">{t.label}</div>
                  <div className="flex items-center gap-1 text-xs text-charcoal/50">
                    <Users className="h-3 w-3" />
                    {t.seats} seats · {floorName(t.floor_id)}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
              </div>

              <Select
                value={t.status}
                onChange={(e) => onStatusChange(t, e.target.value as TableStatus)}
                className="mb-3 h-8 text-xs"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
              </Select>

              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShowQr(t)}
                  disabled={qrLoadingId === t.id}
                  aria-label="QR code"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(t)} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(t)} aria-label="Delete">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}