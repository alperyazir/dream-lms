import { AlertCircle } from "lucide-react"
import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface ErrorPattern {
  activity_type: string
  error_description: string
  frequency: number
  student_ids: string[]
}

export interface ErrorPatternsCardProps {
  patterns: ErrorPattern[]
  onViewDetails?: (studentId: string) => void
}

/**
 * Error Patterns Display
 * Shows top 5 most common mistakes with activity type and error description
 */
export const ErrorPatternsCard = React.memo(
  ({ patterns, onViewDetails }: ErrorPatternsCardProps) => {
    // Activity type color mapping
    const getActivityTypeColor = (activityType: string): string => {
      const colorMap: Record<string, string> = {
        dragdroppicture:
          "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
        dragdroppicturegroup:
          "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
        matchTheWords:
          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        circle:
          "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
        markwithx: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        puzzleFindWords:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      }
      return (
        colorMap[activityType] ||
        "bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-gray-200"
      )
    }

    // Activity type display names
    const getActivityTypeName = (activityType: string): string => {
      const nameMap: Record<string, string> = {
        dragdroppicture: "Drag & Drop",
        dragdroppicturegroup: "Group Sort",
        matchTheWords: "Matching",
        circle: "Circle",
        markwithx: "Mark with X",
        puzzleFindWords: "Word Search",
      }
      return nameMap[activityType] || activityType
    }

    // Take top 5 patterns
    const topPatterns = patterns.slice(0, 5)

    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Common Mistakes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPatterns.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No error patterns detected
            </p>
          ) : (
            <div className="space-y-4">
              {topPatterns.map((pattern, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={getActivityTypeColor(
                            pattern.activity_type,
                          )}
                        >
                          {getActivityTypeName(pattern.activity_type)}
                        </Badge>
                        <span className="text-sm font-medium text-gray-500">
                          {pattern.frequency} occurrences
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {pattern.error_description}
                      </p>
                    </div>
                  </div>
                  {onViewDetails && pattern.student_ids.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-teal-600 hover:text-teal-700"
                      onClick={() => onViewDetails(pattern.student_ids[0])}
                    >
                      View Details →
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  },
)

ErrorPatternsCard.displayName = "ErrorPatternsCard"
