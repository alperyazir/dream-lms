import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResultIndicatorProps {
  isCorrect: boolean
  size?: "sm" | "md" | "lg"
  showAnimation?: boolean
}

export function ResultIndicator({
  isCorrect,
  size = "md",
  showAnimation = true,
}: ResultIndicatorProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        isCorrect ? "bg-green-500" : "bg-red-500",
        sizeClasses[size],
        showAnimation && "animate-scale-in",
      )}
    >
      {isCorrect ? (
        <Check className={cn("text-white", iconSizeClasses[size])} />
      ) : (
        <X className={cn("text-white", iconSizeClasses[size])} />
      )}
    </span>
  )
}
