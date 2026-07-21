"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Search, X, Package, AlertTriangle, Save } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import {
  fetchRecipes, fetchRecipeIngredients, setRecipeIngredients,
  fetchAllInventoryItems,
  type RecipeIngredientRow,
} from "@/lib/services/recipe.service"
import type { InventoryItem } from "@/types/database"

export default function RecipesPage() {
  const [products, setProducts] = useState<Awaited<ReturnType<typeof fetchRecipes>>>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [editingProduct, setEditingProduct] = useState<{ id: string; name: string } | null>(null)
  const [ingredients, setIngredients] = useState<RecipeIngredientRow[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [editIngredients, setEditIngredients] = useState<Array<{ item_id: string; quantity: number }>>([])
  const [inventorySearch, setInventorySearch] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProducts(await fetchRecipes())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recipes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(t)
  }, [success])

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  async function handleEdit(product: { id: string; name: string }) {
    setEditingProduct(product)
    setInventorySearch("")
    setError(null)
    try {
      const [existing, items] = await Promise.all([
        fetchRecipeIngredients(product.id),
        fetchAllInventoryItems(),
      ])
      setIngredients(existing)
      setInventoryItems(items)
      setEditIngredients(existing.map((i) => ({ item_id: i.item_id, quantity: i.quantity })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recipe data")
    }
  }

  function toggleIngredient(item: InventoryItem) {
    setEditIngredients((prev) => {
      const exists = prev.find((i) => i.item_id === item.id)
      if (exists) return prev.filter((i) => i.item_id !== item.id)
      return [...prev, { item_id: item.id, quantity: 1 }]
    })
  }

  function updateQty(itemId: string, quantity: number) {
    setEditIngredients((prev) =>
      prev.map((i) => (i.item_id === itemId ? { ...i, quantity: Math.max(0, quantity) } : i))
    )
  }

  async function handleSave() {
    if (!editingProduct) return
    setSaving(true)
    setError(null)
    try {
      await setRecipeIngredients(
        editingProduct.id,
        editIngredients.filter((i) => i.quantity > 0)
      )
      setSuccess(`Recipe saved for ${editingProduct.name}`)
      setEditingProduct(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe")
    } finally {
      setSaving(false)
    }
  }

  const filteredInventory = useMemo(() => {
    if (!inventorySearch.trim()) return inventoryItems
    const q = inventorySearch.toLowerCase()
    return inventoryItems.filter((i) => i.name.toLowerCase().includes(q))
  }, [inventoryItems, inventorySearch])

  const inputClass = "w-full rounded-lg border border-odfe-charcoal/10 px-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"

  return (
    <AdminLayout title="Recipes">
      <PageContainer>
        <PageHeader title="Recipes" description="Define which inventory items each product consumes" />

        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-odfe-charcoal/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className={`${inputClass} pl-9`}
            />
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            <div className="col-span-full flex h-32 items-center justify-center text-sm text-odfe-charcoal/40">
              Loading products...
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full flex h-32 items-center justify-center text-sm text-odfe-charcoal/40">
              No products found. Create products first.
            </div>
          ) : (
            filtered.map((product) => (
              <div
                key={product.id}
                className="group relative rounded-xl border border-odfe-charcoal/10 bg-white p-4 transition hover:border-odfe-teal/30 hover:shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-odfe-charcoal">{product.name}</h3>
                    <p className="text-xs text-odfe-charcoal/40">
                      {product.ingredientCount} ingredient{product.ingredientCount !== 1 ? "s" : ""}
                      {!product.is_available && " · Unavailable"}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-odfe-teal/10">
                    <Package size={16} className="text-odfe-teal" />
                  </div>
                </div>
                {product.ingredientCount === 0 && (
                  <p className="mb-2 flex items-center gap-1 text-[10px] text-amber-600">
                    <AlertTriangle size={10} /> No recipe defined
                  </p>
                )}
                <button
                  onClick={() => handleEdit({ id: product.id, name: product.name })}
                  className="w-full rounded-lg border border-odfe-charcoal/10 px-3 py-2 text-xs font-medium text-odfe-teal transition hover:bg-odfe-teal/5"
                >
                  {product.ingredientCount > 0 ? "Edit Recipe" : "Add Recipe"}
                </button>
              </div>
            ))
          )}
        </div>
      </PageContainer>

      {/* Recipe Editor Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-odfe-charcoal/10 px-5 py-4 shrink-0">
              <div>
                <h2 className="font-semibold text-odfe-charcoal">{editingProduct.name}</h2>
                <p className="text-xs text-odfe-charcoal/40">Select inventory items and set quantities</p>
              </div>
              <button type="button" onClick={() => setEditingProduct(null)}>
                <X size={18} className="text-odfe-charcoal/40" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {/* Search inventory */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-3 h-4 w-4 text-odfe-charcoal/40" />
                <input
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder="Search inventory items..."
                  className="w-full rounded-lg border border-odfe-charcoal/10 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-odfe-teal focus:ring-1 focus:ring-odfe-teal"
                />
              </div>

              {/* Selected ingredients summary */}
              {editIngredients.filter((i) => i.quantity > 0).length > 0 && (
                <div className="mb-3 space-y-1">
                  <p className="text-xs font-medium text-odfe-charcoal/60">Selected Ingredients</p>
                  {editIngredients.filter((i) => i.quantity > 0).map((ei) => {
                    const item = inventoryItems.find((inv) => inv.id === ei.item_id)
                    return (
                      <div key={ei.item_id} className="flex items-center gap-2 rounded-lg bg-odfe-teal/5 px-3 py-1.5 text-sm">
                        <span className="flex-1 font-medium text-odfe-charcoal">{item?.name ?? "Unknown"}</span>
                        <span className="text-xs text-odfe-charcoal/40">{Number(item?.stock ?? 0).toFixed(1)} in stock</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={ei.quantity}
                          onChange={(e) => updateQty(ei.item_id, Number(e.target.value))}
                          className="w-20 rounded border border-odfe-charcoal/10 px-2 py-1 text-right text-sm outline-none focus:border-odfe-teal"
                        />
                        <span className="w-10 text-xs text-odfe-charcoal/40">{item?.unit ?? "piece"}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Inventory items list */}
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {filteredInventory.length === 0 ? (
                  <p className="py-6 text-center text-sm text-odfe-charcoal/40">No inventory items found. Add items in Inventory first.</p>
                ) : (
                  filteredInventory.map((item) => {
                    const selected = editIngredients.find((i) => i.item_id === item.id)
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition ${
                          selected ? "border-odfe-teal/30 bg-odfe-teal/5" : "border-odfe-charcoal/10"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleIngredient(item)}
                          className="h-4 w-4 rounded border-odfe-charcoal/20 text-odfe-teal"
                        />
                        <span className="flex-1 text-sm font-medium text-odfe-charcoal">{item.name}</span>
                        <span className="text-xs text-odfe-charcoal/40">{Number(item.stock).toFixed(1)} {item.unit}</span>
                        {selected && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={selected.quantity}
                              onChange={(e) => updateQty(item.id, Number(e.target.value))}
                              className="w-20 rounded border border-odfe-charcoal/10 px-2 py-1 text-right text-sm outline-none focus:border-odfe-teal"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-odfe-charcoal/10 px-5 py-4 shrink-0">
              <p className="text-xs text-odfe-charcoal/40">
                {editIngredients.filter((i) => i.quantity > 0).length} ingredient{editIngredients.filter((i) => i.quantity > 0).length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="rounded-lg border border-odfe-charcoal/10 px-4 py-2.5 text-sm text-odfe-charcoal/60 hover:bg-odfe-charcoal/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-odfe-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-odfe-teal-light disabled:opacity-50"
                >
                  <Save size={15} />
                  {saving ? "Saving..." : "Save Recipe"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
