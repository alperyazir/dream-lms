/**
 * Content Library Page
 * Story 27.21: Content Library UI - Task 4
 *
 * Browse and manage saved AI-generated content for reuse.
 */

import { createFileRoute } from "@tanstack/react-router"
import {
  AlertCircle,
  FolderOpen,
  Grid3x3,
  List,
  Loader2,
  Sparkles,
} from "lucide-react"
import { useState } from "react"
import { AssignmentCreationDialog } from "@/components/assignments/AssignmentCreationDialog"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { ContentCard } from "@/components/DreamAI/ContentCard"
import { ContentPreviewModal } from "@/components/DreamAI/ContentPreviewModal"
import { ContentTable } from "@/components/DreamAI/ContentTable"
import { EditContentModal } from "@/components/DreamAI/EditContentModal"
import { GenerateContentDialog } from "@/components/DreamAI/GenerateContentDialog"
import { LibraryFilters } from "@/components/DreamAI/LibraryFilters"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Card } from "@/components/ui/card"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination"
import { useToast } from "@/hooks/use-toast"
import { useMyAIUsage } from "@/hooks/useAIUsage"
import { useContentLibrary, useDeleteContent } from "@/hooks/useContentLibrary"
import { useViewPreference } from "@/hooks/useViewPreference"
import type {
  ContentItem,
  LibraryFilters as Filters,
} from "@/types/content-library"

export const Route = createFileRoute("/_layout/dreamai/library")({
  component: ContentLibraryPage,
})

function ContentLibraryPage() {
  const { toast } = useToast()
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    page_size: 20,
  })
  const [viewMode, setViewMode] = useViewPreference("content-library", "grid")
  const [previewContent, setPreviewContent] = useState<ContentItem | null>(null)
  const [editContent, setEditContent] = useState<ContentItem | null>(null)
  const [assignmentContent, setAssignmentContent] =
    useState<ContentItem | null>(null)
  const [deleteContent, setDeleteContent] = useState<ContentItem | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)

  // AI Usage quota
  const { data: myUsage, isLoading: isLoadingUsage } = useMyAIUsage()

  // Fetch library data
  const { data, isLoading, error, refetch } = useContentLibrary(filters)

  // Delete mutation
  const deleteMutation = useDeleteContent()

  const handleDelete = async (content: ContentItem) => {
    try {
      await deleteMutation.mutateAsync(content.id)
      toast({
        title: "Content deleted",
        description: `"${content.title}" has been removed from your library.`,
      })
      setDeleteContent(null)
      refetch()
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          err.response?.data?.detail ||
          "Failed to delete content. Please try again.",
      })
    }
  }

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page })
  }

  return (
    <PageContainer>
      <PageHeader
        icon={Sparkles}
        title="Dream AI Generation"
        description="Generate and manage AI-powered learning activities"
      >
        <Button
          onClick={() => setShowGenerateDialog(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          AI Generation
        </Button>
      </PageHeader>

      {/* AI Usage Quota - Right after header */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border w-fit">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="text-sm text-muted-foreground">Monthly Quota:</span>
        {isLoadingUsage ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : myUsage ? (
          <span className="text-sm">
            <span className="font-semibold text-foreground">
              {myUsage.remaining_quota}
            </span>
            <span className="text-muted-foreground">
              {" "}
              / {myUsage.monthly_quota} remaining
            </span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">--</span>
        )}
      </div>

      {/* Content Library Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Content Library
          </h2>
          {/* View Mode Toggle */}
          <div className="flex gap-1 rounded-lg border p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <LibraryFilters filters={filters} onFiltersChange={setFilters} />

        {/* Results Count */}
        {data && (
          <p className="text-sm text-muted-foreground">
            Showing {data.items.length} of {data.total} items
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load content library. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && data && data.items.length === 0 && (
        <Card className="p-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No content found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {filters.type || filters.source_type || filters.book_id
              ? "Try adjusting your filters to see more results."
              : "Generate your first AI content to get started."}
          </p>
        </Card>
      )}

      {/* Content Grid/List */}
      {!isLoading && !error && data && data.items.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.items.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onPreview={(content) => setPreviewContent(content)}
                  onEdit={(content) => setEditContent(content)}
                  onUse={(content) => setAssignmentContent(content)}
                />
              ))}
            </div>
          ) : (
            <ContentTable
              items={data.items}
              onPreview={(content) => setPreviewContent(content)}
              onEdit={(content) => setEditContent(content)}
              onUse={(content) => setAssignmentContent(content)}
              onDelete={(content) => setDeleteContent(content)}
            />
          )}

          {/* Pagination */}
          {data.total > filters.page_size! && (
            <div className="flex justify-center">
              <PaginationRoot
                count={data.total}
                pageSize={filters.page_size}
                page={filters.page}
                onPageChange={handlePageChange}
              >
                <PaginationPrevTrigger />
                <PaginationItems />
                <PaginationNextTrigger />
              </PaginationRoot>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      <ContentPreviewModal
        open={!!previewContent}
        onOpenChange={(open) => !open && setPreviewContent(null)}
        content={previewContent}
        onUse={(content) => {
          setPreviewContent(null)
          setAssignmentContent(content)
        }}
        onDelete={(content) => {
          setPreviewContent(null)
          setDeleteContent(content)
        }}
      />

      {/* Edit Content Modal */}
      <EditContentModal
        open={!!editContent}
        onOpenChange={(open) => !open && setEditContent(null)}
        content={editContent}
        onSaved={() => refetch()}
      />

      {/* Create Assignment Dialog (with pre-selected AI content) */}
      <AssignmentCreationDialog
        isOpen={!!assignmentContent}
        onClose={() => setAssignmentContent(null)}
        preSelectedAIContent={assignmentContent}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteContent}
        onOpenChange={(open) => !open && setDeleteContent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteContent?.title}"?
              {deleteContent && deleteContent.used_in_assignments > 0 && (
                <span className="mt-2 block font-medium text-amber-600">
                  Warning: This content is used in{" "}
                  {deleteContent.used_in_assignments} assignment
                  {deleteContent.used_in_assignments > 1 ? "s" : ""}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContent && handleDelete(deleteContent)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Content Dialog */}
      <GenerateContentDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        onSaveSuccess={() => refetch()}
      />
    </PageContainer>
  )
}
