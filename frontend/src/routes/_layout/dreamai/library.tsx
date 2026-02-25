/**
 * Content Library Page — Book-Centric
 *
 * Teacher selects a book from a horizontal scroller,
 * then sees all AI content for that book from DCS (any teacher).
 */

import { createFileRoute } from "@tanstack/react-router"
import {
  AlertCircle,
  BookOpen,
  FolderOpen,
  Grid3x3,
  List,
  Loader2,
  Sparkles,
} from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { AssignmentWizardSheet } from "@/components/assignments/AssignmentWizardSheet"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { ContentCard } from "@/components/DreamAI/ContentCard"
import { ContentPreviewModal } from "@/components/DreamAI/ContentPreviewModal"
import { EditContentModal } from "@/components/DreamAI/EditContentModal"
import { ContentTable } from "@/components/DreamAI/ContentTable"
import { GenerateContentDialog } from "@/components/DreamAI/GenerateContentDialog"
import { BookSelector } from "@/components/DreamAI/BookSelector"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useMyAIUsage } from "@/hooks/useAIUsage"
import { useBookContent, useDeleteBookContent } from "@/hooks/useContentLibrary"
import { useViewPreference } from "@/hooks/useViewPreference"
import { ACTIVITY_TYPE_CONFIG } from "@/lib/activityTypeConfig"
import type { BookContentFilters } from "@/services/contentLibraryApi"
import type { ContentItem, BookContentItem } from "@/types/content-library"

export const Route = createFileRoute("/_layout/dreamai/library")({
  component: ContentLibraryPage,
})

/** AI activity types for the filter dropdown */
const AI_ACTIVITY_TYPES = Object.entries(ACTIVITY_TYPE_CONFIG)
  .filter(([, config]) => config.isAI)
  .map(([key, config]) => ({ value: key, label: config.label }))

/** Adapt BookContentItem to ContentItem so existing ContentCard/ContentTable work */
function toContentItem(item: BookContentItem): ContentItem {
  return {
    id: item.content_id,
    activity_type: item.activity_type,
    title: item.title,
    source_type: "book",
    book_id: item.book_id,
    book_title: null,
    material_id: null,
    material_name: null,
    item_count: item.item_count,
    created_at: "",
    updated_at: null,
    used_in_assignments: 0,
    is_shared: true,
    created_by: {
      id: item.created_by_id || "",
      name: item.created_by_name || "Unknown",
    },
  }
}

function ContentLibraryPage() {
  const { toast } = useToast()

  // Book selection
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null)

  // Filters & view
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [viewMode, setViewMode] = useViewPreference("content-library", "grid")

  // Modals
  const [previewContent, setPreviewContent] = useState<ContentItem | null>(null)
  const [editContent, setEditContent] = useState<ContentItem | null>(null)
  const [deleteContent, setDeleteContent] = useState<ContentItem | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)

  // Wizard sheet state
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [wizardContentId, setWizardContentId] = useState<string | null>(null)

  const openWizardWithContent = (contentId: string) => {
    setWizardContentId(contentId)
    setIsWizardOpen(true)
  }

  // AI Usage quota
  const { data: myUsage, isLoading: isLoadingUsage } = useMyAIUsage()

  // Build filters for book content query
  const bookFilters: BookContentFilters = useMemo(
    () => ({
      activity_type: activityTypeFilter !== "all" ? activityTypeFilter : undefined,
      page,
      page_size: pageSize,
    }),
    [activityTypeFilter, page],
  )

  // Fetch book content from DCS
  const { data, isLoading, error } = useBookContent(selectedBookId, bookFilters)

  // Delete mutation
  const deleteMutation = useDeleteBookContent(selectedBookId)

  // Adapted items for existing components
  const contentItems: ContentItem[] = useMemo(
    () => (data?.items || []).map(toContentItem),
    [data?.items],
  )

  const handleBookSelect = useCallback((bookId: number | null) => {
    setSelectedBookId(bookId)
    setPage(1)
    setActivityTypeFilter("all")
  }, [])

  const handleDelete = async (content: ContentItem) => {
    try {
      await deleteMutation.mutateAsync(content.id)
      toast({
        title: "Content deleted",
        description: `"${content.title}" has been removed.`,
      })
      setDeleteContent(null)
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

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
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

      {/* AI Usage Quota */}
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

      {/* Book Selector */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Select a Book
        </h2>
        <BookSelector
          selectedBookId={selectedBookId}
          onBookSelect={handleBookSelect}
        />
      </div>

      {/* No book selected */}
      {!selectedBookId && (
        <Card className="p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">
            Select a book to view its AI content
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a book above to browse all AI-generated content for that
            book.
          </p>
        </Card>
      )}

      {/* Book selected — content browser */}
      {selectedBookId && (
        <>
          {/* Toolbar: activity type filter + view toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Select
                value={activityTypeFilter}
                onValueChange={(value) => {
                  setActivityTypeFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All activity types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All activity types</SelectItem>
                  {AI_ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Results Count */}
              {data && (
                <p className="text-sm text-muted-foreground">
                  {data.total} item{data.total !== 1 ? "s" : ""}
                </p>
              )}
            </div>

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

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load content. Please try again.
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
                {activityTypeFilter !== "all"
                  ? "Try selecting a different activity type."
                  : "No AI content has been generated for this book yet."}
              </p>
            </Card>
          )}

          {/* Content Grid/Table */}
          {!isLoading && !error && contentItems.length > 0 && (
            <>
              {viewMode === "grid" ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {contentItems.map((content) => (
                    <ContentCard
                      key={content.id}
                      content={content}
                      onPreview={(c) => setPreviewContent(c)}
                      onEdit={(c) => setEditContent(c)}
                      onUse={(c) => openWizardWithContent(c.id)}
                    />
                  ))}
                </div>
              ) : (
                <ContentTable
                  items={contentItems}
                  onEdit={(c) => setEditContent(c)}
                  onUse={(c) => openWizardWithContent(c.id)}
                  onDelete={(c) => setDeleteContent(c)}
                />
              )}

              {/* Pagination */}
              {data && data.total > pageSize && (
                <div className="flex justify-center">
                  <PaginationRoot
                    count={data.total}
                    pageSize={pageSize}
                    page={page}
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
        </>
      )}

      {/* Preview Modal */}
      <ContentPreviewModal
        open={!!previewContent}
        onOpenChange={(open) => !open && setPreviewContent(null)}
        content={previewContent}
        onUse={(content) => {
          setPreviewContent(null)
          openWizardWithContent(content.id)
        }}
        onDelete={(content) => {
          setPreviewContent(null)
          setDeleteContent(content)
        }}
      />

      {/* Edit Content Sheet */}
      <EditContentModal
        open={!!editContent}
        onOpenChange={(open) => !open && setEditContent(null)}
        content={editContent}
        bookId={selectedBookId}
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
              Are you sure you want to delete &quot;{deleteContent?.title}&quot;?
              This will remove it from DCS permanently.
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

      {/* Assignment Wizard Sheet */}
      <AssignmentWizardSheet
        open={isWizardOpen}
        onOpenChange={(open) => {
          setIsWizardOpen(open)
          if (!open) setWizardContentId(null)
        }}
        mode="create"
        preSelectedContentId={wizardContentId}
      />

      {/* Generate Content Dialog */}
      <GenerateContentDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        onSaveSuccess={() => {
          // Refresh current book content if a book is selected
          if (selectedBookId) {
            // Query invalidation handled by the mutation
          }
        }}
      />
    </PageContainer>
  )
}
