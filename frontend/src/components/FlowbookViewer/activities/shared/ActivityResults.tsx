import { Check, RotateCcw, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivityResultsProps {
  score: number
  total: number
  onRetry: () => void
  onClose?: () => void
}

export function ActivityResults({
  score,
  total,
  onRetry,
  onClose,
}: ActivityResultsProps) {
  const percentage = Math.round((score / total) * 100)
  const isPerfect = score === total
  const isGood = percentage >= 70

  return (
    <div className="rounded-lg bg-white p-6 text-center shadow-lg">
      {/* Score Icon */}
      <div
        className={cn(
          "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full",
          isPerfect && "bg-yellow-100",
          !isPerfect && isGood && "bg-green-100",
          !isGood && "bg-orange-100",
        )}
      >
        {isPerfect ? (
          <Trophy className="h-10 w-10 animate-bounce text-yellow-600" />
        ) : isGood ? (
          <Check className="h-10 w-10 text-green-600" />
        ) : (
          <span className="text-3xl">🤔</span>
        )}
      </div>

      {/* Score Text */}
      <h3 className="mb-2 text-2xl font-bold">
        {isPerfect ? "Perfect!" : isGood ? "Great job!" : "Keep practicing!"}
      </h3>

      <p className="mb-1 text-4xl font-bold text-slate-800">
        {score} / {total}
      </p>
      <p className="mb-6 text-lg text-slate-500">{percentage}% correct</p>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <button
          onClick={onRetry}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Try Again
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  )
}
