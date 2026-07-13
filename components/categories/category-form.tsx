"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ProductCategory } from "@/types/database"

export interface CategoryFormInput {
  name: string
  icon?: string
  color?: string
  sort_order: number
}

interface CategoryFormProps {
  open: boolean
  category: ProductCategory | null
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (input: CategoryFormInput) => Promise<void>
}

export function CategoryForm({ open, category, isSubmitting, onClose, onSubmit }: CategoryFormProps) {
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("")
  const [color, setColor] = useState("#0f766e")
  const [sortOrder, setSortOrder] = useState("0")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setName(category?.name ?? "")
    setIcon(category?.icon ?? "")
    setColor(category?.color ?? "#0f766e")
    setSortOrder(String(category?.sort_order ?? 0))
  }, [category, open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError("Category name is required.")
      return
    }
    await onSubmit({
      name: name.trim(),
      icon: icon.trim() || undefined,
      color,
      sort_order: Number(sortOrder),
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title={category ? "Edit category" : "Add category"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <label className="space-y-1 text-sm font-medium text-charcoal">
          Name
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm font-medium text-charcoal">
            Color
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="p-1" />
          </label>
          <label className="space-y-1 text-sm font-medium text-charcoal">
            Icon
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="coffee" />
          </label>
          <label className="space-y-1 text-sm font-medium text-charcoal">
            Sort order
            <Input type="number" step="1" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
