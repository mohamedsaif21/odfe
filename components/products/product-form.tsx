"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ProductImage } from "@/components/products/product-image"
import { validateProductImage } from "@/lib/services/product-image.service"
import type { Product, ProductCategory } from "@/types/database"

export interface ProductFormInput {
  category_id: string
  name: string
  description?: string
  price: number
  tax_rate: number
  discount: number
  imageFile?: File | null
  removeImage?: boolean
  sort_order: number
  is_available?: boolean
}

interface ProductFormProps {
  open: boolean
  product: Product | null
  categories: ProductCategory[]
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (input: ProductFormInput) => Promise<void>
}

const emptyForm = {
  category_id: "",
  name: "",
  description: "",
  price: "0",
  tax_rate: "0",
  discount: "0",
  sort_order: "0",
  is_available: true,
}

export function ProductForm({ open, product, categories, isSubmitting, onClose, onSubmit }: ProductFormProps) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setImageFile(null)
    setImagePreviewUrl(null)
    setRemoveImage(false)
    setForm(
      product
        ? {
            category_id: product.category_id,
            name: product.name,
            description: product.description ?? "",
            price: String(product.price),
            tax_rate: String(product.tax_rate),
            discount: String(product.discount),
            sort_order: String(product.sort_order),
            is_available: product.is_available,
          }
        : { ...emptyForm, category_id: categories[0]?.id ?? "" },
    )
  }, [categories, open, product])

  useEffect(() => {
    if (!imageFile) return
    const objectUrl = URL.createObjectURL(imageFile)
    setImagePreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.category_id) {
      setError("Select a category before saving.")
      return
    }
    if (!form.name.trim()) {
      setError("Product name is required.")
      return
    }

    await onSubmit({
      category_id: form.category_id,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      tax_rate: Number(form.tax_rate),
      discount: Number(form.discount),
      imageFile,
      removeImage,
      sort_order: Number(form.sort_order),
      is_available: form.is_available,
    })
  }

  function handleImageSelection(file: File | null) {
    setError(null)
    try {
      if (!file) {
        setImageFile(null)
        return
      }
      validateProductImage(file)
      setRemoveImage(false)
      setImageFile(file)
    } catch (err) {
      setImageFile(null)
      setError(err instanceof Error ? err.message : "Image validation failed")
    }
  }

  const currentImageUrl = removeImage ? null : product?.image_url ?? null

  return (
    <Dialog open={open} onClose={onClose} title={product ? "Edit product" : "Add product"} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-charcoal">
            Name
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium text-charcoal">
            Category
            <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm font-medium text-charcoal">
            Price
            <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium text-charcoal">
            Tax rate %
            <Input type="number" min="0" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium text-charcoal">
            Discount %
            <Input type="number" min="0" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium text-charcoal">
            Sort order
            <Input type="number" step="1" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </label>
        </div>
        <div className="space-y-3 rounded-md border border-cream-200 p-3">
          <p className="text-sm font-medium text-charcoal">Product image</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="overflow-hidden rounded-md bg-cream/50">
              <ProductImage
                src={currentImageUrl}
                alt={product?.name ?? "Current product"}
                className="h-32 w-full object-cover"
              />
              <p className="px-2 py-1 text-xs text-muted-foreground">Current image</p>
            </div>
            <div className="overflow-hidden rounded-md bg-cream/50">
              {imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreviewUrl} alt="New product preview" className="h-32 w-full object-cover" />
              ) : (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">New image preview</div>
              )}
              <p className="px-2 py-1 text-xs text-muted-foreground">{imageFile ? imageFile.name : "No new image selected"}</p>
            </div>
          </div>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleImageSelection(e.target.files?.[0] ?? null)}
            disabled={isSubmitting}
          />
          {product?.image_url && (
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={removeImage}
                onChange={(e) => {
                  setRemoveImage(e.target.checked)
                  if (e.target.checked) setImageFile(null)
                }}
              />
              Remove current image
            </label>
          )}
        </div>
        <label className="space-y-1 text-sm font-medium text-charcoal">
          Description
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm text-charcoal">
          <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
          Available
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || categories.length === 0}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
