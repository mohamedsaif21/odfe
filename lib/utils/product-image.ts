export const FALLBACK_PRODUCT_IMAGE =
  "/assets/products/fallback/product-placeholder.webp"

export function getProductImageUrl(imageUrl?: string | null): string {
  const value = imageUrl?.trim()

  if (!value) {
    return FALLBACK_PRODUCT_IMAGE
  }

  if (value.startsWith("/")) {
    return value
  }

  if (value.startsWith("https://") || value.startsWith("http://")) {
    try {
      return new URL(value).toString()
    } catch {
      return FALLBACK_PRODUCT_IMAGE
    }
  }

  return FALLBACK_PRODUCT_IMAGE
}

export function isSupabaseProductImage(imageUrl?: string | null): boolean {
  return Boolean(
    imageUrl &&
      imageUrl.includes("/storage/v1/object/public/product-images/"),
  )
}
