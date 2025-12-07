/**
 * NotificationItem Component
 * Story 6.1: Notification System Foundation
 *
 * Displays a single notification with type-specific icon and styling.
 */

import { formatDistanceToNow } from "date-fns"
import { getNotificationIconConfig } from "@/lib/notificationIcons"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types/notification"

export interface NotificationItemProps {
  notification: Notification
  onClick?: (notification: Notification) => void
  showFullMessage?: boolean
  className?: string
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

/**
 * NotificationItem displays a single notification with icon, title, message, and timestamp.
 */
export function NotificationItem({
  notification,
  onClick,
  showFullMessage = false,
  className,
}: NotificationItemProps) {
  const iconConfig = getNotificationIconConfig(notification.type)
  const IconComponent = iconConfig.icon

  const handleClick = () => {
    onClick?.(notification)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick?.(notification)
    }
  }

  const relativeTime = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors",
        "hover:bg-accent focus:bg-accent focus:outline-none",
        notification.is_read ? "bg-background" : "bg-accent/50",
        className,
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          iconConfig.bgColor,
        )}
      >
        <IconComponent className={cn("w-5 h-5", iconConfig.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              "text-sm truncate",
              notification.is_read
                ? "font-normal text-muted-foreground"
                : "font-semibold text-foreground",
            )}
            title={notification.title}
          >
            {truncateText(notification.title, 50)}
          </h4>
          {/* Unread indicator */}
          {!notification.is_read && (
            <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary" />
          )}
        </div>
        <p
          className={cn(
            "text-sm text-muted-foreground mt-0.5",
            !showFullMessage && "line-clamp-2",
          )}
          title={notification.message}
        >
          {showFullMessage
            ? notification.message
            : truncateText(notification.message, 80)}
        </p>
        <span className="text-xs text-muted-foreground mt-1 block">
          {relativeTime}
        </span>
      </div>
    </div>
  )
}

export default NotificationItem
