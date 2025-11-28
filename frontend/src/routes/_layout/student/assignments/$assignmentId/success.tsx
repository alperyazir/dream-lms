/**
 * Assignment Success Screen
 * Story 4.7: Assignment Submission & Result Storage
 *
 * Displays success message with confetti animation after assignment submission
 */

import { useEffect, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import Confetti from "react-confetti"
import { useWindowSize } from "@/hooks/useWindowSize"

export const Route = createFileRoute(
  "/_layout/student/assignments/$assignmentId/success",
)({
  component: AssignmentSuccessScreen,
  validateSearch: (search: Record<string, unknown>) => ({
    score: (search.score as number) ?? 0,
    completedAt: (search.completedAt as string) ?? new Date().toISOString(),
  }),
})

function AssignmentSuccessScreen() {
  const { assignmentId } = Route.useParams()
  const navigate = useNavigate()
  const { score, completedAt } = Route.useSearch()
  const { width, height } = useWindowSize()
  const [showConfetti, setShowConfetti] = useState(true)

  // Stop confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // Score color and message based on performance
  const getScoreStyle = (score: number) => {
    if (score >= 90)
      return { color: "text-green-600 dark:text-green-400", message: "Excellent!" }
    if (score >= 70)
      return { color: "text-blue-600 dark:text-blue-400", message: "Good Job!" }
    if (score >= 50)
      return {
        color: "text-yellow-600 dark:text-yellow-400",
        message: "Keep Practicing!",
      }
    return { color: "text-red-600 dark:text-red-400", message: "Nice Try!" }
  }

  const scoreStyle = getScoreStyle(score)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {showConfetti && <Confetti width={width} height={height} recycle={false} />}

      <div className="mx-4 max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-800">
        {/* Success Icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="h-12 w-12 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Assignment Completed!
        </h1>

        {/* Score Display */}
        <div className="my-6">
          <p className="mb-2 text-lg text-gray-600 dark:text-gray-300">Your Score:</p>
          <p className={`text-6xl font-bold ${scoreStyle.color}`}>{score}%</p>
          <p className={`mt-2 text-xl font-semibold ${scoreStyle.color}`}>
            {scoreStyle.message}
          </p>
        </div>

        {/* Completion Time */}
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          Completed on {new Date(completedAt).toLocaleString()}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/student/assignments/$assignmentId/play",
                params: { assignmentId },
                search: { results: true },
              })
            }
            className="rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
          >
            View Results
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/student/assignments" })}
            className="rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
