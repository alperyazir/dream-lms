/**
 * Student Announcements Page
 * Story 26.2: Student Announcement Display & Read Tracking
 *
 * Full page view of all announcements with filtering and pagination
 */

import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Bell } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStudentAnnouncements } from "@/hooks/useAnnouncements"
import { AnnouncementItem } from "@/components/announcements/AnnouncementItem"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_layout/student/announcements")({
  component: StudentAnnouncementsPage,
})

function StudentAnnouncementsPage() {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading } = useStudentAnnouncements({
    filter,
    limit,
    offset: (page - 1) * limit,
  })

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div className="container py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Bell className="h-8 w-8 text-teal-500" />
        <h1 className="text-3xl font-bold">Announcements</h1>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => {
        setFilter(v as "all" | "unread" | "read")
        setPage(1) // Reset to first page when filter changes
      }}>
        <TabsList>
          <TabsTrigger value="all">
            All {data && `(${data.total})`}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread {data && `(${data.unread_count})`}
          </TabsTrigger>
          <TabsTrigger value="read">
            Read {data && `(${data.total - data.unread_count})`}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Announcement list */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-muted rounded-md" />
                </div>
              ))}
            </div>
          ) : !data || data.announcements.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="space-y-3">
              {data.announcements.map((announcement) => (
                <AnnouncementItem
                  key={announcement.id}
                  announcement={announcement}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ filter }: { filter: string }) {
  const messages = {
    all: "No announcements yet!",
    unread: "No unread announcements!",
    read: "No read announcements yet!",
  }

  const descriptions = {
    all: "Your teachers will post important updates here.",
    unread: "You're all caught up!",
    read: "Start reading announcements to see them here.",
  }

  return (
    <div className="text-center py-12 text-muted-foreground">
      <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
      <p className="font-medium text-lg">{messages[filter as keyof typeof messages]}</p>
      <p className="text-sm mt-2">{descriptions[filter as keyof typeof descriptions]}</p>
    </div>
  )
}
