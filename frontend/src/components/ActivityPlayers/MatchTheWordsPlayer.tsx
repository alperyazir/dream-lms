/**
 * MatchTheWordsPlayer - Match words/terms with images
 * Story 4.2 - AC 17-19: Canvas/SVG line drawing between matched pairs
 * Follows QML ActivityMatchTheWords.qml pattern
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { MatchTheWordsActivity } from "@/lib/mockData"
import { getActivityImageUrl } from "@/services/booksApi"

interface MatchTheWordsPlayerProps {
  activity: MatchTheWordsActivity
  bookId: string // For authenticated image loading
  onAnswersChange: (answers: Map<string, string>) => void
  showResults?: boolean
  correctAnswers?: Set<string>
  initialAnswers?: Map<string, string>
}

interface LineData {
  sx: number
  sy: number
  ex: number
  ey: number
  color: string
  sentenceIndex: number
}

export function MatchTheWordsPlayer({
  activity,
  bookId,
  onAnswersChange,
  showResults = false,
  correctAnswers,
  initialAnswers,
}: MatchTheWordsPlayerProps) {
  const [matches, setMatches] = useState<Map<string, string>>(
    initialAnswers || new Map(),
  )
  const [draggedWord, setDraggedWord] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [lines, setLines] = useState<LineData[]>([])
  const [dragLine, setDragLine] = useState<LineData | null>(null)
  const [hoveredDropIndex, setHoveredDropIndex] = useState<number | null>(null)
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)

  // Image loading state
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map())

  const containerRef = useRef<HTMLDivElement>(null)
  const dragCircleRefs = useRef<(HTMLDivElement | null)[]>([])
  const dropCircleRefs = useRef<(HTMLDivElement | null)[]>([])

  // Create invisible drag image once
  const invisibleDragImage = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    const img = new Image()
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    invisibleDragImage.current = img
  }, [])

  // Get matched items
  const matchedSentences = new Set(
    Array.from(matches.entries()).map(([key]) => {
      const [, sentenceIndexStr] = key.split("-")
      return parseInt(sentenceIndexStr)
    }),
  )

  // Load authenticated images
  useEffect(() => {
    const loadImages = async () => {
      const newImageUrls = new Map<number, string>()

      for (let i = 0; i < activity.sentences.length; i++) {
        const sentence = activity.sentences[i]
        if (sentence.image_path) {
          try {
            const url = await getActivityImageUrl(bookId, sentence.image_path)
            if (url) {
              newImageUrls.set(i, url)
            }
          } catch (error) {
            console.error("Failed to load image:", sentence.image_path, error)
          }
        }
      }

      setImageUrls(newImageUrls)
    }

    loadImages()

    return () => {
      // Cleanup blob URLs
      imageUrls.forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [bookId, activity.sentences])

  // Update lines when matches change - use layout effect to prevent visual jumps
  useLayoutEffect(() => {
    updateLinesFromMatches()
  }, [matches, showResults, correctAnswers, imageUrls])

  const updateLinesFromMatches = () => {
    const newLines: LineData[] = []

    matches.forEach((word, matchKey) => {
      // matchKey format: "wordIndex-sentenceIndex"
      const [wordIndexStr, sentenceIndexStr] = matchKey.split("-")
      const wordIndex = parseInt(wordIndexStr)
      const sentenceIndex = parseInt(sentenceIndexStr)

      if (isNaN(wordIndex) || isNaN(sentenceIndex)) return

      const dragCircle = dragCircleRefs.current[wordIndex]
      const dropCircle = dropCircleRefs.current[sentenceIndex]

      if (dragCircle && dropCircle && containerRef.current) {
        const dragRect = dragCircle.getBoundingClientRect()
        const dropRect = dropCircle.getBoundingClientRect()
        const containerRect = containerRef.current.getBoundingClientRect()

        const sx = dragRect.left + dragRect.width / 2 - containerRect.left
        const sy = dragRect.top + dragRect.height / 2 - containerRect.top
        const ex = dropRect.left + dropRect.width / 2 - containerRect.left
        const ey = dropRect.top + dropRect.height / 2 - containerRect.top

        // Determine line color
        let color = "rgb(156, 163, 175)" // gray-400
        if (showResults) {
          // Check if this is the correct match
          const sentence = activity.sentences[sentenceIndex]
          const isCorrect = word === sentence.word
          color = isCorrect ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)" // green-500 : red-500
        } else {
          color = "rgb(20, 184, 166)" // teal-500
        }

        newLines.push({ sx, sy, ex, ey, color, sentenceIndex })
      }
    })

    setLines(newLines)
  }

  // Update drag line position
  const updateDragLinePosition = (clientX: number, clientY: number) => {
    if (draggedIndex === null || !containerRef.current) return

    const dragCircle = dragCircleRefs.current[draggedIndex]
    if (!dragCircle) return

    const dragRect = dragCircle.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    const sx = dragRect.left + dragRect.width / 2 - containerRect.left
    const sy = dragRect.top + dragRect.height / 2 - containerRect.top
    const ex = clientX - containerRect.left
    const ey = clientY - containerRect.top

    setDragLine({
      sx,
      sy,
      ex,
      ey,
      color: "rgb(156, 163, 175)",
      sentenceIndex: -1,
    })
  }

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, word: string, index: number) => {
    setDraggedWord(word)
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", word)

    // Set drag image to be invisible (we'll show the circle itself)
    if (invisibleDragImage.current) {
      e.dataTransfer.setDragImage(invisibleDragImage.current, 0, 0)
    }

    // Don't set dragPosition here - wait for first drag event to get valid coordinates
  }

  // Handle drag
  const handleDrag = (e: React.DragEvent) => {
    if (e.clientX !== 0 && e.clientY !== 0) {
      updateDragLinePosition(e.clientX, e.clientY)
      // Update drag position for ghost circle
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - containerRect.left
        const y = e.clientY - containerRect.top

        // Only set position if coordinates are valid and within container bounds
        // Add padding of 40px to prevent ghost circle from appearing at edges
        if (x > 40 && y > 40 && x < containerRect.width - 40 && y < containerRect.height - 40) {
          setDragPosition({ x, y })
        }
      }
    }
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, sentenceIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setHoveredDropIndex(sentenceIndex)
  }

  // Handle drag leave
  const handleDragLeave = () => {
    setHoveredDropIndex(null)
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent, sentenceIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    setHoveredDropIndex(null)
    setDragLine(null)
    setDragPosition(null)

    if (draggedWord === null || draggedIndex === null || showResults) return

    // Check if this drop circle is already occupied
    if (matchedSentences.has(sentenceIndex)) return

    const newMatches = new Map(matches)

    // Remove word from any previous match
    const keysToRemove: string[] = []
    for (const [key] of newMatches.entries()) {
      if (key.startsWith(`${draggedIndex}-`)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => newMatches.delete(key))

    // Add new match with composite key
    const matchKey = `${draggedIndex}-${sentenceIndex}`
    newMatches.set(matchKey, draggedWord)
    setMatches(newMatches)
    onAnswersChange(newMatches)

    setDraggedWord(null)
    setDraggedIndex(null)
  }

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedWord(null)
    setDraggedIndex(null)
    setHoveredDropIndex(null)
    setDragLine(null)
    setDragPosition(null)
  }

  // Remove match
  const handleRemoveMatch = (matchKey: string) => {
    if (showResults) return
    const newMatches = new Map(matches)
    newMatches.delete(matchKey)
    setMatches(newMatches)
    onAnswersChange(newMatches)
  }

  // Check if a word index is matched
  const isWordMatched = (wordIndex: number): boolean => {
    return Array.from(matches.keys()).some((key) =>
      key.startsWith(`${wordIndex}-`),
    )
  }

  // Get match for a sentence index
  const getMatchForSentence = (sentenceIndex: number): {
    matchKey: string
    word: string
  } | null => {
    for (const [key, word] of matches.entries()) {
      if (key.endsWith(`-${sentenceIndex}`)) {
        return { matchKey: key, word }
      }
    }
    return null
  }

  // Check if match is correct (for results view)
  const isMatchCorrect = (matchKey: string, word: string): boolean => {
    if (!showResults) return false
    const [, sentenceIndexStr] = matchKey.split("-")
    const sentenceIndex = parseInt(sentenceIndexStr)
    const sentence = activity.sentences[sentenceIndex]
    return word === sentence.word
  }

  // Calculate completion
  const completionCount = matches.size
  const totalCount = activity.sentences.length

  // Ensure we have same number of items on both sides for alignment
  const maxItems = Math.max(activity.match_words.length, activity.sentences.length)

  // Handle reset - clear all matches
  const handleReset = () => {
    setMatches(new Map())
    onAnswersChange(new Map())
    setLines([])
    setDraggedWord(null)
    setDraggedIndex(null)
    setDragLine(null)
  }

  return (
    <div className="flex h-full flex-col p-2">
      {/* Header */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {activity.headerText}
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
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Drag the play icons to match words with images
        </p>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Matched: {completionCount} / {totalCount}
        </div>
      </div>

      {/* Three-column layout with canvas overlay */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-stretch overflow-hidden rounded-lg"
      >
        {/* SVG Canvas for lines */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ zIndex: 1 }}
        >
          {/* Static lines for completed matches */}
          {lines.map((line, index) => (
            <line
              key={index}
              x1={line.sx}
              y1={line.sy}
              x2={line.ex}
              y2={line.ey}
              stroke={line.color}
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}

          {/* Dynamic drag line */}
          {dragLine && (
            <line
              x1={dragLine.sx}
              y1={dragLine.sy}
              x2={dragLine.ex}
              y2={dragLine.ey}
              stroke={dragLine.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="5,5"
            />
          )}
        </svg>

        {/* Ghost circle during drag */}
        {dragPosition && draggedIndex !== null && dragPosition.x > 32 && dragPosition.y > 32 && (
          <div
            className="pointer-events-none absolute flex h-16 w-16 items-center justify-center rounded-full bg-gray-500 transition-none dark:bg-gray-500"
            style={{
              left: `${dragPosition.x - 32}px`,
              top: `${dragPosition.y - 32}px`,
              zIndex: 10,
              willChange: 'transform',
            }}
          >
            <svg
              className="h-10 w-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}

        {/* Content */}
        <div className="flex h-full w-full" style={{ zIndex: 2 }}>
          {/* Left Column: Words with draggable circles */}
          <div className="flex w-2/5 flex-col justify-center gap-2 pr-2" style={{ minHeight: 0 }}>
            {activity.match_words.map((item, index) => {
              const matched = isWordMatched(index)
              const isDragging = draggedIndex === index

              return (
                <div
                  key={index}
                  className="flex min-h-[100px] items-center justify-end gap-3"
                  style={{ height: `${100 / maxItems}%` }}
                >
                  <p className="text-right text-lg font-medium text-gray-900 dark:text-gray-100">
                    {item.word}
                  </p>

                  {/* Drag circle with play icon */}
                  <div
                    ref={(el) => {
                      dragCircleRefs.current[index] = el
                    }}
                    draggable={!matched && !showResults}
                    onDragStart={(e) => !matched && handleDragStart(e, item.word, index)}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    className={`relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full ${
                      matched
                        ? "bg-gray-400 dark:bg-gray-600"
                        : isDragging
                          ? "cursor-grabbing bg-gray-500 opacity-100 dark:bg-gray-500"
                          : "cursor-grab bg-gray-500 hover:bg-gray-400 dark:bg-gray-500 dark:hover:bg-gray-400"
                    }`}
                  >
                    {/* Play icon */}
                    {!matched && (
                      <svg
                        className="h-10 w-10 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Center Column: Empty space for lines */}
          <div className="w-1/5" />

          {/* Right Column: Images/Sentences with drop circles */}
          <div className="flex w-2/5 flex-col justify-center gap-2 pl-2" style={{ minHeight: 0 }}>
            {activity.sentences.map((item, index) => {
              const match = getMatchForSentence(index)
              const isHovered = hoveredDropIndex === index
              const isCorrect = match
                ? isMatchCorrect(match.matchKey, match.word)
                : false

              return (
                <div
                  key={index}
                  className="flex min-h-[100px] items-center gap-3"
                  style={{ height: `${100 / maxItems}%` }}
                  onDragOver={(e) => !match && handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {/* Drop circle */}
                  <div
                    ref={(el) => {
                      dropCircleRefs.current[index] = el
                    }}
                    className="relative flex-shrink-0"
                  >
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
                        isHovered && !match
                          ? "scale-110 bg-teal-300 opacity-50 dark:bg-teal-600"
                          : match
                            ? showResults
                              ? isCorrect
                                ? "bg-green-500"
                                : "bg-red-500"
                              : "bg-teal-500"
                            : "bg-teal-600"
                      }`}
                    />

                    {/* Show play icon if matched */}
                    {match && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          className="h-10 w-10 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}

                    {/* Show result indicator */}
                    {showResults && match && (
                      <div
                        className={`absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white ${
                          isCorrect ? "bg-green-600" : "bg-red-600"
                        }`}
                      >
                        {isCorrect ? "✓" : "✗"}
                      </div>
                    )}

                    {/* Remove button (only when not in results mode) */}
                    {!showResults && match && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMatch(match.matchKey)}
                        className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-sm text-white hover:bg-red-500"
                        aria-label="Remove match"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Image or Text */}
                  <div className="flex flex-1 items-center gap-3">
                    {item.image_path && imageUrls.has(index) ? (
                      <img
                        src={imageUrls.get(index)}
                        alt={`Match option ${index + 1}`}
                        className="h-24 w-24 flex-shrink-0 rounded-lg border-2 border-gray-300 object-cover dark:border-gray-600"
                      />
                    ) : item.image_path ? (
                      <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-teal-600 dark:border-gray-600 dark:border-t-teal-400" />
                      </div>
                    ) : null}

                    {/* Show sentence text if it exists */}
                    {item.sentence && (
                      <p className="text-left text-base text-gray-900 dark:text-gray-100">
                        {item.sentence}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
