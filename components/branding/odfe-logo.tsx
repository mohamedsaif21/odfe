import { cn } from "@/lib/utils"

type OdfeLogoProps = {
  variant?: "full" | "icon"
  size?: "sm" | "md" | "lg"
  className?: string
  priority?: boolean
  alt?: string
}

const sizeClasses = {
  icon: {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  },
  full: {
    sm: "h-auto w-20 max-w-full",
    md: "h-auto w-40 max-w-full",
    lg: "h-auto w-56 max-w-full",
  },
}

export function OdfeLogo({
  variant = "full",
  size = "md",
  className,
  priority,
  alt = "OdFe",
}: OdfeLogoProps) {
  const src = variant === "icon"
    ? "/assets/logo/odfe-icon.png"
    : "/assets/logo/odfe-logo.png"

  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt === "" ? "true" : undefined}
      draggable={false}
      loading={priority ? "eager" : "lazy"}
      className={cn("object-contain", sizeClasses[variant][size], className)}
    />
  )
}
