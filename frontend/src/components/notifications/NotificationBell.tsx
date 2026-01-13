/**
 * NotificationBell Component
 * Story 6.1: Notification System Foundation
 *
 * Displays a bell icon with unread count badge and notification dropdown.
 */

import { Bell } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useUnreadCount } from "@/hooks/useNotifications"
import { cn } from "@/lib/utils"
import { NotificationDropdown } from "./NotificationDropdown"

export interface NotificationBellProps {
  className?: string
  size?: "default" | "sm"
}

/**
 * Format the unread count for display (99+ if over 99)
 */
function formatCount(count: number): string {
  if (count > 99) return "99+"
  return count.toString()
}

/**
 * NotificationBell displays a bell icon with unread count badge.
 * Clicking opens a popover with the notification dropdown.
 */
export function NotificationBell({
  className,
  size = "default",
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { count: unreadCount } = useUnreadCount()

  const isSmall = size === "sm"
  const iconSize = isSmall ? 18 : 20
  const buttonClasses = isSmall ? "h-9 w-9" : "h-10 w-10"
  const badgeClasses = isSmall
    ? "h-4 w-4 text-[10px] -top-0.5 -right-0.5"
    : "h-5 w-5 text-xs -top-1 -right-1"

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unreadCount > 0
              ? `Notifications (${unreadCount} unread)`
              : "Notifications"
          }
          className={cn("relative rounded-full hover:bg-accent/80 active:scale-95 transition-all", buttonClasses, className)}
        >
          <Bell style={{ width: iconSize, height: iconSize }} />
          {unreadCount > 0 && (
            <span className={cn("absolute flex items-center justify-center", isSmall ? "top-0.5 right-0.5" : "top-1 right-1")}>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span
                className={cn(
                  "relative flex items-center justify-center rounded-full bg-red-500 font-bold text-white",
                  isSmall ? "h-3.5 w-3.5 text-[9px]" : "h-4 w-4 text-[10px]",
                )}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0" sideOffset={8}>
        <NotificationDropdown onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

export default NotificationBell
