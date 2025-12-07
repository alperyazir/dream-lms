import { User } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  /** Avatar URL, can be null/undefined for default avatar */
  avatarUrl?: string | null | undefined
  /** User's full name for alt text */
  name?: string | null
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  /** Additional class names */
  className?: string
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-20 h-20",
}

const iconSizes = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
  xl: "w-10 h-10",
}

/**
 * Reusable avatar component that displays user's avatar or a default icon
 */
export function UserAvatar({
  avatarUrl,
  name,
  size = "md",
  className,
}: UserAvatarProps) {
  const displayName = name || "User"
  return (
    <div
      className={cn(
        "rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border flex-shrink-0",
        sizeClasses[size],
        className,
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${displayName}'s avatar`}
          className="w-full h-full object-cover"
        />
      ) : (
        <User className={cn("text-muted-foreground", iconSizes[size])} />
      )}
    </div>
  )
}

export default UserAvatar
