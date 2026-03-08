/**
 * Recipient Item Component
 * Story 20.8: Messaging Recipient Enhancements
 *
 * Displays individual recipients with role icons and organization info.
 */

import { Building2, Check, GraduationCap, Shield, User } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Recipient } from "@/types/message"

export interface RecipientItemProps {
  recipient: Recipient
  selected?: boolean
  onClick?: () => void
}

/**
 * Recipient Item
 * Displays a recipient with role icon, name, and organization/email.
 */
export function RecipientItem({
  recipient,
  selected,
  onClick,
}: RecipientItemProps) {
  const getRoleIcon = () => {
    switch (recipient.role) {
      case "publisher":
        return <Building2 className="h-4 w-4 text-purple-500" />
      case "teacher":
        return <GraduationCap className="h-4 w-4 text-blue-500" />
      case "student":
        return <User className="h-4 w-4 text-green-500" />
      case "admin":
        return <Shield className="h-4 w-4 text-orange-500" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors",
        selected
          ? "bg-primary/10 border border-primary"
          : "hover:bg-muted border border-transparent",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <Avatar className="h-7 w-7">
        <AvatarFallback className="bg-teal-600 text-white text-xs">
          {getInitials(recipient.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 flex items-center gap-2">
        {getRoleIcon()}
        <span className="text-sm font-medium truncate">{recipient.name}</span>
        {recipient.role === "publisher" && recipient.organization_name ? (
          <span className="text-xs text-muted-foreground truncate">
            {recipient.organization_name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground truncate">
            {recipient.email}
          </span>
        )}
      </div>

      {selected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
    </div>
  )
}
