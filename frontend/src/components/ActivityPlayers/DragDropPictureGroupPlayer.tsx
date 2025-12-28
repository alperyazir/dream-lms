/**
 * DragDropPictureGroupPlayer - Drag words to category drop zones on background image
 * Each drop zone accepts multiple correct answers (group/category matching)
 * Based on QML ActivityDragDropPictureGroup.qml and DraggableWords.qml logic
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  DragDropGroupAnswer,
  DragDropPictureGroupActivity,
} from "@/lib/mockData"
import { getActivityImageUrl } from "@/services/booksApi"

// Story 23.1: Draggable item with unique ID to support duplicate texts
interface DraggableItem {
  id: string // Unique instance ID
  text: string // Display text (can be duplicate)
  originalIndex: number // Original position in word bank
}

// Story 23.1: Initialize draggable items with unique IDs
function initializeItems(words: string[]): DraggableItem[] {
  return words.map((word, index) => ({
    id: `item-${index}`, // Deterministic ID for save/resume compatibility
    text: word,
    originalIndex: index,
  }))
}

interface DragDropPictureGroupPlayerProps {
  activity: DragDropPictureGroupActivity
  bookId: string
  onAnswersChange: (answers: Map<string, string>) => void
  showResults?: boolean
  correctAnswers?: Set<string>
  initialAnswers?: Map<string, string>
  // Story 9.7: Show correct answers in preview mode
  showCorrectAnswers?: boolean
}

export function DragDropPictureGroupPlayer({
  activity,
  bookId,
  onAnswersChange,
  showResults = false,
  correctAnswers,
  initialAnswers,
  showCorrectAnswers = false,
}: DragDropPictureGroupPlayerProps) {
  // Story 23.1: Initialize items with unique IDs
  const [allItems] = useState<DraggableItem[]>(() =>
    initializeItems(activity.words),
  )

  const [answers, setAnswers] = useState<Map<string, string>>(
    initialAnswers || new Map(),
  )
  const [draggedItem, setDraggedItem] = useState<DraggableItem | null>(null)
  const [selectedItem, setSelectedItem] = useState<DraggableItem | null>(null) // For mobile
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)

  // Image state
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

  // Story 23.1: Get used item IDs (already placed in drop zones)
  const usedItemIds = new Set(answers.values())

  // Get available items (not yet placed)
  const availableItems = allItems.filter((item) => !usedItemIds.has(item.id))

  // Calculate drop zone ID from coordinates
  const getDropZoneId = (coords: DragDropGroupAnswer["coords"]): string => {
    return `${coords.x}-${coords.y}`
  }

  // Update image scale when image loads or window resizes
  // Memoized with useCallback to prevent infinite re-render loop
  const updateImageScale = useCallback(() => {
    const img = imageRef.current
    const container = containerRef.current
    if (!img || !container) return

    // Calculate aspect ratios
    const imageAspect = img.naturalWidth / img.naturalHeight
    const containerAspect = container.clientWidth / container.clientHeight

    // Calculate painted (rendered) dimensions with object-contain
    let paintedWidth: number,
      paintedHeight: number,
      xOffset: number,
      yOffset: number

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
  }, []) // No dependencies - uses refs

  // Fetch authenticated image
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

  // Get scaled coordinates
  const getScaledCoords = (coords: {
    x: number
    y: number
    w: number
    h: number
  }) => {
    return {
      left: imageOffset.x + coords.x * imageScale.x,
      top: imageOffset.y + coords.y * imageScale.y,
      width: coords.w * imageScale.x,
      height: coords.h * imageScale.y,
    }
  }

  // Story 23.1: Handle drag start (desktop) - now uses DraggableItem
  const handleDragStart = (item: DraggableItem) => {
    setDraggedItem(item)
  }

  // Handle drag end (desktop)
  const handleDragEnd = () => {
    setDraggedItem(null)
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

  // Story 23.1: Handle drop (desktop) - now tracks by item ID
  const handleDrop = (e: React.DragEvent, dropZoneId: string) => {
    e.preventDefault()
    if (draggedItem) {
      const newAnswers = new Map(answers)

      // Remove item from any previous location (by ID)
      for (const [key, value] of newAnswers.entries()) {
        if (value === draggedItem.id) {
          newAnswers.delete(key)
        }
      }

      // Add to new location (store item ID, not text)
      newAnswers.set(dropZoneId, draggedItem.id)
      setAnswers(newAnswers)
      onAnswersChange(newAnswers)
    }
    setDraggedItem(null)
    setHoveredZone(null)
  }

  // Story 23.1: Handle item click (mobile) - now uses DraggableItem
  const handleItemClick = (item: DraggableItem) => {
    if (usedItemIds.has(item.id)) return // Can't select used items
    setSelectedItem(selectedItem?.id === item.id ? null : item)
  }

  // Story 23.1: Handle drop zone click (mobile) - now tracks by item ID
  const handleDropZoneClick = (dropZoneId: string) => {
    if (!selectedItem) {
      // If no item selected, remove item from this zone
      const newAnswers = new Map(answers)
      newAnswers.delete(dropZoneId)
      setAnswers(newAnswers)
      onAnswersChange(newAnswers)
      return
    }

    // Place selected item in this zone
    const newAnswers = new Map(answers)

    // Remove item from any previous location (by ID)
    for (const [key, value] of newAnswers.entries()) {
      if (value === selectedItem.id) {
        newAnswers.delete(key)
      }
    }

    // Add to new location (store item ID, not text)
    newAnswers.set(dropZoneId, selectedItem.id)
    setAnswers(newAnswers)
    onAnswersChange(newAnswers)
    setSelectedItem(null)
  }

  // Story 23.1: Helper to get item by ID
  const getItemById = (id: string): DraggableItem | undefined => {
    return allItems.find((item) => item.id === id)
  }

  // Story 23.1: Get displayed text for a drop zone (converts ID to text)
  const getPlacedItemText = (dropZoneId: string): string | null => {
    const itemId = answers.get(dropZoneId)
    if (!itemId) return null
    const item = getItemById(itemId)
    return item?.text || null
  }

  // Check if a drop zone has the correct answer
  // GROUP LOGIC: Check if placed word is in the correctAnswerGroup array
  const isCorrect = (dropZoneId: string): boolean => {
    if (!showResults || !correctAnswers) return false
    return correctAnswers.has(dropZoneId)
  }

  // Story 9.7: Get first correct answer for a drop zone (for preview mode)
  const getCorrectAnswerText = (dropZoneId: string): string | null => {
    const answer = activity.answer.find(
      (a) => getDropZoneId(a.coords) === dropZoneId,
    )
    // For group type, return the first item in the group array
    return answer?.group?.[0] || null
  }

  // Calculate completion
  const completionCount = answers.size
  const totalCount = activity.answer.length

  // Story 23.1: Keyboard navigation for word bank - now uses DraggableItem
  const handleItemKeyDown = (e: React.KeyboardEvent, item: DraggableItem) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (!usedItemIds.has(item.id)) {
        handleItemClick(item)
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
      setSelectedItem(null) // Story 23.1: Updated to use selectedItem
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
    wordRefs.current = wordRefs.current.slice(0, availableItems.length)
  }, [activity.answer.length, availableItems.length])

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      {/* Story 23.1: Word Bank - now renders availableItems with unique IDs */}
      <div className="mb-4 shrink-0">
        <div className="flex min-h-[60px] flex-wrap justify-center gap-2">
          {availableItems.map((item, index) => {
            const isSelected = selectedItem?.id === item.id
            const isDragged = draggedItem?.id === item.id

            return (
              <button
                type="button"
                key={item.id} // Story 23.1: Use unique ID as key
                ref={(el) => {
                  if (el) {
                    wordRefs.current[index] = el
                  }
                }}
                draggable={!showResults}
                onDragStart={() => handleDragStart(item)}
                onDragEnd={handleDragEnd}
                onClick={() => !showResults && handleItemClick(item)}
                onKeyDown={(e) => handleItemKeyDown(e, item)}
                className={`
                  cursor-pointer rounded-lg border-2 px-4 py-2 font-semibold shadow-neuro-sm transition-all duration-200
                  ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-neuro dark:border-blue-400 dark:bg-blue-900/30"
                      : isDragged
                        ? "scale-105 border-teal-500 bg-teal-50 shadow-neuro dark:border-teal-400 dark:bg-teal-900/30"
                        : "border-gray-300 bg-white hover:scale-105 hover:border-teal-400 hover:shadow-neuro dark:border-gray-600 dark:bg-gray-800 dark:hover:border-teal-500"
                  }
                `}
                tabIndex={!showResults ? 0 : -1}
                aria-label={`Word: ${item.text}`}
              >
                {item.text}
              </button>
            )
          })}
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

            {/* Story 23.1: Drop Zones Overlay - now displays text from item IDs */}
            {activity.answer.map((answer, index) => {
              const dropZoneId = getDropZoneId(answer.coords)
              const placedItemText = getPlacedItemText(dropZoneId) // Story 23.1: Convert ID to text
              const isHovered = hoveredZone === dropZoneId
              const correct = isCorrect(dropZoneId)
              const scaledCoords = getScaledCoords(answer.coords)
              // Story 9.7: Get correct answer for preview mode
              const correctAnswerText = showCorrectAnswers
                ? getCorrectAnswerText(dropZoneId)
                : null
              const displayWord = showCorrectAnswers
                ? correctAnswerText
                : placedItemText

              return (
                <button
                  type="button"
                  key={dropZoneId}
                  ref={(el) => {
                    if (el) {
                      dropZoneRefs.current[index] = el
                    }
                  }}
                  onDragOver={(e) =>
                    !showResults &&
                    !showCorrectAnswers &&
                    handleDragOver(e, dropZoneId)
                  }
                  onDragLeave={handleDragLeave}
                  onDrop={(e) =>
                    !showResults &&
                    !showCorrectAnswers &&
                    handleDrop(e, dropZoneId)
                  }
                  onClick={() =>
                    !showResults &&
                    !showCorrectAnswers &&
                    handleDropZoneClick(dropZoneId)
                  }
                  onKeyDown={(e) => handleDropZoneKeyDown(e, dropZoneId, index)}
                  className={`
                absolute flex items-center justify-center rounded-md transition-all duration-200 p-1
                ${
                  showCorrectAnswers
                    ? "border-2 border-green-500 bg-green-100/95 text-green-900 dark:bg-green-900/80 dark:text-green-100"
                    : placedItemText
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
                  tabIndex={!showResults && !showCorrectAnswers ? 0 : -1}
                  aria-label={`Drop zone ${index + 1}${displayWord ? `: ${displayWord}` : ""}`}
                  disabled={showResults || showCorrectAnswers}
                >
                  <span className="text-center text-base font-bold leading-tight">
                    {displayWord || ""}
                  </span>

                  {/* Results indicator */}
                  {showResults && placedItemText && (
                    <div
                      className={`
                    absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold shadow-lg
                    ${correct ? "bg-green-500 text-white" : "bg-red-500 text-white"}
                  `}
                    >
                      {correct ? "✓" : "✗"}
                    </div>
                  )}

                  {/* Story 9.7: Show checkmark for correct answers in preview mode */}
                  {showCorrectAnswers && correctAnswerText && (
                    <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white shadow-lg">
                      ✓
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
