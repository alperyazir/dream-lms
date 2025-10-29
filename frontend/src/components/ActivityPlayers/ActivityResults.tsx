/**
 * Activity Results - Score display and review interface
 * Story 2.5 - Phase 1, Task 1.4
 */

import { Button } from "@/components/ui/button"

export interface ScoreResult {
  score: number // 0-100 percentage
  correct: number
  total: number
  breakdown?: Record<string, unknown>
}

interface ActivityResultsProps {
  scoreResult: ScoreResult
  onReviewAnswers: () => void
  onExit: () => void
}

export function ActivityResults({
  scoreResult,
  onReviewAnswers,
  onExit,
}: ActivityResultsProps) {
  const { score, correct, total } = scoreResult

  // Determine score color and message
  const getScoreColor = () => {
    if (score >= 90) return "text-green-600 dark:text-green-400"
    if (score >= 70) return "text-teal-600 dark:text-teal-400"
    if (score >= 50) return "text-orange-600 dark:text-orange-400"
    return "text-red-600 dark:text-red-400"
  }

  const getScoreMessage = () => {
    if (score >= 90) return "Excellent Work!"
    if (score >= 70) return "Great Job!"
    if (score >= 50) return "Good Effort!"
    return "Keep Practicing!"
  }

  // Calculate circle progress for animation
  const circumference = 2 * Math.PI * 90 // radius = 90
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-neuro dark:bg-gray-800">
        {/* Score Circle */}
        <div className="mx-auto mb-6 flex h-64 w-64 items-center justify-center">
          <div className="relative">
            <svg className="h-64 w-64 -rotate-90 transform">
              {/* Background circle */}
              <circle
                cx="128"
                cy="128"
                r="90"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="128"
                cy="128"
                r="90"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`${getScoreColor()} transition-all duration-1000 ease-out`}
              />
            </svg>
            {/* Score text in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-5xl font-bold ${getScoreColor()}`}
                role="status"
                aria-label={`Your score is ${score} percent`}
              >
                {score}%
              </span>
              <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {correct} / {total} correct
              </span>
            </div>
          </div>
        </div>

        {/* Score message */}
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-white">
          {getScoreMessage()}
        </h2>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={onReviewAnswers}
            variant="outline"
            className="flex-1 shadow-neuro-sm hover:shadow-neuro"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            Review Answers
          </Button>
          <Button
            onClick={onExit}
            className="flex-1 bg-teal-600 shadow-neuro hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Exit to Assignments
          </Button>
        </div>

        {/* Performance breakdown (optional) */}
        {scoreResult.breakdown && (
          <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Performance Details
            </h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {Object.entries(scoreResult.breakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
