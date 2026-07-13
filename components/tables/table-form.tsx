"use client"

import { useState, useEffect } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Alert } from "@/components/ui/alert"
import type { CafeTable, Floor, TableStatus } from "@/types/database"

interface TableFormValues {
  label: string
  seats: number
  floor_id?: string
  status?: TableStatus
}

interface TableFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: TableFormValues) => Promise<void>
  floors: Floor[]
  table?: CafeTable | null
}

export function TableForm({ open, onClose, onSubmit, floors, table }: TableFormProps) {
  const [label, setLabel] = useState("")
  const [seats, setSeats] = useState("2")
  const [floorId, setFloorId] = useState("")
  const [status, setStatus] = useState<TableStatus>("available")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLabel(table?.label ?? "")
    setSeats(table ? String(table.seats) : "2")
    setFloorId(table?.floor_id ?? "")
    setStatus(table?.status ?? "available")
    setError(null)
  }, [open, table])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!label.trim()) return setError("Table label is required")
    const seatsNum = Number(seats)
    if (!seats || Number.isNaN(seatsNum) || seatsNum <= 0) return setError("Enter a valid seat count")

    setIsSubmitting(true)
    try {
      const payload: TableFormValues = {
        label: label.trim(),
        seats: seatsNum,
        floor_id: floorId || undefined,
      }
      if (table) payload.status = status
      await onSubmit(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={table ? "Edit Table" : "Add Table"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Label</label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="T-12" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Seats</label>
            <Input type="number" min="1" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Floor</label>
            <Select value={floorId} onChange={(e) => setFloorId(e.target.value)}>
              <option value="">No floor</option>
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {table && (
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as TableStatus)}>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : table ? "Save changes" : "Add table"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}