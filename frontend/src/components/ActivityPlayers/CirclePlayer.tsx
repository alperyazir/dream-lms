/**
 * CirclePlayer - Select correct items by clicking (circle/markwithx)
 * Story 4.2 - Fix question grouping logic and image coordinate scaling
 * Handles both "circle" and "markwithx" activity types
 */

import { useState, useRef, useEffect, useCallback } from "react"
import type { CircleActivity } from "@/lib/mockData"
import { getActivityImageUrl } from "@/services/booksApi"

interface CirclePlayerProps {
  activity: CircleActivity
  bookId: string // Story 4.2: For backend-proxied image URLs
  onAnswersChange: (answers: Map<number, number>) => void
  showResults?: boolean
  correctAnswers?: Map<number, number>
  initialAnswers?: Map<number, number>
}

export function CirclePlayer({
  activity,
  bookId,
  onAnswersChange,
  showResults = false,
  correctAnswers,
  initialAnswers,
}: CirclePlayerProps) {
  // Map of questionIndex -> selectedAnswerIndex
  const [selections, setSelections] = useState<Map<number, number>>(
    initialAnswers || new Map(),
  )

  // Image state (Story 4.2: Authenticated image loading)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [imageScale, setImageScale] = useState({ x: 1, y: 1 })
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 })
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
  const [lockedContainerHeight, setLockedContainerHeight] = useState<number | null>(null)

  // Store scaled coordinates in a ref to prevent recalculation
  const scaledCoordsCache = useRef<Map<number, {
    left: number
    top: number
    width: number
    height: number
  }>>(new Map())

  const icon = activity.type === "markwithx" ? "✗" : "✓"

  // Handle special circleCount values
  let effectiveCircleCount = activity.circleCount ?? 2 // Default to 2 if undefined
  const isMultiSelectMode = effectiveCircleCount === -1
  if (effectiveCircleCount === 0) {
    effectiveCircleCount = 2 // Default to true/false
  }

  // Calculate number of question groups
  const questionCount = isMultiSelectMode
    ? 1
    : Math.ceil(activity.answer.length / effectiveCircleCount)

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
    let paintedWidth: number, paintedHeight: number, xOffset: number, yOffset: number

    if (imageAspect > containerAspect) {
      // Image is wider - constrained by width, letterboxing top/bottom
      paintedWidth = container.clientWidth
      paintedHeight = container.clientWidth / imageAspect
      xOffset = 0
      yOffset = (container.clientHeight - paintedHeight) / 2
    } else {
      // Image is taller - constrained by height, pillarboxing left/right
      paintedHeight = container.clientHeight
      paintedWidth = container.clientHeight * imageAspect
      xOffset = (container.clientWidth - paintedWidth) / 2
      yOffset = 0
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

      console.log('CirclePlayer - Locking dimensions:', {
        imageDims,
        containerHeight,
      })

      setLockedImageDimensions(imageDims)
      setLockedContainerHeight(containerHeight)
    }

    // Round to 4 decimal places to prevent floating-point drift
    const roundedXScale = Math.round(xScale * 10000) / 10000
    const roundedYScale = Math.round(yScale * 10000) / 10000
    const roundedXOffset = Math.round(xOffset * 10000) / 10000
    const roundedYOffset = Math.round(yOffset * 10000) / 10000

    // Only update state if values have actually changed to prevent unnecessary re-renders
    setImageScale(prev => {
      if (prev.x === roundedXScale && prev.y === roundedYScale) return prev
      return { x: roundedXScale, y: roundedYScale }
    })
    setImageOffset(prev => {
      if (prev.x === roundedXOffset && prev.y === roundedYOffset) return prev
      return { x: roundedXOffset, y: roundedYOffset }
    })

    // Pre-calculate all button positions and cache them
    scaledCoordsCache.current.clear()
    activity.answer.forEach((answer, answerIndex) => {
      const coords = {
        left: Math.round((roundedXOffset + answer.coords.x * roundedXScale) * 100) / 100,
        top: Math.round((roundedYOffset + answer.coords.y * roundedYScale) * 100) / 100,
        width: Math.round((answer.coords.w * roundedXScale) * 100) / 100,
        height: Math.round((answer.coords.h * roundedYScale) * 100) / 100,
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
      // Cleanup blob URL when component unmounts
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [bookId, activity.section_path])

  useEffect(() => {
    const img = imageRef.current
    if (img) {
      if (img.complete) {
        updateImageScale()
      } else {
        img.addEventListener('load', updateImageScale)
      }
    }

    window.addEventListener('resize', updateImageScale)
    return () => {
      window.removeEventListener('resize', updateImageScale)
      if (img) {
        img.removeEventListener('load', updateImageScale)
      }
    }
  }, [imageUrl, updateImageScale])

  // Handle area click - implements QML's handleAnswer logic
  const handleAreaClick = (answerIndex: number) => {
    if (showResults) return

    const newSelections = new Map(selections)

    console.log('CirclePlayer - Click:', {
      answerIndex,
      effectiveCircleCount,
      isMultiSelectMode,
      currentSelections: Array.from(selections.entries()),
    })

    // Multi-select mode: toggle selections without grouping
    if (isMultiSelectMode) {
      const wasSelected = Array.from(newSelections.values()).includes(answerIndex)
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

      console.log('CirclePlayer - Question grouping:', {
        answerIndex,
        questionIndex,
        wasSelected: newSelections.get(questionIndex) === answerIndex,
      })

      // Check if clicking the same answer (deselect behavior)
      if (newSelections.get(questionIndex) === answerIndex) {
        newSelections.delete(questionIndex)
        console.log('CirclePlayer - Deselected question', questionIndex)
      } else {
        // Clear current group selection and set new one
        newSelections.set(questionIndex, answerIndex)
        console.log('CirclePlayer - Selected answer', answerIndex, 'for question', questionIndex)
      }
    }

    console.log('CirclePlayer - New selections:', Array.from(newSelections.entries()))
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

  // Get scaled coordinates - use cached values to prevent recalculation
  const getScaledCoords = useCallback((answerIndex: number) => {
    // Try to get from cache first
    const cached = scaledCoordsCache.current.get(answerIndex)
    if (cached) {
      return cached
    }

    // Fallback: calculate on the fly (shouldn't happen if image is loaded)
    const answer = activity.answer[answerIndex]
    return {
      left: imageOffset.x + answer.coords.x * imageScale.x,
      top: imageOffset.y + answer.coords.y * imageScale.y,
      width: answer.coords.w * imageScale.x,
      height: answer.coords.h * imageScale.y,
    }
  }, [activity.answer, imageScale, imageOffset])

  // Handle reset - clear all selections
  const handleReset = () => {
    setSelections(new Map())
    onAnswersChange(new Map())
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      {/* Instructions */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {activity.type === "markwithx"
              ? "Mark the incorrect items"
              : "Select the correct items"}
          </h2>
          {!showResults && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset
            </button>
          )}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {isMultiSelectMode
            ? `Questions answered: ${selections.size}`
            : `Questions answered: ${selections.size} / ${questionCount}`}
        </div>
      </div>

      {/* Background Image with Selectable Areas */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
        style={{
          willChange: 'auto',
          height: lockedContainerHeight ? `${lockedContainerHeight}px` : 'auto',
          minHeight: lockedContainerHeight ? `${lockedContainerHeight}px` : 'auto',
          maxHeight: lockedContainerHeight ? `${lockedContainerHeight}px` : 'auto',
        }}
      >
        {/* Loading state */}
        {!imageUrl && !imageError && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-teal-600 dark:border-gray-600 dark:border-t-teal-400" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading image...</p>
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

        {/* Image */}
        {imageUrl && (
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Activity background"
            className="mx-auto object-contain"
            style={{
              display: 'block',
              width: lockedImageDimensions ? `${lockedImageDimensions.width}px` : 'auto',
              height: lockedImageDimensions ? `${lockedImageDimensions.height}px` : 'auto',
              maxWidth: lockedImageDimensions ? 'none' : '100%',
              maxHeight: lockedImageDimensions ? 'none' : '100%',
              flexShrink: 0,
            }}
          />
        )}

        {/* Selectable Areas Overlay - only show when image is loaded */}
        {imageUrl && activity.answer.map((_answer, answerIndex) => {
          const selected = isSelected(answerIndex)
          const correct = isCorrect(answerIndex)
          const scaledCoords = getScaledCoords(answerIndex)
          const questionIndex = getQuestionIndex(answerIndex)

          // Visual grouping: Add subtle border between question groups
          const isFirstInGroup = !isMultiSelectMode && (answerIndex % effectiveCircleCount === 0)
          const groupClass = isFirstInGroup && answerIndex > 0 ? "border-t-4 border-t-gray-300 dark:border-t-gray-600" : ""

          return (
            <button
              type="button"
              key={answerIndex}
              onClick={() => handleAreaClick(answerIndex)}
              className={`
                absolute flex items-center justify-center rounded-md border-2 transition-colors duration-200 box-border
                ${groupClass}
                ${
                  showResults
                    ? selected
                      ? correct
                        ? "border-green-500 bg-green-100/80 dark:bg-green-900/50"
                        : "border-red-500 bg-red-100/80 dark:bg-red-900/50"
                      : !correct
                        ? "border-gray-300 bg-white/20 dark:border-gray-600"
                        : "border-orange-500 bg-orange-100/80 dark:bg-orange-900/50"
                    : selected
                      ? activity.type === "markwithx"
                        ? "cursor-pointer border-red-500 bg-red-100/80 hover:bg-red-200/80 dark:bg-red-900/50"
                        : "cursor-pointer border-blue-500 bg-blue-100/80 hover:bg-blue-200/80 dark:bg-blue-900/50"
                      : "cursor-pointer border-gray-400 border-dashed bg-white/20 hover:border-gray-500 hover:bg-white/40 dark:border-gray-500 dark:hover:bg-gray-700/30"
                }
              `}
              style={{
                ...scaledCoords,
                position: 'absolute',
                pointerEvents: showResults ? 'none' : 'auto',
              }}
              aria-pressed={selected}
              tabIndex={!showResults ? 0 : -1}
              aria-label={`Question ${questionIndex + 1}, Option ${(answerIndex % effectiveCircleCount) + 1}${selected ? ` (selected with ${icon})` : ""}`}
              disabled={showResults}
            >
              {/* Selection indicator */}
              {selected && (
                <div
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-full text-xl font-bold shadow-lg shrink-0
                    ${
                      activity.type === "markwithx"
                        ? "bg-red-500 text-white"
                        : "bg-blue-500 text-white"
                    }
                  `}
                  style={{ minWidth: '2rem', minHeight: '2rem' }}
                >
                  {icon}
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
                  style={{ minWidth: '2rem', minHeight: '2rem' }}
                >
                  {selected ? (correct ? "✓" : "✗") : correct ? "!" : ""}
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
