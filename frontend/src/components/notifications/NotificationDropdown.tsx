/**
 * NotificationDropdown Component
 * Story 6.1: Notification System Foundation
 *
 * Displays the notification panel dropdown with recent notifications.
 */

import { Link, useNavigate } from "@tanstack/react-router"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotificationPanel } from "@/hooks/useNotifications"
import type { Notification } from "@/types/notification"
import { NotificationItem } from "./NotificationItem"

export interface NotificationDropdownProps {
  onClose?: () => void
}

/**
 * Loading skeleton for notification items
 */
function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="w-9 h-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

/**
 * Empty state when there are no notifications
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Bell className="w-6 h-6 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-medium text-foreground">No notifications</h4>
      <p className="text-xs text-muted-foreground mt-1">
        You're all caught up! Check back later for updates.
      </p>
    </div>
  )
}

/**
 * NotificationDropdown displays the recent notifications in a dropdown panel.
 */
export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    isLoading,
    onNotificationClick,
    onMarkAllRead,
    isMarkingAllRead,
  } = useNotificationPanel()

  const handleNotificationClick = async (notification: Notification) => {
    await onNotificationClick(notification)
    onClose?.()
    if (notification.link) {
      navigate({ to: notification.link })
    }
  }

  const handleViewAll = () => {
    onClose?.()
  }

  return (
    <div className="w-80 max-w-[calc(100vw-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({unreadCount} unread)
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onMarkAllRead}
            disabled={isMarkingAllRead}
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="divide-y">
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              asChild
              onClick={handleViewAll}
            >
              <Link to="/notifications">View all notifications</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationDropdown
