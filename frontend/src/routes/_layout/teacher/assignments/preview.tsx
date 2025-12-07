/**
 * Assignment Preview Route - Story 9.7
 *
 * Standalone page for previewing an assignment before creation.
 * Receives activity data via sessionStorage.
 */

import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { MultiActivityPlayer } from "@/components/ActivityPlayers/MultiActivityPlayer"
import { Button } from "@/components/ui/button"
import { getBookActivities } from "@/services/booksApi"
import type { ActivityProgressInfo, ActivityWithConfig } from "@/types/assignment"
import type { Activity } from "@/types/book"

interface PreviewData {
  bookId: string
  bookTitle: string
  bookName: string
  publisherName: string
  activityIds: string[]
  assignmentName: string
  timeLimitMinutes: number | null
}

const PREVIEW_STORAGE_KEY = "assignment-preview-data"

export const Route = createFileRoute("/_layout/teacher/assignments/preview")({
  component: AssignmentPreviewPage,
})

function AssignmentPreviewPage() {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load preview data from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(PREVIEW_STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as PreviewData
        setPreviewData(data)
      } else {
        setError("No preview data found. Please start from the assignment creation dialog.")
      }
    } catch {
      setError("Failed to load preview data.")
    }
  }, [])

  // Fetch activities for the book
  const { data: allActivities, isLoading } = useQuery({
    queryKey: ["book-activities", previewData?.bookId],
    queryFn: () => getBookActivities(previewData!.bookId),
    enabled: !!previewData?.bookId,
  })

  // Filter to only selected activities and map to ActivityWithConfig format
  const selectedActivities: ActivityWithConfig[] = allActivities
    ? allActivities
        .filter((a: Activity) => previewData?.activityIds.includes(a.id))
        .sort((a: Activity, b: Activity) => {
          // Maintain selection order
          const indexA = previewData!.activityIds.indexOf(a.id)
          const indexB = previewData!.activityIds.indexOf(b.id)
          return indexA - indexB
        })
        .map((a: Activity): ActivityWithConfig => ({
          id: a.id,
          title: a.title,
          activity_type: a.activity_type,
          config_json: a.config_json,
          order_index: a.order_index,
        }))
    : []

  // Create empty progress for preview
  const activityProgress: ActivityProgressInfo[] = selectedActivities.map((activity) => ({
    id: `preview-${activity.id}`,
    activity_id: activity.id,
    status: "not_started" as const,
    score: null,
    max_score: 100,
    response_data: null,
    started_at: null,
    completed_at: null,
  }))

  const handleExit = () => {
    // Clear preview data and close tab
    sessionStorage.removeItem(PREVIEW_STORAGE_KEY)
    window.close()
  }

  const handleBackToCreation = () => {
    // Navigate back - since this is a new tab, just close it
    window.close()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={handleBackToCreation}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Close Tab
        </Button>
      </div>
    )
  }

  if (!previewData || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading preview...</p>
      </div>
    )
  }

  if (selectedActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">No activities found for preview.</p>
        <Button onClick={handleBackToCreation}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Close Tab
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <MultiActivityPlayer
        assignmentId="preview-draft"
        assignmentName={previewData.assignmentName || "Assignment Preview"}
        bookId={previewData.bookId}
        bookTitle={previewData.bookTitle}
        bookName={previewData.bookName}
        publisherName={previewData.publisherName}
        activities={selectedActivities}
        activityProgress={activityProgress}
        timeLimit={previewData.timeLimitMinutes}
        initialTimeSpent={0}
        onExit={handleExit}
        previewMode={true}
      />
    </div>
  )
}
