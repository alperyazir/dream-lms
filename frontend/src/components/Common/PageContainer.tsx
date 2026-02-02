import type { LucideIcon } from "lucide-react"
import type { IconType } from "react-icons/lib"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /**
   * Max width variant:
   * - "full" (default): Takes full available width
   * - "narrow": Max 4xl (896px) - good for forms, settings
   * - "medium": Max 6xl (1152px) - good for detail pages
   */
  maxWidth?: "full" | "narrow" | "medium"
}

/**
 * Consistent page container wrapper for all pages.
 * Provides standardized padding and spacing across the app.
 */
export function PageContainer({
  children,
  className,
  maxWidth = "full",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full p-6 space-y-6",
        maxWidth === "narrow" && "max-w-4xl",
        maxWidth === "medium" && "max-w-6xl",
        className,
      )}
    >
      {children}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  /** Icon to display before the title */
  icon?: IconType | LucideIcon
  /** Additional CSS classes */
  className?: string
}

/**
 * Consistent page header with title and optional description.
 * Can include action buttons as children.
 */
export function PageHeader({
  title,
  description,
  children,
  icon: Icon,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          {Icon && <Icon className="h-8 w-8 text-primary" />}
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
