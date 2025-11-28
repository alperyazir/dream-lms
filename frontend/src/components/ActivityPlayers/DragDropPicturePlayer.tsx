/**
 * DragDropPicturePlayer - Drag words to drop zones on background image
 * Story 4.2 - Added image coordinate scaling and authenticated image loading
 */

import { useEffect, useRef, useState } from "react"
import type { DragDropAnswer, DragDropPictureActivity } from "@/lib/mockData"
import { getActivityImageUrl } from "@/services/booksApi"

interface DragDropPicturePlayerProps {
  activity: DragDropPictureActivity
  bookId: string // Story 4.2: For backend-proxied image URLs
  onAnswersChange: (answers: Map<string, string>) => void
  showResults?: boolean
  correctAnswers?: Set<string>
  initialAnswers?: Map<string, string>
}

export function DragDropPicturePlayer({
  activity,
  bookId,
  onAnswersChange,
  showResults = false,
  correctAnswers,
  initialAnswers,
}: DragDropPicturePlayerProps) {
  const [answers, setAnswers] = useState<Map<string, string>>(
    initialAnswers || new Map(),
  )
  const [draggedWord, setDraggedWord] = useState<string | null>(null)
  const [selectedWord, setSelectedWord] = useState<string | null>(null) // For mobile
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)

  // Image state (Story 4.2: Authenticated image loading)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [imageScale, setImageScale] = useState({ x: 1, y: 1 })
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Keyboard navigation state
  const [, setFocusedDropZoneIndex] = useState<number>(-1)
  const dropZoneRefs = useRef<(HTMLButtonElement | null)[]>([])
  const wordRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Get used words (already placed in drop zones)
  const usedWords = new Set(answers.values())

  // Calculate drop zone ID from coordinates
  const getDropZoneId = (coords: DragDropAnswer["coords"]): string => {
    return `${coords.x}-${coords.y}`
  }

  // Update image scale when image loads or window resizes (Story 4.2)
  const updateImageScale = () => {
    const img = imageRef.current
    const container = containerRef.current
    if (!img || !container) return

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

    setImageScale({ x: xScale, y: yScale })
    setImageOffset({ x: xOffset, y: yOffset })
  }

  // Fetch authenticated image (Story 4.2)
  useEffect(() => {
    let isMounted = true

    async function loadImage() {
      try {
        const url = await getActivityImageUrl(bookId, activity.section_path)
        if (isMounted) {
          if (url) {
            setImageUrl(url)
            setImageError(false)
          } else {
            setImageError(true)
          }
        }
      } catch (error) {
        console.error("Error loading activity image:", error)
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
  }, [imageUrl])

  // Get scaled coordinates (Story 4.2)
  const getScaledCoords = (coords: { x: number; y: number; w: number; h: number }) => {
    return {
      left: imageOffset.x + coords.x * imageScale.x,
      top: imageOffset.y + coords.y * imageScale.y,
      width: coords.w * imageScale.x,
      height: coords.h * imageScale.y,
    }
  }

  // Handle drag start (desktop)
  const handleDragStart = (word: string) => {
    setDraggedWord(word)
  }

  // Handle drag end (desktop)
  const handleDragEnd = () => {
    setDraggedWord(null)
  }

  // Handle drag over drop zone (desktop)
  const handleDragOver = (e: React.DragEvent, dropZoneId: string) => {
    e.preventDefault()
    setHoveredZone(dropZoneId)
  }

  // Handle drag leave drop zone (desktop)
  const handleDragLeave = () => {
    setHoveredZone(null)
  }

  // Handle drop (desktop)
  const handleDrop = (e: React.DragEvent, dropZoneId: string) => {
    e.preventDefault()
    if (draggedWord) {
      const newAnswers = new Map(answers)

      // Remove word from any previous location
      for (const [key, value] of newAnswers.entries()) {
        if (value === draggedWord) {
          newAnswers.delete(key)
        }
      }

      // Add to new location
      newAnswers.set(dropZoneId, draggedWord)
      setAnswers(newAnswers)
      onAnswersChange(newAnswers)
    }
    setDraggedWord(null)
    setHoveredZone(null)
  }

  // Handle word click (mobile)
  const handleWordClick = (word: string) => {
    if (usedWords.has(word)) return // Can't select used words
    setSelectedWord(selectedWord === word ? null : word)
  }

  // Handle drop zone click (mobile)
  const handleDropZoneClick = (dropZoneId: string) => {
    if (!selectedWord) {
      // If no word selected, remove word from this zone
      const newAnswers = new Map(answers)
      newAnswers.delete(dropZoneId)
      setAnswers(newAnswers)
      onAnswersChange(newAnswers)
      return
    }

    // Place selected word in this zone
    const newAnswers = new Map(answers)

    // Remove word from any previous location
    for (const [key, value] of newAnswers.entries()) {
      if (value === selectedWord) {
        newAnswers.delete(key)
      }
    }

    // Add to new location
    newAnswers.set(dropZoneId, selectedWord)
    setAnswers(newAnswers)
    onAnswersChange(newAnswers)
    setSelectedWord(null)
  }

  // Check if a drop zone has the correct answer
  const isCorrect = (dropZoneId: string): boolean => {
    if (!showResults || !correctAnswers) return false
    return correctAnswers.has(dropZoneId)
  }

  // Calculate completion
  const completionCount = answers.size
  const totalCount = activity.answer.length

  // Keyboard navigation for word bank
  const handleWordKeyDown = (e: React.KeyboardEvent, word: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (!usedWords.has(word)) {
        handleWordClick(word)
      }
    }
  }

  // Keyboard navigation for drop zones
  const handleDropZoneKeyDown = (
    e: React.KeyboardEvent,
    dropZoneId: string,
    index: number,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleDropZoneClick(dropZoneId)
    } else if (e.key === "Escape") {
      e.preventDefault()
      setSelectedWord(null)
      setFocusedDropZoneIndex(-1)
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      const nextIndex = (index + 1) % activity.answer.length
      setFocusedDropZoneIndex(nextIndex)
      dropZoneRefs.current[nextIndex]?.focus()
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      const prevIndex = index === 0 ? activity.answer.length - 1 : index - 1
      setFocusedDropZoneIndex(prevIndex)
      dropZoneRefs.current[prevIndex]?.focus()
    }
  }

  // Initialize refs array
  useEffect(() => {
    dropZoneRefs.current = dropZoneRefs.current.slice(0, activity.answer.length)
    wordRefs.current = wordRefs.current.slice(0, activity.words.length)
  }, [activity.answer.length, activity.words.length])

  // Handle reset - clear all selections
  const handleReset = () => {
    setAnswers(new Map())
    onAnswersChange(new Map())
    setSelectedWord(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      {/* Word Bank - Fixed min-height to prevent layout shifts */}
      <div className="mb-4 shrink-0">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Word Bank
          </h3>
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
        <div className="flex min-h-[60px] flex-wrap justify-center gap-2">
          {activity.words.map((word, index) => (
            <button
              type="button"
              key={index}
              ref={(el) => {
                if (el) {
                  wordRefs.current[index] = el
                }
              }}
              draggable={!usedWords.has(word) && !showResults}
              onDragStart={() => handleDragStart(word)}
              onDragEnd={handleDragEnd}
              onClick={() => !showResults && handleWordClick(word)}
              onKeyDown={(e) => handleWordKeyDown(e, word)}
              className={`
                cursor-pointer rounded-lg border-2 px-4 py-2 font-semibold shadow-neuro-sm transition-all duration-200
                ${
                  usedWords.has(word)
                    ? "pointer-events-none border-gray-300 bg-gray-100 opacity-30 dark:border-gray-600 dark:bg-gray-800"
                    : selectedWord === word
                      ? "border-blue-500 bg-blue-50 shadow-neuro dark:border-blue-400 dark:bg-blue-900/30"
                      : draggedWord === word
                        ? "scale-105 border-teal-500 bg-teal-50 shadow-neuro dark:border-teal-400 dark:bg-teal-900/30"
                        : "border-gray-300 bg-white hover:scale-105 hover:border-teal-400 hover:shadow-neuro dark:border-gray-600 dark:bg-gray-800 dark:hover:border-teal-500"
                }
              `}
              tabIndex={!usedWords.has(word) && !showResults ? 0 : -1}
              aria-label={`Word: ${word}${usedWords.has(word) ? " (already used)" : ""}`}
              disabled={usedWords.has(word)}
            >
              {word}
            </button>
          ))}
        </div>

        {/* Completion Counter */}
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Completed: {completionCount} / {totalCount}
        </div>
      </div>

      {/* Background Image with Drop Zones */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
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

        {/* Image with Overlay Container */}
        {imageUrl && (
          <div className="relative h-full w-full">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Activity background"
              className="h-full w-full object-contain"
              onLoad={updateImageScale}
            />

            {/* Drop Zones Overlay - positioned over image */}
            {activity.answer.map((answer, index) => {
          const dropZoneId = getDropZoneId(answer.coords)
          const placedWord = answers.get(dropZoneId)
          const isHovered = hoveredZone === dropZoneId
          const correct = isCorrect(dropZoneId)
          const scaledCoords = getScaledCoords(answer.coords)

          return (
            <button
              type="button"
              key={dropZoneId}
              ref={(el) => {
                if (el) {
                  dropZoneRefs.current[index] = el
                }
              }}
              onDragOver={(e) => !showResults && handleDragOver(e, dropZoneId)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => !showResults && handleDrop(e, dropZoneId)}
              onClick={() => !showResults && handleDropZoneClick(dropZoneId)}
              onKeyDown={(e) => handleDropZoneKeyDown(e, dropZoneId, index)}
              className={`
                absolute flex items-center justify-center rounded-md transition-all duration-200 p-1
                ${
                  placedWord
                    ? showResults
                      ? correct
                        ? "border-2 border-green-500 bg-green-100/95 text-green-900 dark:bg-green-900/80 dark:text-green-100"
                        : "border-2 border-red-500 bg-red-100/95 text-red-900 dark:bg-red-900/80 dark:text-red-100"
                      : "border-2 border-teal-500 bg-teal-100/95 text-teal-900 dark:bg-teal-900/80 dark:text-teal-100"
                    : isHovered
                      ? "border-2 border-dashed border-teal-500 bg-teal-50/50 dark:bg-teal-900/30"
                      : "border-2 border-dashed border-gray-400 bg-white/50 hover:border-gray-500 dark:border-gray-500 dark:bg-gray-800/50"
                }
              `}
              style={scaledCoords}
              tabIndex={!showResults ? 0 : -1}
              aria-label={`Drop zone ${index + 1}${placedWord ? `: ${placedWord}` : ""}`}
              disabled={showResults}
            >
              <span className="text-center text-base font-bold leading-tight">
                {placedWord || ""}
              </span>

              {/* Results indicator */}
              {showResults && placedWord && (
                <div
                  className={`
                    absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold shadow-lg
                    ${correct ? "bg-green-500 text-white" : "bg-red-500 text-white"}
                  `}
                >
                  {correct ? "✓" : "✗"}
                </div>
              )}
            </button>
          )
        })}
          </div>
        )}
      </div>
    </div>
  )
}
