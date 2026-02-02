import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { ActivityReference } from "@/types/flowbook"

interface FillBlanksProps {
  activity: ActivityReference
}

interface Sentence {
  sentence: string
  sentence_after?: string
  word: string
}

interface BlankState {
  value: string
  isCorrect?: boolean
}

export function FillBlanks({ activity }: FillBlanksProps) {
  const [blanks, setBlanks] = useState<Map<number, BlankState>>(new Map())
  const [showResults, setShowResults] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const clapAudioRef = useRef<HTMLAudioElement | null>(null)

  const config = activity.config as {
    words?: string[]
    sentences?: Sentence[]
    headerText?: string
  }

  const words = config.words || []
  const sentences = config.sentences || []

  useEffect(() => {
    clapAudioRef.current = new Audio("/sounds/clap.mp3")
    clapAudioRef.current.volume = 0.8
    clapAudioRef.current.load()
  }, [])

  useEffect(() => {
    if (sentences.length > 0 && inputRefs.current[0]) {
      inputRefs.current[0]?.focus()
    }
  }, [sentences.length])

  const handleInputChange = (index: number, value: string) => {
    if (showResults) return
    const newBlanks = new Map(blanks)
    newBlanks.set(index, { value })
    setBlanks(newBlanks)
  }

  const handleWordBankClick = (word: string) => {
    if (showResults) return

    const targetIndex = focusedIndex ?? findNextEmptyBlank()
    if (targetIndex === null) return

    const newBlanks = new Map(blanks)
    newBlanks.set(targetIndex, { value: word })
    setBlanks(newBlanks)

    const nextEmpty = findNextEmptyBlank(targetIndex + 1)
    if (nextEmpty !== null) {
      setFocusedIndex(nextEmpty)
      inputRefs.current[nextEmpty]?.focus()
    }
  }

  const findNextEmptyBlank = (startFrom = 0): number | null => {
    for (let i = startFrom; i < sentences.length; i++) {
      const blank = blanks.get(i)
      if (!blank || !blank.value.trim()) {
        return i
      }
    }
    for (let i = 0; i < startFrom; i++) {
      const blank = blanks.get(i)
      if (!blank || !blank.value.trim()) {
        return i
      }
    }
    return null
  }

  const isWordUsed = (word: string): boolean => {
    for (const [, blank] of blanks) {
      if (blank.value.toLowerCase() === word.toLowerCase()) {
        return true
      }
    }
    return false
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
    setBlanks(new Map())
    setShowResults(false)
    setShowCelebration(false)
    setFocusedIndex(null)
    if (inputRefs.current[0]) {
      inputRefs.current[0]?.focus()
    }
  }, [])

  const handleCheckAnswers = useCallback(() => {
    const newBlanks = new Map<number, BlankState>()
    let allCorrect = true

    sentences.forEach((sentence, index) => {
      const blank = blanks.get(index)
      const userAnswer = blank?.value?.trim().toLowerCase() || ""
      const correctAnswer = sentence.word.toLowerCase()
      const isCorrect = userAnswer === correctAnswer

      newBlanks.set(index, {
        value: blank?.value || "",
        isCorrect,
      })

      if (!isCorrect) allCorrect = false
    })

    setBlanks(newBlanks)
    setShowResults(true)

    if (allCorrect && sentences.length > 0) {
      playCelebration()
    }
  }, [blanks, sentences, playCelebration])

  const handleShowAnswers = useCallback(
    (show: boolean) => {
      if (show) {
        const newBlanks = new Map<number, BlankState>()
        sentences.forEach((sentence, index) => {
          newBlanks.set(index, {
            value: sentence.word,
            isCorrect: true,
          })
        })
        setBlanks(newBlanks)
        setShowResults(true)
      } else {
        setBlanks(new Map())
        setShowResults(false)
      }
    },
    [sentences],
  )

  const handleShowNextAnswer = useCallback(() => {
    const newBlanks = new Map(blanks)

    for (let i = 0; i < sentences.length; i++) {
      const blank = blanks.get(i)
      const isCorrect =
        blank?.value?.trim().toLowerCase() === sentences[i].word.toLowerCase()

      if (!isCorrect) {
        newBlanks.set(i, {
          value: sentences[i].word,
          isCorrect: true,
        })
        setBlanks(newBlanks)
        setShowResults(true)
        break
      }
    }
  }, [blanks, sentences])

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

  if (sentences.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">
          No sentences configured for this activity
        </p>
      </div>
    )
  }

  const filledCount = Array.from(blanks.values()).filter((b) =>
    b.value.trim(),
  ).length

  return (
    <div className="relative flex h-full flex-col select-none">
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

      {words.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-slate-100 p-4">
          <span className="w-full text-sm font-medium text-slate-600 mb-2">
            Word Bank:
          </span>
          {words.map((word, i) => {
            const used = isWordUsed(word)
            return (
              <button
                key={i}
                onClick={() => handleWordBankClick(word)}
                disabled={showResults || used}
                className={cn(
                  "rounded-lg bg-white px-4 py-2 text-sm font-medium shadow-sm transition-all",
                  "hover:bg-cyan-50 hover:text-cyan-600 hover:shadow",
                  "disabled:cursor-not-allowed",
                  used && "opacity-40 line-through",
                )}
              >
                {word}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-auto">
        {sentences.map((sentence, index) => {
          const blank = blanks.get(index)
          const isCorrect = blank?.isCorrect

          return (
            <div
              key={index}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-xl p-4 text-lg",
                !showResults && "bg-slate-50",
                showResults && isCorrect && "bg-green-50",
                showResults && isCorrect === false && "bg-red-50",
              )}
            >
              <span className="text-slate-700">{sentence.sentence}</span>

              <div className="relative inline-flex items-center">
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="text"
                  value={blank?.value || ""}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onFocus={() => setFocusedIndex(index)}
                  disabled={showResults}
                  placeholder="..."
                  className={cn(
                    "w-32 border-b-2 bg-transparent px-2 py-1 text-center font-medium",
                    "focus:border-cyan-500 focus:outline-none",
                    !showResults && "border-slate-300",
                    showResults &&
                      isCorrect &&
                      "border-green-500 text-green-700",
                    showResults &&
                      isCorrect === false &&
                      "border-red-500 text-red-700",
                  )}
                />
                {showResults && (
                  <span
                    className={cn(
                      "ml-2 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white",
                      isCorrect ? "bg-green-500" : "bg-red-500",
                    )}
                  >
                    {isCorrect ? "✓" : "✗"}
                  </span>
                )}
              </div>

              {sentence.sentence_after && (
                <span className="text-slate-700">
                  {sentence.sentence_after}
                </span>
              )}

              {showResults && !isCorrect && (
                <span className="ml-2 text-sm text-green-600">
                  (Correct: {sentence.word})
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 shrink-0 rounded-lg bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            {showResults ? (
              <span className="font-medium">
                {Array.from(blanks.values()).filter((b) => b.isCorrect).length}{" "}
                / {sentences.length} correct
              </span>
            ) : (
              <span>
                {filledCount} / {sentences.length} filled
              </span>
            )}
          </span>
          <div className="h-2 w-32 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                showResults ? "bg-green-500" : "bg-cyan-500",
              )}
              style={{ width: `${(filledCount / sentences.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
