const FALLBACK_PRODUCT_IMAGE =
  "/assets/products/fallback/product-placeholder.webp"

export function getProductImageUrl(imageUrl?: string | null): string {
  const value = imageUrl?.trim()

  if (!value) {
    return FALLBACK_PRODUCT_IMAGE
  }

  if (
    value.startsWith("/") ||
    value.startsWith("https://") ||
    value.startsWith("http://")
  ) {
    return value
  }

  return FALLBACK_PRODUCT_IMAGE
}