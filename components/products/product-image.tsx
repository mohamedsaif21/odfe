"use client"

import { useEffect, useState } from "react"
import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import {
  FALLBACK_PRODUCT_IMAGE,
  getProductImageUrl,
} from "@/lib/utils/product-image"

interface ProductImageProps {
  src?: string | null
  alt: string
  className?: string
}

export function ProductImage({ src, alt, className }: ProductImageProps) {
  const [currentSrc, setCurrentSrc] = useState(() => getProductImageUrl(src))
  const [fallbackFailed, setFallbackFailed] = useState(false)

  useEffect(() => {
    setCurrentSrc(getProductImageUrl(src))
    setFallbackFailed(false)
  }, [src])

  if (fallbackFailed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-cream/50 text-charcoal/25",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <ImageIcon className="h-8 w-8" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (currentSrc !== FALLBACK_PRODUCT_IMAGE) {
          setCurrentSrc(FALLBACK_PRODUCT_IMAGE)
          return
        }

        setFallbackFailed(true)
      }}
      className={cn("h-full w-full object-cover", className)}
    />
  )
}
