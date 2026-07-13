"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ProductCategory } from "@/types/database"

interface CategoryListProps {
  categories: ProductCategory[]
  onEdit: (category: ProductCategory) => void
  onDelete: (category: ProductCategory) => void
}

export function CategoryList({ categories, onEdit, onDelete }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-cream-200 bg-card/50 p-12 text-center">
        <p className="text-sm text-muted-foreground">No categories yet. Add your first category to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <div key={category.id} className="rounded-lg border border-cream-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold text-white"
                style={{ backgroundColor: category.color ?? "#0f766e" }}
              >
                {category.icon || category.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h3 className="font-semibold text-charcoal">{category.name}</h3>
                <p className="text-xs text-charcoal/50">Sort #{category.sort_order}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEdit(category)} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(category)} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
