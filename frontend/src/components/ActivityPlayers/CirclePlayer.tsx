/**
 * CirclePlayer - Select correct items by clicking (circle/markwithx)
 * Story 4.2 - Fix question grouping logic and image coordinate scaling
 * Handles both "circle" and "markwithx" activity types
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { CircleActivity } from "@/lib/mockData"
import { getActivityImageUrl } from "@/services/booksApi"

/**
 * Animated border selection indicator
 * Uses SVG rect animation to draw around the entire selection area
 */
function AnimatedBorder({
  width,
  height,
  type,
}: {
  width: number
  height: number
  type: "circle" | "markwithx"
}) {
  const strokeColor = type === "markwithx" ? "#ef4444" : "#3b82f6" // red-500 or blue-500
  const strokeWidth = 5
  const radius = 8 // border-radius for rounded corners
  const padding = strokeWidth / 2

  // Calculate the perimeter of the rounded rectangle
  const perimeter =
    2 * (width - 2 * radius) + 2 * (height - 2 * radius) + 2 * Math.PI * radius

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width="100%"
      height="100%"
      style={{ overflow: "visible" }}
    >
      <rect
        x={padding}
        y={padding}
        width={width - strokeWidth}
        height={height - strokeWidth}
        rx={radius}
        ry={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: perimeter,
          strokeDashoffset: 0,
          animation: "draw-border 0.5s ease-out forwards",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
        }}
      />
      <style>
        {`
          @keyframes draw-border {
            from {
              stroke-dashoffset: ${perimeter};
            }
            to {
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>
    </svg>
  )
}

interface CirclePlayerProps {
  activity: CircleActivity
  bookId: string // Story 4.2: For backend-proxied image URLs
  onAnswersChange: (answers: Map<number, number>) => void
  showResults?: boolean
  correctAnswers?: Map<number, number>
  initialAnswers?: Map<number, number>
  // Story 9.7: Show correct answers in preview mode
  showCorrectAnswers?: boolean
}

export function CirclePlayer({
  activity,
  bookId,
  onAnswersChange,
  showResults = false,
  correctAnswers,
  initialAnswers,
  showCorrectAnswers = false,
}: CirclePlayerProps) {
  // Map of questionIndex -> selectedAnswerIndex
  const [selections, setSelections] = useState<Map<number, number>>(
    initialAnswers || new Map(),
  )

  // Image state (Story 4.2: Authenticated image loading)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [imageScale, setImageScale] = useState({ x: 1, y: 1 })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Use refs to track if image dimensions have been initialized
  const isImageScaledRef = useRef(false)

  // Lock image dimensions after first load to prevent reflow
  const [lockedImageDimensions, setLockedImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)

  // Lock container height after first load to prevent reflow
  const [lockedContainerHeight, setLockedContainerHeight] = useState<
    number | null
  >(null)

  // Store scaled coordinates in a ref to prevent recalculation
  const scaledCoordsCache = useRef<
    Map<
      number,
      {
        left: number
        top: number
        width: number
        height: number
      }
    >
  >(new Map())

  // Handle special circleCount values
  let effectiveCircleCount = activity.circleCount ?? 2 // Default to 2 if undefined
  const isMultiSelectMode = effectiveCircleCount === -1
  if (effectiveCircleCount === 0) {
    effectiveCircleCount = 2 // Default to true/false
  }

  // Update image scale when image loads or window resizes
  const updateImageScale = useCallback(() => {
    const img = imageRef.current
    const container = containerRef.current
    if (!img || !container) return

    // Don't recalculate if image hasn't loaded yet
    if (!img.complete || img.naturalWidth === 0) return

    // Calculate aspect ratios
    const imageAspect = img.naturalWidth / img.naturalHeight
    const containerAspect = container.clientWidth / container.clientHeight

    // Calculate painted (rendered) dimensions with object-contain
    let paintedWidth: number, paintedHeight: number

    if (imageAspect > containerAspect) {
      // Image is wider - constrained by width, letterboxing top/bottom
      paintedWidth = container.clientWidth
      paintedHeight = container.clientWidth / imageAspect
    } else {
      // Image is taller - constrained by height, pillarboxing left/right
      paintedHeight = container.clientHeight
      paintedWidth = container.clientHeight * imageAspect
    }

    // Calculate scale factors based on painted dimensions
    const xScale = paintedWidth / img.naturalWidth
    const yScale = paintedHeight / img.naturalHeight

    // Lock image and container dimensions on first load to prevent flex container reflow
    if (!lockedImageDimensions) {
      const imageDims = {
        width: paintedWidth,
        height: paintedHeight,
      }
      const containerHeight = container.clientHeight

      setLockedImageDimensions(imageDims)
      setLockedContainerHeight(containerHeight)
    }

    // Round to 4 decimal places to prevent floating-point drift
    const roundedXScale = Math.round(xScale * 10000) / 10000
    const roundedYScale = Math.round(yScale * 10000) / 10000

    // Only update state if values have actually changed to prevent unnecessary re-renders
    setImageScale((prev) => {
      if (prev.x === roundedXScale && prev.y === roundedYScale) return prev
      return { x: roundedXScale, y: roundedYScale }
    })

    // Pre-calculate all button positions and cache them
    // Note: No offset needed since overlays are positioned relative to the image wrapper
    scaledCoordsCache.current.clear()
    activity.answer.forEach((answer, answerIndex) => {
      const coords = {
        left: Math.round(answer.coords.x * roundedXScale * 100) / 100,
        top: Math.round(answer.coords.y * roundedYScale * 100) / 100,
        width: Math.round(answer.coords.w * roundedXScale * 100) / 100,
        height: Math.round(answer.coords.h * roundedYScale * 100) / 100,
      }
      scaledCoordsCache.current.set(answerIndex, coords)
    })

    isImageScaledRef.current = true
  }, [activity.answer, lockedImageDimensions])

  // Fetch authenticated image (Story 4.2)
  useEffect(() => {
    let isMounted = true

    async function loadImage() {
      console.log("CirclePlayer - Loading image:", {
        bookId,
        section_path: activity.section_path,
      })

      try {
        const url = await getActivityImageUrl(bookId, activity.section_path)

        if (isMounted) {
          console.log("CirclePlayer - Generated URL:", url)

          if (url) {
            setImageUrl(url)
            setImageError(false)
          } else {
            console.error("CirclePlayer - Failed to generate image URL")
            setImageError(true)
          }
        }
      } catch (error) {
        console.error("CirclePlayer - Error loading image:", error)
        if (isMounted) {
          setImageError(true)
        }
      }
    }

    loadImage()

    return () => {
      isMounted = false
    }
  }, [bookId, activity.section_path])

  // Cleanup blob URL on unmount (separate effect to avoid infinite loop)
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  useEffect(() => {
    const img = imageRef.current
    const container = containerRef.current
    if (img) {
      if (img.complete) {
        updateImageScale()
      } else {
        img.addEventListener("load", updateImageScale)
      }
    }

    // Use ResizeObserver for container size changes (e.g., sidebar open/close)
    let resizeObserver: ResizeObserver | null = null
    if (container) {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(updateImageScale)
      })
      resizeObserver.observe(container)
    }

    window.addEventListener("resize", updateImageScale)
    return () => {
      window.removeEventListener("resize", updateImageScale)
      if (img) {
        img.removeEventListener("load", updateImageScale)
      }
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [updateImageScale])

  // Handle area click - implements QML's handleAnswer logic
  const handleAreaClick = (answerIndex: number) => {
    if (showResults) return

    const newSelections = new Map(selections)

    console.log("CirclePlayer - Click:", {
      answerIndex,
      effectiveCircleCount,
      isMultiSelectMode,
      currentSelections: Array.from(selections.entries()),
    })

    // Multi-select mode: toggle selections without grouping
    if (isMultiSelectMode) {
      const wasSelected = Array.from(newSelections.values()).includes(
        answerIndex,
      )
      if (wasSelected) {
        // Find and remove this selection
        for (const [qIdx, aIdx] of newSelections.entries()) {
          if (aIdx === answerIndex) {
            newSelections.delete(qIdx)
            break
          }
        }
      } else {
        // Add new selection with unique question index
        const nextQIdx = newSelections.size
        newSelections.set(nextQIdx, answerIndex)
      }
    } else {
      // QML grouping logic: Calculate which question group this answer belongs to
      const questionIndex = Math.floor(answerIndex / effectiveCircleCount)

      console.log("CirclePlayer - Question grouping:", {
        answerIndex,
        questionIndex,
        wasSelected: newSelections.get(questionIndex) === answerIndex,
      })

      // Check if clicking the same answer (deselect behavior)
      if (newSelections.get(questionIndex) === answerIndex) {
        newSelections.delete(questionIndex)
        console.log("CirclePlayer - Deselected question", questionIndex)
      } else {
        // Clear current group selection and set new one
        newSelections.set(questionIndex, answerIndex)
        console.log(
          "CirclePlayer - Selected answer",
          answerIndex,
          "for question",
          questionIndex,
        )
      }
    }

    console.log(
      "CirclePlayer - New selections:",
      Array.from(newSelections.entries()),
    )
    setSelections(newSelections)
    onAnswersChange(newSelections)
  }

  // Get question index for an answer
  const getQuestionIndex = (answerIndex: number): number => {
    if (isMultiSelectMode) return 0
    return Math.floor(answerIndex / effectiveCircleCount)
  }

  // Check if answer is selected
  const isSelected = (answerIndex: number): boolean => {
    return Array.from(selections.values()).includes(answerIndex)
  }

  // Check if area is correct (for results view)
  const isCorrect = (answerIndex: number): boolean => {
    if (!showResults || !correctAnswers) return false
    const questionIndex = getQuestionIndex(answerIndex)
    return correctAnswers.get(questionIndex) === answerIndex
  }

  // Story 9.7: Check if this answer is the correct one for its question (for preview mode)
  const isCorrectAnswer = (answerIndex: number): boolean => {
    return activity.answer[answerIndex]?.isCorrect === true
  }

  // Get scaled coordinates - use cached values to prevent recalculation
  const getScaledCoords = useCallback(
    (answerIndex: number) => {
      // Try to get from cache first
      const cached = scaledCoordsCache.current.get(answerIndex)
      if (cached) {
        return cached
      }

      // Fallback: calculate on the fly (shouldn't happen if image is loaded)
      const answer = activity.answer[answerIndex]
      return {
        left: answer.coords.x * imageScale.x,
        top: answer.coords.y * imageScale.y,
        width: answer.coords.w * imageScale.x,
        height: answer.coords.h * imageScale.y,
      }
    },
    [activity.answer, imageScale],
  )

  return (
    <div className="flex h-full min-h-0 flex-col p-2">
      {/* Background Image with Selectable Areas - fills remaining height */}
      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-neutral-800"
        style={{
          willChange: "auto",
          height: lockedContainerHeight ? `${lockedContainerHeight}px` : "auto",
          minHeight: lockedContainerHeight
            ? `${lockedContainerHeight}px`
            : "auto",
          maxHeight: lockedContainerHeight
            ? `${lockedContainerHeight}px`
            : "auto",
        }}
      >
        {/* Loading state */}
        {!imageUrl && !imageError && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-teal-600 dark:border-gray-600 dark:border-t-teal-400" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Loading image...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {imageError && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-red-600 dark:text-red-400">
              <p>Failed to load activity image</p>
            </div>
          </div>
        )}

        {/* Image wrapper - positions overlays relative to the image */}
        {imageUrl && (
          <div
            className="relative"
            style={{
              width: lockedImageDimensions
                ? `${lockedImageDimensions.width}px`
                : "auto",
              height: lockedImageDimensions
                ? `${lockedImageDimensions.height}px`
                : "auto",
            }}
          >
            {/* Image */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Activity background"
              className="block"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />

            {/* Selectable Areas Overlay - positioned relative to image wrapper */}
            {activity.answer.map((_answer, answerIndex) => {
              const selected = isSelected(answerIndex)
              const correct = isCorrect(answerIndex)
              const scaledCoords = getScaledCoords(answerIndex)
              const questionIndex = getQuestionIndex(answerIndex)
              // Story 9.7: Check if this is the correct answer for preview mode
              const isCorrectForPreview =
                showCorrectAnswers && isCorrectAnswer(answerIndex)

              return (
                <button
                  type="button"
                  key={answerIndex}
                  onClick={() =>
                    !showCorrectAnswers && handleAreaClick(answerIndex)
                  }
                  className={`
                  absolute flex items-center justify-center rounded-md transition-colors duration-200 box-border
                  ${
                    showCorrectAnswers
                      ? isCorrectForPreview
                        ? "border-2 border-green-500 bg-green-100/80 dark:bg-green-900/50"
                        : "border-2 border-gray-300 bg-white/20 dark:border-gray-600"
                      : showResults
                        ? selected
                          ? correct
                            ? "border-2 border-green-500 bg-green-100/80 dark:bg-green-900/50"
                            : "border-2 border-red-500 bg-red-100/80 dark:bg-red-900/50"
                          : !correct
                            ? "border-2 border-gray-300 bg-white/20 dark:border-gray-600"
                            : "border-2 border-orange-500 bg-orange-100/80 dark:bg-orange-900/50"
                        : selected
                          ? activity.type === "markwithx"
                            ? "cursor-pointer border-transparent bg-red-50/60 dark:bg-red-900/30"
                            : "cursor-pointer border-transparent bg-blue-50/60 dark:bg-blue-900/30"
                          : "cursor-pointer border-2 border-gray-400 border-dashed bg-white/20 hover:border-gray-500 hover:bg-white/40 dark:border-gray-500 dark:hover:bg-gray-700/30"
                  }
                `}
                  style={{
                    ...scaledCoords,
                    position: "absolute",
                    pointerEvents:
                      showResults || showCorrectAnswers ? "none" : "auto",
                  }}
                  aria-pressed={selected || isCorrectForPreview}
                  tabIndex={!showResults && !showCorrectAnswers ? 0 : -1}
                  aria-label={`Question ${questionIndex + 1}, Option ${(answerIndex % effectiveCircleCount) + 1}${selected ? " (selected)" : ""}${isCorrectForPreview ? " (correct answer)" : ""}`}
                  disabled={showResults || showCorrectAnswers}
                >
                  {/* Selection indicator - animated border around selection area */}
                  {selected && !showResults && !showCorrectAnswers && (
                    <AnimatedBorder
                      width={scaledCoords.width}
                      height={scaledCoords.height}
                      type={activity.type}
                    />
                  )}

                  {/* Story 9.7: Show correct answer indicator in preview mode */}
                  {showCorrectAnswers && isCorrectForPreview && (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-xl font-bold text-white shadow-lg shrink-0"
                      style={{ minWidth: "2rem", minHeight: "2rem" }}
                    >
                      ✓
                    </div>
                  )}

                  {/* Results indicator */}
                  {showResults && (
                    <div
                      className={`
                      flex h-8 w-8 items-center justify-center rounded-full text-xl font-bold shadow-lg shrink-0
                      ${
                        selected
                          ? correct
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                          : correct
                            ? "bg-orange-500 text-white"
                            : ""
                      }
                    `}
                      style={{ minWidth: "2rem", minHeight: "2rem" }}
                    >
                      {selected ? (correct ? "✓" : "✗") : correct ? "!" : ""}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Results Legend - compact */}
      {showResults && (
        <div className="mt-2 shrink-0 rounded-lg bg-gray-50 px-3 py-2 dark:bg-neutral-800">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Legend:
            </span>
            <div className="flex items-center gap-1">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                ✓
              </div>
              <span className="text-gray-600 dark:text-gray-400">Correct</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                ✗
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                Incorrect
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                !
              </div>
              <span className="text-gray-600 dark:text-gray-400">Missed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
