/**
 * Teacher Announcements Page
 * Story 26.1: Teacher Announcement Creation & Management
 */

import { createFileRoute } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react"
import { useState } from "react"
import { AnnouncementCreationWizard } from "@/components/announcements/AnnouncementCreationWizard"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useAnnouncementDetail,
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from "@/hooks/useAnnouncements"
import type { Announcement } from "@/types/announcement"

export const Route = createFileRoute("/_layout/teacher/announcements")({
  component: AnnouncementsPage,
})

const ITEMS_PER_PAGE = 5

function AnnouncementsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  const { data: announcementsData, isLoading } = useAnnouncements()
  const createMutation = useCreateAnnouncement()
  const updateMutation = useUpdateAnnouncement()
  const deleteMutation = useDeleteAnnouncement()

  // Fetch details for editing announcement (to get recipients)
  const { data: announcementDetail } = useAnnouncementDetail(
    editingAnnouncement?.id || "",
    { enabled: !!editingAnnouncement && isEditOpen },
  )

  const handleCreate = async (data: {
    title: string
    content: string
    recipient_classroom_ids: string[]
    recipient_student_ids: string[]
  }) => {
    await createMutation.mutateAsync(data)
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setIsEditOpen(true)
  }

  const handleUpdate = async (data: {
    title: string
    content: string
    recipient_classroom_ids: string[]
    recipient_student_ids: string[]
  }) => {
    if (editingAnnouncement) {
      await updateMutation.mutateAsync({
        announcementId: editingAnnouncement.id,
        data: {
          title: data.title,
          content: data.content,
          recipient_classroom_ids: data.recipient_classroom_ids,
          recipient_student_ids: data.recipient_student_ids,
        },
      })
      setIsEditOpen(false)
      setEditingAnnouncement(null)
    }
  }

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Pagination calculations
  const totalAnnouncements = announcementsData?.announcements.length || 0
  const totalPages = Math.ceil(totalAnnouncements / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedAnnouncements =
    announcementsData?.announcements.slice(startIndex, endIndex) || []

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">
            Send announcements to your students
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {/* Announcement Creation Wizard */}
      <AnnouncementCreationWizard
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />

      {/* Announcement Edit Wizard */}
      {editingAnnouncement && announcementDetail && (
        <AnnouncementCreationWizard
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open)
            if (!open) setEditingAnnouncement(null)
          }}
          onSubmit={handleUpdate}
          isSubmitting={updateMutation.isPending}
          initialData={{
            title: editingAnnouncement.title,
            content: editingAnnouncement.content,
            recipientStudentIds: announcementDetail.recipient_ids,
          }}
          isEditMode
        />
      )}

      {/* Announcements List */}
      {isLoading ? (
        <div className="text-center py-8">Loading announcements...</div>
      ) : announcementsData?.announcements.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No announcements yet. Create your first one!
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedAnnouncements.map((announcement) => {
              const isExpanded = expandedIds.has(announcement.id)

              return (
                <Card key={announcement.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {announcement.title}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {announcement.recipient_count} recipients
                          </span>
                          <span>
                            {formatDistanceToNow(
                              new Date(announcement.created_at),
                              {
                                addSuffix: true,
                              },
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(announcement)}
                          title="Edit announcement"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(announcement.id)}
                          title="Delete announcement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div
                      className={`prose prose-sm max-w-none ${
                        !isExpanded
                          ? "line-clamp-3 max-h-[4.5rem] overflow-hidden"
                          : ""
                      }`}
                      dangerouslySetInnerHTML={{ __html: announcement.content }}
                    />
                    {/* Show expand/collapse button if content is likely long */}
                    {announcement.content.length > 200 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleExpanded(announcement.id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Show more
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-
                {Math.min(endIndex, totalAnnouncements)} of {totalAnnouncements}{" "}
                announcements
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </Button>
                    ),
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
