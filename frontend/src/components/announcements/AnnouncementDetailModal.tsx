/**
 * Announcement Detail Modal Component
 * Story 26.2: Student Announcement Display & Read Tracking
 *
 * Shows full announcement content and handles auto-mark-as-read
 */

import { formatDistanceToNow } from "date-fns"
import { useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useMarkAnnouncementAsRead } from "@/hooks/useAnnouncements"
import type { StudentAnnouncement } from "@/types/announcement"

interface AnnouncementDetailModalProps {
  announcement: StudentAnnouncement
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AnnouncementDetailModal({
  announcement,
  open,
  onOpenChange,
}: AnnouncementDetailModalProps) {
  const { mutate: markAsRead } = useMarkAnnouncementAsRead()

  // Auto-mark as read when opened
  useEffect(() => {
    if (open && !announcement.is_read) {
      markAsRead(announcement.id)
    }
  }, [open, announcement.id, announcement.is_read, markAsRead])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{announcement.title}</DialogTitle>
          <div className="text-sm text-muted-foreground pt-2">
            <p>From {announcement.teacher_name}</p>
            <p>
              {formatDistanceToNow(new Date(announcement.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
        </DialogHeader>

        <div
          className="prose prose-sm max-w-none py-4"
          dangerouslySetInnerHTML={{ __html: announcement.content }}
        />
      </DialogContent>
    </Dialog>
  )
}
