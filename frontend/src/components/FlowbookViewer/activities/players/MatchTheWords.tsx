import { Play } from "lucide-react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { cn } from "@/lib/utils"
import type { ActivityReference } from "@/types/flowbook"

interface MatchTheWordsProps {
  activity: ActivityReference
}

interface MatchWord {
  word: string
  image?: string
  image_path?: string
}

interface Sentence {
  sentence: string
  sentence_after?: string
  word: string
  audio?: string
  image?: string
  image_path?: string
}

interface LineData {
  sx: number
  sy: number
  ex: number
  ey: number
  color: string
}

export function MatchTheWords({ activity }: MatchTheWordsProps) {
  const [matches, setMatches] = useState<Map<string, string>>(new Map())
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [lines, setLines] = useState<LineData[]>([])
  const [dragLine, setDragLine] = useState<LineData | null>(null)
  const [dragPosition, setDragPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [hoveredDropIndex, setHoveredDropIndex] = useState<number | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragCircleRefs = useRef<(HTMLDivElement | null)[]>([])
  const dropCircleRefs = useRef<(HTMLDivElement | null)[]>([])
  const invisibleDragImage = useRef<HTMLImageElement | null>(null)
  const clapAudioRef = useRef<HTMLAudioElement | null>(null)

  const config = activity.config as {
    match_words?: MatchWord[]
    sentences?: Sentence[]
    headerText?: string
  }

  const matchWords = useMemo(
    () => config.match_words || [],
    [config.match_words],
  )
  const sentences = useMemo(() => config.sentences || [], [config.sentences])

  useEffect(() => {
    const img = new Image()
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    invisibleDragImage.current = img
  }, [])

  useEffect(() => {
    clapAudioRef.current = new Audio("/sounds/clap.mp3")
    clapAudioRef.current.volume = 0.8
    clapAudioRef.current.load()
  }, [])

  const updateLinesFromMatches = useCallback(() => {
    const newLines: LineData[] = []

    matches.forEach((word, matchKey) => {
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

        let color = "#a855f7"
        if (showResults) {
          const sentence = sentences[sentenceIndex]
          const isCorrect = word === sentence?.word
          color = isCorrect ? "#22c55e" : "#ef4444"
        }

        newLines.push({ sx, sy, ex, ey, color })
      }
    })

    setLines(newLines)
  }, [matches, showResults, sentences])

  useLayoutEffect(() => {
    updateLinesFromMatches()
  }, [updateLinesFromMatches])

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

    setDragLine({ sx, sy, ex, ey, color: "#94a3b8" })
  }

  const handleDragStart = (e: React.DragEvent, word: string, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", word)

    if (invisibleDragImage.current) {
      e.dataTransfer.setDragImage(invisibleDragImage.current, 0, 0)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    if (e.clientX !== 0 && e.clientY !== 0) {
      updateDragLinePosition(e.clientX, e.clientY)
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - containerRect.left
        const y = e.clientY - containerRect.top
        if (
          x > 20 &&
          y > 20 &&
          x < containerRect.width - 20 &&
          y < containerRect.height - 20
        ) {
          setDragPosition({ x, y })
        }
      }
    }
  }

  const handleDragOver = (e: React.DragEvent, sentenceIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setHoveredDropIndex(sentenceIndex)
  }

  const handleDragLeave = () => {
    setHoveredDropIndex(null)
  }

  const handleDrop = (e: React.DragEvent, sentenceIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    setHoveredDropIndex(null)
    setDragLine(null)
    setDragPosition(null)

    if (draggedIndex === null || showResults) return

    const isAlreadyMatched = Array.from(matches.keys()).some((key) =>
      key.endsWith(`-${sentenceIndex}`),
    )
    if (isAlreadyMatched) return

    const word = matchWords[draggedIndex]?.word
    if (!word) return

    const newMatches = new Map(matches)

    for (const key of newMatches.keys()) {
      if (key.startsWith(`${draggedIndex}-`)) {
        newMatches.delete(key)
      }
    }

    const matchKey = `${draggedIndex}-${sentenceIndex}`
    newMatches.set(matchKey, word)
    setMatches(newMatches)

    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setHoveredDropIndex(null)
    setDragLine(null)
    setDragPosition(null)
  }

  const handleRemoveMatch = (matchKey: string) => {
    if (showResults) return
    const newMatches = new Map(matches)
    newMatches.delete(matchKey)
    setMatches(newMatches)
  }

  const isWordMatched = (wordIndex: number): boolean => {
    return Array.from(matches.keys()).some((key) =>
      key.startsWith(`${wordIndex}-`),
    )
  }

  const getMatchForSentence = (
    sentenceIndex: number,
  ): { matchKey: string; word: string } | null => {
    for (const [key, word] of matches.entries()) {
      if (key.endsWith(`-${sentenceIndex}`)) {
        return { matchKey: key, word }
      }
    }
    return null
  }

  const isMatchCorrect = (matchKey: string, word: string): boolean => {
    const [, sentenceIndexStr] = matchKey.split("-")
    const sentenceIndex = parseInt(sentenceIndexStr, 10)
    const sentence = sentences[sentenceIndex]
    return word === sentence?.word
  }

  const playCelebration = useCallback(() => {
    setShowCelebration(true)
    if (clapAudioRef.current) {
      clapAudioRef.current.currentTime = 0
      clapAudioRef.current.play().catch(() => {})
      setTimeout(() => {
        if (clapAudioRef.current) {
          clapAudioRef.current.pause()
          clapAudioRef.current.currentTime = 0
        }
      }, 1500)
    }
    setTimeout(() => setShowCelebration(false), 3000)
  }, [])

  const handleReset = useCallback(() => {
    setMatches(new Map())
    setShowResults(false)
    setShowCelebration(false)
  }, [])

  const handleCheckAnswers = useCallback(() => {
    setShowResults(true)

    let allCorrect = true
    if (matches.size !== sentences.length) {
      allCorrect = false
    } else {
      for (const [key, word] of matches.entries()) {
        if (!isMatchCorrect(key, word)) {
          allCorrect = false
          break
        }
      }
    }
    if (allCorrect && matches.size > 0) {
      playCelebration()
    }
  }, [matches, sentences.length, playCelebration, isMatchCorrect])

  const handleShowAnswers = useCallback(
    (show: boolean) => {
      if (show) {
        const correctMatches = new Map<string, string>()
        sentences.forEach((sentence, sentenceIndex) => {
          const wordIndex = matchWords.findIndex(
            (w) => w.word === sentence.word,
          )
          if (wordIndex !== -1) {
            correctMatches.set(`${wordIndex}-${sentenceIndex}`, sentence.word)
          }
        })
        setMatches(correctMatches)
        setShowResults(true)
      } else {
        setMatches(new Map())
        setShowResults(false)
      }
    },
    [sentences, matchWords],
  )

  const handleShowNextAnswer = useCallback(() => {
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      const existingMatch = getMatchForSentence(i)
      const correctWordIndex = matchWords.findIndex(
        (w) => w.word === sentence.word,
      )

      if (!existingMatch || existingMatch.word !== sentence.word) {
        const newMatches = new Map(matches)
        for (const key of newMatches.keys()) {
          if (key.endsWith(`-${i}`)) {
            newMatches.delete(key)
          }
        }
        newMatches.set(`${correctWordIndex}-${i}`, sentence.word)
        setMatches(newMatches)
        setShowResults(true)
        break
      }
    }
  }, [matches, sentences, matchWords, getMatchForSentence])

  useEffect(() => {
    const win = window as unknown as {
      __activityReset?: () => void
      __activityCheckAnswers?: () => void
      __activityShowAnswers?: (show: boolean) => void
      __activityShowNextAnswer?: () => void
    }
    win.__activityReset = handleReset
    win.__activityCheckAnswers = handleCheckAnswers
    win.__activityShowAnswers = handleShowAnswers
    win.__activityShowNextAnswer = handleShowNextAnswer
    return () => {
      delete win.__activityReset
      delete win.__activityCheckAnswers
      delete win.__activityShowAnswers
      delete win.__activityShowNextAnswer
    }
  }, [handleReset, handleCheckAnswers, handleShowAnswers, handleShowNextAnswer])

  if (sentences.length === 0 || matchWords.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">No items configured for this activity</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full flex-col items-center justify-center overflow-hidden select-none"
    >
      {showCelebration && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${5 + ((i * 2) % 90)}%`,
                top: "-20px",
                animationDelay: `${(i % 10) * 0.1}s`,
                animationDuration: `${2 + (i % 3) * 0.5}s`,
                backgroundColor: [
                  "#fbbf24",
                  "#34d399",
                  "#60a5fa",
                  "#f472b6",
                  "#a78bfa",
                  "#f87171",
                  "#4ade80",
                ][i % 7],
                width: `${8 + (i % 3) * 4}px`,
                height: `${8 + (i % 3) * 4}px`,
                borderRadius: i % 2 === 0 ? "50%" : "2px",
              }}
            />
          ))}
        </div>
      )}

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 10 }}
      >
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
        {dragLine && (
          <line
            x1={dragLine.sx}
            y1={dragLine.sy}
            x2={dragLine.ex}
            y2={dragLine.ey}
            stroke={dragLine.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="8,4"
          />
        )}
      </svg>

      {dragPosition && draggedIndex !== null && (
        <div
          className="pointer-events-none absolute flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500 shadow-lg"
          style={{
            left: `${dragPosition.x - 20}px`,
            top: `${dragPosition.y - 20}px`,
            zIndex: 30,
          }}
        >
          <Play className="h-5 w-5 text-white fill-current" />
        </div>
      )}

      <div className="flex w-full max-w-4xl gap-8 px-4 py-4">
        <div className="flex flex-1 flex-col gap-3">
          {matchWords.map((item, index) => {
            const matched = isWordMatched(index)
            const isDragging = draggedIndex === index
            const imageSrc = item.image || item.image_path
            const hasImage = !!imageSrc

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3",
                  hasImage && "py-2",
                  showResults &&
                    matched &&
                    isMatchCorrect(
                      Array.from(matches.keys()).find((k) =>
                        k.startsWith(`${index}-`),
                      ) || "",
                      item.word,
                    ) &&
                    "bg-green-50",
                  showResults &&
                    matched &&
                    !isMatchCorrect(
                      Array.from(matches.keys()).find((k) =>
                        k.startsWith(`${index}-`),
                      ) || "",
                      item.word,
                    ) &&
                    "bg-red-50",
                )}
              >
                <div className="flex flex-1 items-center gap-3">
                  {hasImage ? (
                    <img
                      src={imageSrc}
                      alt={item.word}
                      className="h-16 w-16 rounded-lg object-contain"
                    />
                  ) : (
                    <span className="font-medium text-slate-700">
                      {item.word}
                    </span>
                  )}
                </div>
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
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full transition-all select-none",
                    matched
                      ? "bg-slate-400 cursor-default"
                      : isDragging
                        ? "bg-cyan-600 cursor-grabbing opacity-50"
                        : "bg-cyan-500 cursor-grab hover:bg-cyan-600 hover:scale-110",
                  )}
                  style={{ zIndex: 15 }}
                >
                  {!matched && (
                    <Play className="w-5 h-5 text-white fill-current" />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          {sentences.map((item, index) => {
            const match = getMatchForSentence(index)
            const isHovered = hoveredDropIndex === index
            const isCorrect = match
              ? isMatchCorrect(match.matchKey, match.word)
              : false
            const imageSrc = item.image || item.image_path
            const hasImage = !!imageSrc

            return (
              <div
                key={index}
                onDragOver={(e) => !match && handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 transition-colors",
                  hasImage && "py-2",
                  isHovered && !match && "bg-slate-100",
                  showResults && match && isCorrect && "bg-green-50",
                  showResults && match && !isCorrect && "bg-red-50",
                )}
              >
                <div
                  ref={(el) => {
                    dropCircleRefs.current[index] = el
                  }}
                  onClick={() => match && handleRemoveMatch(match.matchKey)}
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full transition-all",
                    isHovered && !match && "scale-110 bg-cyan-300",
                    match
                      ? showResults
                        ? isCorrect
                          ? "bg-green-500"
                          : "bg-red-500"
                        : "bg-cyan-500 cursor-pointer hover:bg-cyan-600"
                      : "bg-cyan-500",
                  )}
                  style={{ zIndex: 15 }}
                >
                  {match && (
                    <Play className="w-5 h-5 text-white fill-current" />
                  )}
                </div>
                <div className="flex flex-1 items-center gap-3">
                  {hasImage ? (
                    <img
                      src={imageSrc}
                      alt={item.sentence || item.word}
                      className="h-16 w-16 rounded-lg object-contain"
                    />
                  ) : (
                    <span className="font-medium text-slate-700">
                      {item.sentence}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
