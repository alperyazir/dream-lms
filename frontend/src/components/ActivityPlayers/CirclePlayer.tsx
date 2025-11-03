/**
 * CirclePlayer - Select correct items by clicking (circle/markwithx)
 * Story 2.5 - Phase 4, Tasks 4.1-4.4
 * Handles both "circle" and "markwithx" activity types
 */

import { useState } from "react"
import type { CircleActivity } from "@/lib/mockData"

interface CirclePlayerProps {
  activity: CircleActivity
  onAnswersChange: (answers: Set<string>) => void
  showResults?: boolean
  correctAnswers?: Set<string>
  initialAnswers?: Set<string>
}

export function CirclePlayer({
  activity,
  onAnswersChange,
  showResults = false,
  correctAnswers,
  initialAnswers,
}: CirclePlayerProps) {
  const [selections, setSelections] = useState<Set<string>>(
    initialAnswers || new Set(),
  )

  const icon = activity.type === "markwithx" ? "✗" : "✓"
  const maxSelections = activity.circleCount

  // Get coord key for tracking
  const getCoordKey = (coords: { x: number; y: number }): string => {
    return `${coords.x}-${coords.y}`
  }

  // Handle area click
  const handleAreaClick = (coordKey: string) => {
    if (showResults) return

    const newSelections = new Set(selections)

    if (newSelections.has(coordKey)) {
      // Deselect
      newSelections.delete(coordKey)
    } else {
      // Select
      if (newSelections.size >= maxSelections) {
        // Remove oldest selection (first item)
        const firstItem = Array.from(newSelections)[0]
        newSelections.delete(firstItem)
      }
      newSelections.add(coordKey)
    }

    setSelections(newSelections)
    onAnswersChange(newSelections)
  }

  // Check if area is correct (for results view)
  const isCorrect = (coordKey: string): boolean => {
    if (!showResults || !correctAnswers) return false
    return correctAnswers.has(coordKey)
  }

  return (
    <div className="flex h-full flex-col p-4">
      {/* Instructions */}
      <div className="mb-4">
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          {activity.type === "markwithx"
            ? "Mark the incorrect items"
            : "Select the correct items"}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select up to {maxSelections} item{maxSelections > 1 ? "s" : ""}
        </p>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Selected: {selections.size} / {maxSelections}
        </div>
      </div>

      {/* Background Image with Selectable Areas */}
      <div className="relative flex-1 overflow-auto rounded-lg bg-gray-100 dark:bg-gray-800">
        <img
          src={activity.section_path}
          alt="Activity background"
          className="h-full w-full object-contain"
        />

        {/* Selectable Areas Overlay */}
        {activity.answer.map((answer, index) => {
          const coordKey = getCoordKey(answer.coords)
          const isSelected = selections.has(coordKey)
          const correct = isCorrect(coordKey)
          const wasSelected = selections.has(coordKey)

          return (
            <button
              type="button"
              key={index}
              onClick={() => handleAreaClick(coordKey)}
              className={`
                absolute flex items-center justify-center rounded-md border-2 transition-all duration-200
                ${
                  showResults
                    ? wasSelected
                      ? correct
                        ? "border-green-500 bg-green-100/80 dark:bg-green-900/50"
                        : "border-red-500 bg-red-100/80 dark:bg-red-900/50"
                      : !correct
                        ? "border-gray-300 bg-white/20 dark:border-gray-600"
                        : "border-orange-500 bg-orange-100/80 dark:bg-orange-900/50"
                    : isSelected
                      ? activity.type === "markwithx"
                        ? "cursor-pointer border-red-500 bg-red-100/80 hover:bg-red-200/80 dark:bg-red-900/50"
                        : "cursor-pointer border-blue-500 bg-blue-100/80 hover:bg-blue-200/80 dark:bg-blue-900/50"
                      : "cursor-pointer border-gray-400 border-dashed bg-white/20 hover:border-gray-500 hover:bg-white/40 dark:border-gray-500 dark:hover:bg-gray-700/30"
                }
              `}
              style={{
                left: `${answer.coords.x}px`,
                top: `${answer.coords.y}px`,
                width: `${answer.coords.w}px`,
                height: `${answer.coords.h}px`,
              }}
              aria-pressed={isSelected}
              tabIndex={!showResults ? 0 : -1}
              aria-label={`Selectable area ${index + 1}${isSelected ? ` (selected with ${icon})` : ""}`}
              disabled={showResults}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-full text-xl font-bold shadow-lg
                    ${
                      activity.type === "markwithx"
                        ? "bg-red-500 text-white"
                        : "bg-blue-500 text-white"
                    }
                  `}
                >
                  {icon}
                </div>
              )}

              {/* Results indicator */}
              {showResults && (
                <div
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-full text-xl font-bold shadow-lg
                    ${
                      wasSelected
                        ? correct
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                        : correct
                          ? "bg-orange-500 text-white"
                          : ""
                    }
                  `}
                >
                  {wasSelected ? (correct ? "✓" : "✗") : correct ? "!" : ""}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Results Legend */}
      {showResults && (
        <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Legend:
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                ✓
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                Correctly selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white">
                ✗
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                Incorrectly selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
                !
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                Missed (should have been selected)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
