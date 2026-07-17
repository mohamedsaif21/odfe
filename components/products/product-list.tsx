"use client"

import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProductImage } from "@/components/products/product-image"
import type { Product, ProductCategory } from "@/types/database"

interface ProductListProps {
  products: Product[]
  categories: ProductCategory[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onToggleAvailability: (product: Product) => void
}

export function ProductList({ products, categories, onEdit, onDelete, onToggleAvailability }: ProductListProps) {
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? "Unassigned"

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-cream-200 bg-card/50 p-12 text-center">
        <p className="text-sm text-muted-foreground">No products found.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <div key={product.id} className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <div className="flex h-36 items-center justify-center bg-cream/50">
            <ProductImage src={product.image_url} alt={product.name} />
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-charcoal">{product.name}</h3>
                <p className="text-xs text-charcoal/50">{categoryName(product.category_id)}</p>
              </div>
              <Badge variant={product.is_available ? "success" : "danger"}>
                {product.is_available ? "available" : "hidden"}
              </Badge>
            </div>
            {product.description && <p className="line-clamp-2 text-sm text-charcoal/65">{product.description}</p>}
            <div className="grid grid-cols-4 gap-2 text-xs text-charcoal/60">
              <span>Rs {product.price}</span>
              <span>Tax {product.tax_rate}%</span>
              <span>Disc {product.discount}%</span>
              <span>#{product.sort_order}</span>
            </div>
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => onToggleAvailability(product)} aria-label="Toggle availability">
                {product.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(product)} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(product)} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
