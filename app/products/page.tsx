"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, RefreshCw, Search, X } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Alert } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ProductForm, type ProductFormInput } from "@/components/products/product-form"
import { ProductList } from "@/components/products/product-list"
import { fetchCategories } from "@/lib/services/category.service"
import { getCafeId } from "@/lib/services/_shared"
import { deleteProductImage, uploadProductImage } from "@/lib/services/product-image.service"
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  toggleProductAvailability,
  updateProduct,
} from "@/lib/services/product.service"
import { fetchInventoryItems, getProductIngredients, setProductIngredients } from "@/lib/services/inventory.service"
import type { Product, ProductCategory, InventoryItem } from "@/types/database"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{ item_id: string; quantity: number }>>([])
  const [recipeLoading, setRecipeLoading] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [productRows, categoryRows] = await Promise.all([fetchProducts(), fetchCategories()])
      setProducts(productRows)
      setCategories(categoryRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!success) return
    const timeout = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(timeout)
  }, [success])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchesSearch = !query || product.name.toLowerCase().includes(query)
      const matchesCategory = !categoryFilter || product.category_id === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, products, search])

  async function handleSubmit(input: ProductFormInput) {
    setIsSubmitting(true)
    setError(null)
    try {
      const productPayload = {
        category_id: input.category_id,
        name: input.name,
        description: input.description,
        price: input.price,
        tax_rate: input.tax_rate,
        discount: input.discount,
        sort_order: input.sort_order,
        is_available: input.is_available,
      }

      if (editingProduct) {
        const cafeId = await getCafeId()
        let uploadedImageUrl: string | null = null
        try {
          if (input.imageFile) {
            const uploaded = await uploadProductImage({
              cafeId,
              productId: editingProduct.id,
              file: input.imageFile,
            })
            uploadedImageUrl = uploaded.publicUrl
          }

          const nextImageUrl = input.removeImage
            ? null
            : uploadedImageUrl ?? editingProduct.image_url

          await updateProduct(editingProduct.id, {
            ...productPayload,
            image_url: nextImageUrl,
          })

          if ((input.removeImage || uploadedImageUrl) && editingProduct.image_url) {
            await deleteProductImage(editingProduct.image_url)
          }
        } catch (err) {
          if (uploadedImageUrl) {
            await deleteProductImage(uploadedImageUrl).catch((cleanupError) => {
              if (process.env.NODE_ENV === "development") {
                console.error("Failed to clean up orphan product image:", cleanupError)
              }
            })
          }
          throw err
        }
        setSuccess("Product updated")
      } else {
        const created = await createProduct({ ...productPayload, image_url: null })
        if (input.imageFile) {
          const cafeId = await getCafeId()
          const uploaded = await uploadProductImage({
            cafeId,
            productId: created.id,
            file: input.imageFile,
          })
          await updateProduct(created.id, { image_url: uploaded.publicUrl }).catch(async (err) => {
            await deleteProductImage(uploaded.publicUrl).catch((cleanupError) => {
              if (process.env.NODE_ENV === "development") {
                console.error("Failed to clean up orphan product image:", cleanupError)
              }
            })
            throw err
          })
        }
        setSuccess(input.imageFile ? "Product added" : "Product added without image")
      }
      setFormOpen(false)
      setEditingProduct(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingProduct) return
    setIsSubmitting(true)
    setError(null)
    try {
      await deleteProduct(deletingProduct.id)
      setSuccess("Product hidden")
      setDeletingProduct(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleOpenRecipe(product: Product) {
    setRecipeProduct(product)
    setRecipeLoading(true)
    try {
      const [items, ingredients] = await Promise.all([
        fetchInventoryItems(),
        getProductIngredients(product.id),
      ])
      setInventoryItems(items)
      setRecipeIngredients(ingredients.map((i) => ({ item_id: i.item_id, quantity: i.quantity })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recipe")
    } finally {
      setRecipeLoading(false)
    }
  }

  async function handleSaveRecipe() {
    if (!recipeProduct) return
    setIsSubmitting(true)
    setError(null)
    try {
      await setProductIngredients(
        recipeProduct.id,
        recipeIngredients.filter((i) => i.quantity > 0)
      )
      setSuccess("Recipe saved")
      setRecipeProduct(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe")
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleRecipeIngredient(item: InventoryItem) {
    setRecipeIngredients((prev) => {
      const exists = prev.find((i) => i.item_id === item.id)
      if (exists) {
        return prev.filter((i) => i.item_id !== item.id)
      }
      return [...prev, { item_id: item.id, quantity: 1 }]
    })
  }

  function updateRecipeQty(itemId: string, quantity: number) {
    setRecipeIngredients((prev) =>
      prev.map((i) => (i.item_id === itemId ? { ...i, quantity: Math.max(0, quantity) } : i))
    )
  }

  async function handleToggle(product: Product) {
    setError(null)
    try {
      await toggleProductAvailability(product.id, !product.is_available)
      setSuccess(product.is_available ? "Product hidden" : "Product available")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    }
  }

  return (
    <AdminLayout title="Products">
      <PageContainer>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader title="Products" description="Manage your cafe menu items" />
          <Button onClick={() => { setEditingProduct(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-charcoal/40" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="pl-9" />
          </div>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="lg:w-64">
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        {isLoading ? (
          <div className="rounded-xl border border-dashed border-cream-200 bg-card/50 p-12 text-center">
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </div>
        ) : (
          <ProductList
            products={filteredProducts}
            categories={categories}
            onEdit={(product) => { setEditingProduct(product); setFormOpen(true) }}
            onDelete={setDeletingProduct}
            onToggleAvailability={handleToggle}
            onRecipe={handleOpenRecipe}
          />
        )}
      </PageContainer>

      <ProductForm
        open={formOpen}
        product={editingProduct}
        categories={categories}
        isSubmitting={isSubmitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={!!deletingProduct}
        title="Hide product"
        description={`This sets "${deletingProduct?.name}" as unavailable. It will stay in history but disappear from active selling views.`}
        confirmLabel="Hide"
        isLoading={isSubmitting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingProduct(null)}
      />

      {/* Recipe Modal */}
      {recipeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
              <h2 className="font-semibold">{recipeProduct.name} — Recipe</h2>
              <button type="button" onClick={() => setRecipeProduct(null)}>
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-1">
              {recipeLoading ? (
                <p className="text-center text-sm text-gray-400 py-6">Loading inventory...</p>
              ) : inventoryItems.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">No inventory items found. <button onClick={() => setRecipeProduct(null)} className="text-odfe-teal underline">Add items first</button></p>
              ) : (
                inventoryItems.filter((i) => i.is_active).map((item) => {
                  const selected = recipeIngredients.find((r) => r.item_id === item.id)
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-cream-100 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => toggleRecipeIngredient(item)}
                        className="h-4 w-4 rounded border-gray-300 text-odfe-teal"
                      />
                      <span className="flex-1 text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-gray-400 w-12 text-right">{Number(item.stock).toFixed(1)} in stock</span>
                      {selected && (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={selected.quantity}
                          onChange={(e) => updateRecipeQty(item.id, Number(e.target.value))}
                          className="w-20 rounded border border-gray-200 px-2 py-1 text-right text-sm"
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>
            <div className="border-t px-5 py-4 flex gap-3 shrink-0">
              <button onClick={handleSaveRecipe} disabled={isSubmitting}
                className="flex-1 rounded-lg bg-odfe-teal py-2.5 text-sm font-semibold text-white hover:bg-odfe-teal-light disabled:opacity-50">
                {isSubmitting ? "Saving..." : "Save Recipe"}
              </button>
              <button onClick={() => setRecipeProduct(null)}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
