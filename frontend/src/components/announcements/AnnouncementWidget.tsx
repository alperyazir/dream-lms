/**
 * Announcement Widget for Student Dashboard
 * Story 26.2: Student Announcement Display & Read Tracking
 *
 * Displays recent unread announcements on the student dashboard
 */

import { Bell, ChevronRight } from "lucide-react"
import { Link } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { StudentAnnouncement } from "@/types/announcement"
import { AnnouncementItem } from "./AnnouncementItem"

interface AnnouncementWidgetProps {
  announcements: StudentAnnouncement[]
  isLoading?: boolean
}

export function AnnouncementWidget({
  announcements,
  isLoading = false,
}: AnnouncementWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-teal-500" />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-teal-500" />
            Announcements
          </CardTitle>
          <Button variant="link" size="sm" asChild>
            <Link to="/student/announcements">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <AnnouncementItem
                key={announcement.id}
                announcement={announcement}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
      <p className="font-medium">No announcements yet!</p>
      <p className="text-sm mt-1">
        Your teachers will post important updates here.
      </p>
    </div>
  )
}
