import { useState } from "react"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface PublisherLogoProps {
  publisherId: string | number
  size?: "sm" | "md" | "lg"
  className?: string
  alt?: string
}

const sizeMap = {
  sm: { container: "w-8 h-8", icon: "w-4 h-4" },
  md: { container: "w-12 h-12", icon: "w-6 h-6" },
  lg: { container: "w-16 h-16", icon: "w-8 h-8" },
}

export function PublisherLogo({
  publisherId,
  size = "md",
  className,
  alt = "Publisher logo",
}: PublisherLogoProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  )
  const sizes = sizeMap[size]
  const logoUrl = `/api/v1/publishers/${publisherId}/logo`

  if (status === "error") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-muted",
          sizes.container,
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <Building2 className={cn("text-muted-foreground", sizes.icon)} />
      </div>
    )
  }

  return (
    <div className={cn("relative", sizes.container, className)}>
      {status === "loading" && (
        <Skeleton
          className={cn("absolute inset-0 rounded-md", sizes.container)}
        />
      )}
      <img
        src={logoUrl}
        alt={alt}
        className={cn(
          "rounded-md object-contain",
          sizes.container,
          status === "loading" && "invisible",
        )}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </div>
  )
}
