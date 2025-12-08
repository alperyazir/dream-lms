/**
 * Test Mode Player - Story 9.7
 *
 * Full-screen player for testing an assignment without saving results.
 * Wraps MultiActivityPlayer with previewMode=true.
 */

import { useCallback, useState } from "react"
import type { ActivityProgressInfo, AssignmentPreviewResponse } from "@/types/assignment"
import {
  MultiActivityPlayer,
  type PreviewResults,
} from "../ActivityPlayers/MultiActivityPlayer"
import { TestModeResultsSummary } from "./TestModeResultsSummary"

interface TestModePlayerProps {
  assignment: AssignmentPreviewResponse
  onExit: () => void
  onRetry?: () => void
}

/**
 * Create empty progress info for preview mode
 */
function createEmptyProgress(
  activities: AssignmentPreviewResponse["activities"],
): ActivityProgressInfo[] {
  return activities.map((activity) => ({
    id: `preview-${activity.id}`,
    activity_id: activity.id,
    status: "not_started",
    score: null,
    max_score: 100,
    response_data: null,
    started_at: null,
    completed_at: null,
  }))
}

export function TestModePlayer({
  assignment,
  onExit,
  onRetry,
}: TestModePlayerProps) {
  const [showResults, setShowResults] = useState(false)
  const [previewResults, setPreviewResults] = useState<PreviewResults | null>(
    null,
  )

  const handlePreviewComplete = useCallback((results: PreviewResults) => {
    setPreviewResults(results)
    setShowResults(true)
  }, [])

  const handleCloseResults = useCallback(() => {
    setShowResults(false)
    onExit()
  }, [onExit])

  const handleRetry = useCallback(() => {
    setShowResults(false)
    setPreviewResults(null)
    onRetry?.()
  }, [onRetry])

  // Create empty progress for all activities
  const activityProgress = createEmptyProgress(assignment.activities)

  return (
    <>
      <MultiActivityPlayer
        assignmentId={`preview-${assignment.assignment_id}`}
        assignmentName={assignment.assignment_name}
        bookId={assignment.book_id}
        bookTitle={assignment.book_title}
        bookName={assignment.book_name}
        publisherName={assignment.publisher_name}
        activities={assignment.activities}
        activityProgress={activityProgress}
        timeLimit={assignment.time_limit_minutes}
        initialTimeSpent={0}
        onExit={onExit}
        previewMode={true}
        onPreviewComplete={handlePreviewComplete}
        videoPath={assignment.video_path}
      />

      <TestModeResultsSummary
        isOpen={showResults}
        onClose={handleCloseResults}
        results={previewResults}
        onRetry={onRetry ? handleRetry : undefined}
      />
    </>
  )
}
