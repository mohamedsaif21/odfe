import { createClient } from "@/lib/supabase/client"

const PRODUCT_IMAGE_BUCKET = "product-images"
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

export function validateProductImage(file: File) {
  if (!file || file.size === 0) {
    throw new Error("Image file is empty.")
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Unsupported image type. Upload a JPEG, PNG, or WEBP image.")
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image is too large. Maximum size is 2 MB.")
  }
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")

  return cleaned || "product-image"
}

function extractProductImagePath(imageUrl: string | null | undefined) {
  if (!imageUrl) return null

  try {
    const url = new URL(imageUrl)
    const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`
    const index = url.pathname.indexOf(marker)
    if (index === -1) return null

    const path = decodeURIComponent(url.pathname.slice(index + marker.length))
    if (!path || path.includes("..")) return null
    return path
  } catch {
    return null
  }
}

export async function uploadProductImage(input: {
  cafeId: string
  productId: string
  file: File
}) {
  validateProductImage(input.file)

  const supabase = createClient()
  const uniqueFileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(input.file.name)}`
  const path = `${input.cafeId}/products/${input.productId}/${uniqueFileName}`

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type,
    })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path)

  return {
    path,
    publicUrl: data.publicUrl,
  }
}

export async function deleteProductImage(imageUrl: string | null | undefined) {
  const path = extractProductImagePath(imageUrl)
  if (!path) return

  const supabase = createClient()
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path])

  if (error) {
    throw new Error(error.message)
  }
}
