import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { OdfeLogo } from "./odfe-logo"

type BrandedLoaderProps = {
  message?: string
  fullScreen?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function BrandedLoader({
  message = "Loading...",
  fullScreen = false,
  size = "md",
  className,
}: BrandedLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center",
        fullScreen ? "min-h-screen bg-odfe-cream p-6" : "py-10",
        className,
      )}
    >
      <OdfeLogo variant={fullScreen ? "full" : "icon"} size={size} priority={fullScreen} />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-odfe-teal" />
        <span>{message}</span>
      </div>
    </div>
  )
}
