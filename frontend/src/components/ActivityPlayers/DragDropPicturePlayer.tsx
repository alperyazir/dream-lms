/**
 * DragDropPicturePlayer - Drag words to drop zones on background image
 * Story 2.5 - Phase 2, Tasks 2.1-2.4
 */

import { useEffect, useRef, useState } from "react"
import type { DragDropAnswer, DragDropPictureActivity } from "@/lib/mockData"

interface DragDropPicturePlayerProps {
  activity: DragDropPictureActivity
  onAnswersChange: (answers: Map<string, string>) => void
  showResults?: boolean
  correctAnswers?: Set<string>
  initialAnswers?: Map<string, string>
}

export function DragDropPicturePlayer({
  activity,
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

  // Keyboard navigation state
  const [_focusedDropZoneIndex, setFocusedDropZoneIndex] = useState<number>(-1)
  const dropZoneRefs = useRef<(HTMLDivElement | null)[]>([])
  const wordRefs = useRef<(HTMLDivElement | null)[]>([])

  // Get used words (already placed in drop zones)
  const usedWords = new Set(answers.values())

  // Calculate drop zone ID from coordinates
  const getDropZoneId = (coords: DragDropAnswer["coords"]): string => {
    return `${coords.x}-${coords.y}`
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

    // Place selected word
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

  // Handle remove word from drop zone
  const handleRemove = (dropZoneId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const newAnswers = new Map(answers)
    newAnswers.delete(dropZoneId)
    setAnswers(newAnswers)
    onAnswersChange(newAnswers)
  }

  // Get completion count
  const completionCount = answers.size
  const totalCount = activity.answer.length

  // Check if drop zone is correct (for results view)
  const isCorrect = (dropZoneId: string): boolean => {
    if (!showResults || !correctAnswers) return false
    return correctAnswers.has(dropZoneId)
  }

  // Keyboard navigation: Handle word selection with Space/Enter
  const _handleWordKeyDown = (e: React.KeyboardEvent, word: string) => {
    if (showResults || usedWords.has(word)) return

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      handleWordClick(word)
      // If word was selected, focus first drop zone
      if (!selectedWord) {
        setFocusedDropZoneIndex(0)
        setTimeout(() => dropZoneRefs.current[0]?.focus(), 0)
      }
    } else if (e.key === "Escape" && selectedWord) {
      e.preventDefault()
      setSelectedWord(null)
    }
  }

  // Keyboard navigation: Handle drop zone interaction with Space/Enter and arrow keys
  const _handleDropZoneKeyDown = (
    e: React.KeyboardEvent,
    dropZoneId: string,
    index: number,
  ) => {
    if (showResults) return

    if (e.key === " " || e.key === "Enter") {
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

  return (
    <div className="flex h-full flex-col p-4">
      {/* Word Bank */}
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Word Bank
        </h3>
        <div className="flex flex-wrap gap-2">
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
      <div className="relative flex-1 overflow-auto rounded-lg bg-gray-100 dark:bg-gray-800">
        <img
          src={activity.section_path}
          alt="Activity background"
          className="h-full w-full object-contain"
        />

        {/* Drop Zones Overlay */}
        {activity.answer.map((answer, index) => {
          const dropZoneId = getDropZoneId(answer.coords)
          const placedWord = answers.get(dropZoneId)
          const isHovered = hoveredZone === dropZoneId
          const correct = isCorrect(dropZoneId)

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
              className={`
                absolute flex items-center justify-center rounded-md transition-all duration-200
                ${
                  placedWord
                    ? showResults
                      ? correct
                        ? "border-2 border-green-500 bg-green-100/90 text-green-900 dark:bg-green-900/70 dark:text-green-100"
                        : "border-2 border-red-500 bg-red-100/90 text-red-900 dark:bg-red-900/70 dark:text-red-100"
                      : "border-2 border-teal-500 bg-teal-100/90 text-teal-900 dark:bg-teal-900/70 dark:text-teal-100"
                    : isHovered
                      ? "border-2 border-dashed border-teal-500 bg-teal-50/50 dark:bg-teal-900/30"
                      : "border-2 border-dashed border-gray-400 bg-white/50 hover:border-gray-500 dark:border-gray-500 dark:bg-gray-800/50"
                }
              `}
              style={{
                left: `${answer.coords.x}px`,
                top: `${answer.coords.y}px`,
                width: `${answer.coords.w}px`,
                height: `${answer.coords.h}px`,
              }}
              tabIndex={!showResults ? 0 : -1}
              aria-label={
                placedWord
                  ? `Drop zone ${answer.no}: ${placedWord}${showResults ? (correct ? " (correct)" : " (incorrect)") : ""}`
                  : `Drop zone ${answer.no}: empty`
              }
              data-testid="drop-zone"
              disabled={showResults}
            >
              {placedWord && (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold">{placedWord}</span>
                  {!showResults && (
                    <button
                      type="button"
                      onClick={(e) => handleRemove(dropZoneId, e)}
                      className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-red-500 hover:text-white dark:bg-gray-700 dark:text-gray-300"
                      aria-label={`Remove ${placedWord}`}
                    >
                      ×
                    </button>
                  )}
                  {showResults && (
                    <span className="ml-1">{correct ? "✓" : "✗"}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
