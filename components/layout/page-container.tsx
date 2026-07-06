import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

/**
 * Standard content area wrapper.
 * Handles scroll, max-width, and consistent padding for all admin pages.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main
      className={cn(
        "flex-1 overflow-y-auto bg-background",
        "px-6 py-6",
        className
      )}
    >
      {children}
    </main>
  )
}

/** Page-level heading with optional description */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}