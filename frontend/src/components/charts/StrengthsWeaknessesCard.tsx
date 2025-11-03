import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react"

export interface StrengthsWeaknessesCardProps {
  strengths: string[]
  weaknesses: string[]
  recommendations?: string[]
}

/**
 * Strengths/Weaknesses Summary Card
 * Displays top 3 strengths and weaknesses with color-coded badges
 */
export const StrengthsWeaknessesCard = React.memo(
  ({
    strengths,
    weaknesses,
    recommendations,
  }: StrengthsWeaknessesCardProps) => {
    // Activity type display names
    const getActivityTypeName = (activityType: string): string => {
      const nameMap: Record<string, string> = {
        dragdroppicture: "Drag & Drop",
        dragdroppicturegroup: "Group Sorting",
        matchTheWords: "Word Matching",
        circle: "Circle Activities",
        markwithx: "Mark with X",
        puzzleFindWords: "Word Search Puzzles",
      }
      return nameMap[activityType] || activityType
    }

    // Default recommendations if none provided
    const defaultRecommendations = [
      weaknesses.length > 0
        ? `Focus on improving ${getActivityTypeName(weaknesses[0])} skills with additional practice`
        : "Continue maintaining excellent performance across all activities",
      strengths.length > 0
        ? `Leverage strength in ${getActivityTypeName(strengths[0])} to build confidence`
        : "Keep up the consistent effort in all subject areas",
      "Consider peer tutoring opportunities to reinforce learning",
    ]

    const displayRecommendations =
      recommendations || defaultRecommendations

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-green-700 dark:text-green-400">
              <TrendingUp className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strengths.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No strengths identified yet
              </p>
            ) : (
              <div className="space-y-3">
                {strengths.slice(0, 3).map((strength, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center font-bold text-green-700 dark:text-green-300">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {getActivityTypeName(strength)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weaknesses Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-orange-700 dark:text-orange-400">
              <TrendingDown className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weaknesses.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No areas needing improvement - excellent work!
              </p>
            ) : (
              <div className="space-y-3">
                {weaknesses.slice(0, 3).map((weakness, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center font-bold text-orange-700 dark:text-orange-300">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        {getActivityTypeName(weakness)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations Card (Full Width) */}
        <Card className="shadow-lg md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-teal-700 dark:text-teal-400">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {displayRecommendations.map((recommendation, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-sm font-bold text-teal-700 dark:text-teal-300">
                    {index + 1}
                  </div>
                  <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {recommendation}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  },
)

StrengthsWeaknessesCard.displayName = "StrengthsWeaknessesCard"
