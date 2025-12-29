/**
 * Announcement Item Component
 * Story 26.2: Student Announcement Display & Read Tracking
 *
 * Displays a single announcement in a list
 */

import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import type { StudentAnnouncement } from "@/types/announcement"
import { useState } from "react"
import { AnnouncementDetailModal } from "./AnnouncementDetailModal"

interface AnnouncementItemProps {
  announcement: StudentAnnouncement
}

export function AnnouncementItem({ announcement }: AnnouncementItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Get first 100 characters for snippet
  const snippet =
    announcement.content.replace(/<[^>]*>/g, "").substring(0, 100) + "..."

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4
                className={`text-sm font-medium truncate ${!announcement.is_read ? "font-bold" : ""}`}
              >
                {announcement.title}
              </h4>
              {!announcement.is_read && (
                <Badge variant="default" className="text-xs shrink-0">
                  New
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              From {announcement.teacher_name} •{" "}
              {formatDistanceToNow(new Date(announcement.created_at), {
                addSuffix: true,
              })}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {snippet}
            </p>
          </div>
        </div>
      </button>

      <AnnouncementDetailModal
        announcement={announcement}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  )
}
