"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, RefreshCw } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { CategoryForm, type CategoryFormInput } from "@/components/categories/category-form"
import { CategoryList } from "@/components/categories/category-list"
import { createCategory, deleteCategory, fetchCategories, updateCategory } from "@/lib/services/category.service"
import type { ProductCategory } from "@/types/database"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setCategories(await fetchCategories())
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

  async function handleSubmit(input: CategoryFormInput) {
    setIsSubmitting(true)
    setError(null)
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, input)
        setSuccess("Category updated")
      } else {
        await createCategory(input)
        setSuccess("Category added")
      }
      setFormOpen(false)
      setEditingCategory(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingCategory) return
    setIsSubmitting(true)
    setError(null)
    try {
      await deleteCategory(deletingCategory.id)
      setSuccess("Category hidden")
      setDeletingCategory(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminLayout title="Categories">
      <PageContainer>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader title="Categories" description="Organise menu items into sections" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button onClick={() => { setEditingCategory(null); setFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </div>

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        {isLoading ? (
          <div className="rounded-xl border border-dashed border-cream-200 bg-card/50 p-12 text-center">
            <p className="text-sm text-muted-foreground">Loading categories...</p>
          </div>
        ) : (
          <CategoryList
            categories={categories}
            onEdit={(category) => { setEditingCategory(category); setFormOpen(true) }}
            onDelete={setDeletingCategory}
          />
        )}
      </PageContainer>

      <CategoryForm
        open={formOpen}
        category={editingCategory}
        isSubmitting={isSubmitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={!!deletingCategory}
        title="Hide category"
        description={`This sets "${deletingCategory?.name}" as inactive. Product dropdowns refresh after the update.`}
        confirmLabel="Hide"
        isLoading={isSubmitting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingCategory(null)}
      />
    </AdminLayout>
  )
}
