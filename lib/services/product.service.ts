/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "./_shared"
import type { Product } from "@/types/database"

export type ProductInsert = {
  category_id: string
  name: string
  description: string | null
  price: number
  tax_rate: number
  discount: number
  image_url: string | null
  is_available: boolean
  sort_order: number
}

export async function fetchProducts(): Promise<Product[]> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("products")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("sort_order")
  if (error) throw new Error(error.message)
  return data as Product[]
}

export async function createProduct(input: ProductInsert): Promise<Product> {
  const supabase = createClient()
  const cafeId = await getCafeId()
  const { data, error } = await (supabase as any)
    .from("products")
    .insert([{ ...input, cafe_id: cafeId }])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Product
}

export async function updateProduct(id: string, input: Partial<ProductInsert>): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("products")
    .update(input)
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from("products")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
}

/**
 * Upload product image to Supabase Storage bucket "product-images".
 * Returns the public URL to store in products.image_url.
 */
export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${productId}.${ext}`

  const { error } = await (supabase as any).storage
    .from("product-images")
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = (supabase as any).storage
    .from("product-images")
    .getPublicUrl(path)

  return data.publicUrl as string
}