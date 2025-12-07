/**
 * Notifications Page
 * Story 6.1: Notification System Foundation
 *
 * Full page view of all notifications with filtering capabilities.
 */

import { createFileRoute } from "@tanstack/react-router"
import { Bell, CheckCheck, Filter } from "lucide-react"
import { useState } from "react"
import { NotificationItem } from "@/components/notifications"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/useNotifications"
import type { Notification, NotificationType } from "@/types/notification"

export const Route = createFileRoute("/_layout/notifications")({
  component: NotificationsPage,
})

/**
 * Notification type options for filtering
 */
const NOTIFICATION_TYPE_OPTIONS: {
  value: NotificationType | "all"
  label: string
}[] = [
  { value: "all", label: "All Types" },
  { value: "assignment_created", label: "New Assignments" },
  { value: "deadline_approaching", label: "Deadlines" },
  { value: "feedback_received", label: "Feedback" },
  { value: "message_received", label: "Messages" },
  { value: "student_completed", label: "Completions" },
  { value: "past_due", label: "Past Due" },
  { value: "material_shared", label: "Materials" },
  { value: "system_announcement", label: "Announcements" },
]

/**
 * Loading skeleton for notification list
 */
function NotificationListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 p-4 border rounded-lg">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state component
 */
function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Bell className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {filtered ? "No matching notifications" : "No notifications"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {filtered
          ? "Try adjusting your filters to see more notifications."
          : "You're all caught up! Check back later for updates."}
      </p>
    </div>
  )
}

function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all")
  const [page, setPage] = useState(0)
  const pageSize = 20

  // Build query params
  const queryParams = {
    unread_only: filter === "unread",
    type: typeFilter === "all" ? undefined : typeFilter,
    limit: pageSize,
    offset: page * pageSize,
  }

  const { notifications, total, hasMore, isLoading, isFetching } =
    useNotifications(queryParams, { refetchInterval: false })
  const { count: unreadCount } = useUnreadCount({ refetchInterval: false })
  const { markAsRead } = useMarkAsRead()
  const { markAllAsRead, isMarking: isMarkingAllRead } = useMarkAllAsRead()

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      window.location.href = notification.link
    }
  }

  const handleFilterChange = (newFilter: "all" | "unread") => {
    setFilter(newFilter)
    setPage(0)
  }

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value as NotificationType | "all")
    setPage(0)
  }

  const isFiltered = filter !== "all" || typeFilter !== "all"

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} notification{total !== 1 ? "s" : ""}
            {unreadCount > 0 && ` (${unreadCount} unread)`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllRead}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Read/Unread filter */}
            <Tabs
              value={filter}
              onValueChange={(v) => handleFilterChange(v as "all" | "unread")}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread
                  {unreadCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Type filter */}
            <div className="flex items-center gap-2 sm:ml-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <NotificationListSkeleton />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState filtered={isFiltered} />
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={handleNotificationClick}
                  showFullMessage
                  className="rounded-none border-0"
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {(hasMore || page > 0) && (
            <div className="flex items-center justify-between p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isFetching}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || isFetching}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default NotificationsPage
