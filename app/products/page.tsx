"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, RefreshCw, Search } from "lucide-react"
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
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  toggleProductAvailability,
  updateProduct,
} from "@/lib/services/product.service"
import type { Product, ProductCategory } from "@/types/database"

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
      if (editingProduct) {
        await updateProduct(editingProduct.id, input)
        setSuccess("Product updated")
      } else {
        await createProduct(input)
        setSuccess("Product added")
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
    </AdminLayout>
  )
}
