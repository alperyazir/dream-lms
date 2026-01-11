/**
 * Content Review Component (Story 27.19)
 *
 * Displays generated AI content in editable form, allowing teachers to:
 * - Review and edit questions/items
 * - Delete individual questions
 * - Regenerate single questions or all content
 * - Save to library or create assignments
 */

import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export interface ContentReviewProps {
  activityType:
    | "ai_quiz"
    | "vocabulary_quiz"
    | "reading"
    | "matching"
    | "sentence_builder"
    | "word_builder"
  activityId: string
  activityData: any // Will be typed based on activity type
  onSave?: () => void
  onCancel?: () => void
}

export function ContentReview({
  activityType,
  activityId,
  activityData,
  onSave,
  onCancel,
}: ContentReviewProps) {
  const getActivityTypeName = () => {
    switch (activityType) {
      case "ai_quiz":
        return "Quiz"
      case "vocabulary_quiz":
        return "Vocabulary Quiz"
      case "reading":
        return "Reading Comprehension"
      case "matching":
        return "Vocabulary Matching"
      case "sentence_builder":
        return "Sentence Builder"
      case "word_builder":
        return "Word Builder"
      default:
        return "Content"
    }
  }

  const getItemCount = () => {
    if (activityType === "ai_quiz" || activityType === "vocabulary_quiz") {
      return activityData?.questions?.length || 0
    }
    if (activityType === "matching") {
      return activityData?.pairs?.length || 0
    }
    if (activityType === "sentence_builder") {
      return activityData?.sentences?.length || 0
    }
    if (activityType === "word_builder") {
      return activityData?.words?.length || 0
    }
    if (activityType === "reading") {
      return activityData?.questions?.length || 0
    }
    return 0
  }

  if (!activityData) {
    return <ContentReviewSkeleton />
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Generated Content</h1>
          <p className="text-muted-foreground mt-1">
            {getActivityTypeName()} • {getItemCount()} Items
          </p>
        </div>
      </div>

      {/* Content Area - Will be replaced with specific editors */}
      <Card>
        <CardHeader>
          <CardTitle>Content Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Content review editor for {getActivityTypeName()} will be
              implemented in the next steps.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

function ContentReviewSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
