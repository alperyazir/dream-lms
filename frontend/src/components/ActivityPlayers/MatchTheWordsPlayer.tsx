/**
 * MatchTheWordsPlayer - Match words/terms with images
 * Story 4.2 - AC 17-19: Canvas/SVG line drawing between matched pairs
 * Follows QML ActivityMatchTheWords.qml pattern
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useSoundContext } from "@/hooks/useSoundEffects"
import type { MatchTheWordsActivity } from "@/lib/mockData"
import { getActivityImageUrl } from "@/services/booksApi"

interface MatchTheWordsPlayerProps {
  activity: MatchTheWordsActivity
  bookId: string // For authenticated image loading
  onAnswersChange: (answers: Map<string, string>) => void
  showResults?: boolean
  correctAnswers?: Set<string>
  initialAnswers?: Map<string, string>
  // Story 9.7: Show correct answers in preview mode
  showCorrectAnswers?: boolean
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
  correctAnswers: _correctAnswers,
  initialAnswers,
  showCorrectAnswers = false,
}: MatchTheWordsPlayerProps) {
  const [matches, setMatches] = useState<Map<string, string>>(
    initialAnswers || new Map(),
  )
  const [draggedWord, setDraggedWord] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [lines, setLines] = useState<LineData[]>([])
  const [dragLine, setDragLine] = useState<LineData | null>(null)
  const [hoveredDropIndex, setHoveredDropIndex] = useState<number | null>(null)
  const [dragPosition, setDragPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [isReturning, setIsReturning] = useState(false)

  // Image loading state
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map())

  const containerRef = useRef<HTMLDivElement>(null)
  const dragCircleRefs = useRef<(HTMLDivElement | null)[]>([])
  const dropCircleRefs = useRef<(HTMLDivElement | null)[]>([])
  const validDropOccurred = useRef(false)
  const { play: playSound } = useSoundContext()

  // Create invisible drag image once
  const invisibleDragImage = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    const img = new Image()
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    invisibleDragImage.current = img
  }, [])

  // Story 9.7: Generate correct matches for preview mode (memoized to prevent infinite loops)
  const correctMatchesForPreview = useMemo(() => {
    const correctMatches = new Map<string, string>()
    activity.sentences.forEach((sentence, sentenceIndex) => {
      // Find the word index in match_words that matches this sentence's correct word
      const wordIndex = activity.match_words.findIndex(
        (w) => w.word === sentence.word,
      )
      if (wordIndex !== -1) {
        const matchKey = `${wordIndex}-${sentenceIndex}`
        correctMatches.set(matchKey, sentence.word)
      }
    })
    return correctMatches
  }, [activity.sentences, activity.match_words])

  // Use correct matches when showing answers, otherwise use user matches
  // Memoized to prevent infinite re-renders when showCorrectAnswers changes
  const displayMatches = useMemo(
    () => (showCorrectAnswers ? correctMatchesForPreview : matches),
    [showCorrectAnswers, correctMatchesForPreview, matches],
  )

  // Get matched items
  const matchedSentences = new Set(
    Array.from(matches.entries()).map(([key]) => {
      const [, sentenceIndexStr] = key.split("-")
      return parseInt(sentenceIndexStr, 10)
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
  }, [bookId, activity.sentences])

  // Cleanup blob URLs on unmount (separate effect to avoid issues)
  useEffect(() => {
    return () => {
      imageUrls.forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [imageUrls])

  // Function to update lines when matches change
  const updateLinesFromMatches = useCallback(() => {
    const newLines: LineData[] = []

    displayMatches.forEach((word, matchKey) => {
      // matchKey format: "wordIndex-sentenceIndex"
      const [wordIndexStr, sentenceIndexStr] = matchKey.split("-")
      const wordIndex = parseInt(wordIndexStr, 10)
      const sentenceIndex = parseInt(sentenceIndexStr, 10)

      if (Number.isNaN(wordIndex) || Number.isNaN(sentenceIndex)) return

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
        } else if (showCorrectAnswers) {
          // Story 9.7: Show all correct matches in green
          color = "rgb(34, 197, 94)" // green-500
        } else {
          color = "rgb(20, 184, 166)" // teal-500
        }

        newLines.push({ sx, sy, ex, ey, color, sentenceIndex })
      }
    })

    setLines(newLines)
  }, [displayMatches, showResults, showCorrectAnswers, activity.sentences])

  // Update lines when matches change - use layout effect to prevent visual jumps
  useLayoutEffect(() => {
    updateLinesFromMatches()
  }, [updateLinesFromMatches])

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
    playSound("drag")
    setDraggedWord(word)
    setDraggedIndex(index)
    validDropOccurred.current = false // Reset flag for new drag
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
        if (
          x > 40 &&
          y > 40 &&
          x < containerRect.width - 40 &&
          y < containerRect.height - 40
        ) {
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

    playSound("drop")
    validDropOccurred.current = true // Mark that a valid drop happened

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
    // If valid drop occurred, just clear state immediately
    if (validDropOccurred.current) {
      setDraggedWord(null)
      setDraggedIndex(null)
      setHoveredDropIndex(null)
      setDragLine(null)
      setDragPosition(null)
      return
    }

    // Invalid drop - trigger return animation
    if (draggedIndex !== null && containerRef.current) {
      const dragCircle = dragCircleRefs.current[draggedIndex]
      if (dragCircle) {
        const dragRect = dragCircle.getBoundingClientRect()
        const containerRect = containerRef.current.getBoundingClientRect()

        const sx = dragRect.left + dragRect.width / 2 - containerRect.left
        const sy = dragRect.top + dragRect.height / 2 - containerRect.top

        // Set return animation state
        setIsReturning(true)

        // Animate drag line back to source
        setDragLine({
          sx,
          sy,
          ex: sx, // Return to source position
          ey: sy,
          color: "rgb(156, 163, 175)",
          sentenceIndex: -1,
        })

        // Animate ghost circle back to source
        setDragPosition({ x: sx, y: sy })

        // Clear state after animation completes (250ms)
        setTimeout(() => {
          setDraggedWord(null)
          setDraggedIndex(null)
          setHoveredDropIndex(null)
          setDragLine(null)
          setDragPosition(null)
          setIsReturning(false)
        }, 250)
      } else {
        // Fallback if circle ref not available
        setDraggedWord(null)
        setDraggedIndex(null)
        setHoveredDropIndex(null)
        setDragLine(null)
        setDragPosition(null)
      }
    } else {
      // Fallback if no drag in progress
      setDraggedWord(null)
      setDraggedIndex(null)
      setHoveredDropIndex(null)
      setDragLine(null)
      setDragPosition(null)
    }
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
  const getMatchForSentence = (
    sentenceIndex: number,
  ): {
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
    const sentenceIndex = parseInt(sentenceIndexStr, 10)
    const sentence = activity.sentences[sentenceIndex]
    return word === sentence.word
  }

  return (
    <div className="flex h-full flex-col p-2">
      {/* Three-column layout with canvas overlay - fills remaining space */}
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 items-stretch overflow-hidden rounded-lg"
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
              style={{
                transition: isReturning
                  ? "x1 0.2s ease-out, y1 0.2s ease-out, x2 0.2s ease-out, y2 0.2s ease-out"
                  : "none",
              }}
            />
          )}
        </svg>

        {/* Ghost circle during drag - responsive size matching drag circles */}
        {dragPosition &&
          draggedIndex !== null &&
          dragPosition.x > 24 &&
          dragPosition.y > 24 && (
            <div
              className="pointer-events-none absolute flex h-10 w-10 items-center justify-center rounded-full bg-gray-500 dark:bg-gray-500 sm:h-12 sm:w-12"
              style={{
                left: `${dragPosition.x - 20}px`,
                top: `${dragPosition.y - 20}px`,
                zIndex: 10,
                transition: isReturning
                  ? "left 0.2s ease-out, top 0.2s ease-out"
                  : "none",
              }}
            >
              <svg
                className="h-6 w-6 text-white sm:h-8 sm:w-8"
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
          <div
            className="flex w-2/5 flex-col justify-around py-2 pr-2"
            style={{ minHeight: 0 }}
          >
            {activity.match_words.map((item, index) => {
              const matched = isWordMatched(index)
              const isDragging = draggedIndex === index

              return (
                <div
                  key={index}
                  className="flex items-center justify-end gap-2"
                >
                  <p className="text-right text-sm font-medium text-gray-900 dark:text-gray-100 sm:text-base">
                    {item.word}
                  </p>

                  {/* Drag circle with play icon - responsive size */}
                  <div
                    ref={(el) => {
                      dragCircleRefs.current[index] = el
                    }}
                    draggable={!matched && !showResults}
                    onDragStart={(e) =>
                      !matched && handleDragStart(e, item.word, index)
                    }
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${
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
                        className="h-6 w-6 text-white sm:h-8 sm:w-8"
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
          <div
            className="flex w-2/5 flex-col justify-around py-2 pl-2"
            style={{ minHeight: 0 }}
          >
            {activity.sentences.map((item, index) => {
              const match = getMatchForSentence(index)
              const isHovered = hoveredDropIndex === index
              const isCorrect = match
                ? isMatchCorrect(match.matchKey, match.word)
                : false

              return (
                <div
                  key={index}
                  className="flex items-center gap-2"
                  onDragOver={(e) => !match && handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {/* Drop circle - responsive size */}
                  <div
                    ref={(el) => {
                      dropCircleRefs.current[index] = el
                    }}
                    className="relative flex-shrink-0"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all sm:h-12 sm:w-12 ${
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
                          className="h-6 w-6 text-white sm:h-8 sm:w-8"
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
                        className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white sm:h-6 sm:w-6 ${
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
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-xs text-white hover:bg-red-500 sm:h-6 sm:w-6"
                        aria-label="Remove match"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Image or Text - responsive image sizing */}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {item.image_path && imageUrls.has(index) ? (
                      <div className="relative aspect-square w-full max-w-[200px] flex-shrink-0">
                        <img
                          src={imageUrls.get(index)}
                          alt={`Match option ${index + 1}`}
                          className="h-full w-full rounded-lg border-2 border-gray-300 object-contain dark:border-gray-600"
                          loading="lazy"
                        />
                      </div>
                    ) : item.image_path ? (
                      <div className="relative aspect-square w-full max-w-[200px] flex-shrink-0">
                        <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-neutral-800">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-teal-600 dark:border-gray-600 dark:border-t-teal-400" />
                        </div>
                      </div>
                    ) : null}

                    {/* Show sentence text if it exists */}
                    {item.sentence && (
                      <p className="truncate text-left text-sm text-gray-900 dark:text-gray-100 sm:text-base">
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
