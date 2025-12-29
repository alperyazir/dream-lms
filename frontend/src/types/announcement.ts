/**
 * Announcement TypeScript types - Story 26.1
 */

export interface Announcement {
  id: string
  teacher_id: string
  title: string
  content: string
  recipient_count: number
  read_count: number | null
  created_at: string
  updated_at: string
}

export interface AnnouncementDetail extends Announcement {
  recipient_ids: string[]
}

export interface AnnouncementCreate {
  title: string
  content: string
  recipient_student_ids?: string[]
  recipient_classroom_ids?: string[]
}

export interface AnnouncementUpdate {
  title?: string
  content?: string
  recipient_student_ids?: string[]
  recipient_classroom_ids?: string[]
}

export interface AnnouncementListResponse {
  announcements: Announcement[]
  total: number
  limit: number
  offset: number
}

// Student-facing types (Story 26.2)

export interface StudentAnnouncement {
  id: string
  teacher_id: string
  teacher_name: string
  title: string
  content: string
  created_at: string
  is_read: boolean
  read_at: string | null
}

export interface StudentAnnouncementListResponse {
  announcements: StudentAnnouncement[]
  total: number
  unread_count: number
  limit: number
  offset: number
}

export interface AnnouncementReadResponse {
  announcement_id: string
  is_read: boolean
  read_at: string
}
