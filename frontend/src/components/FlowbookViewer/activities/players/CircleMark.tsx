import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { getPageImageUrl } from "@/services/booksApi"
import type { ActivityReference } from "@/types/flowbook"

interface CircleMarkProps {
  activity: ActivityReference
}

interface Coordinates {
  x: number
  y: number
  w: number
  h: number
}

interface AnswerArea {
  coords: Coordinates
  isCorrect: boolean
  text?: string
  opacity?: number
}

function AnimatedBorder({
  width,
  height,
  type,
}: {
  width: number
  height: number
  type: "circle" | "markwithx"
}) {
  const strokeColor = type === "markwithx" ? "#ef4444" : "#3b82f6"
  const strokeWidth = 4

  const cx = width / 2
  const cy = height / 2
  const rx = cx - strokeWidth / 2
  const ry = cy - strokeWidth / 2

  // Ramanujan's ellipse perimeter approximation
  const a = Math.max(rx, 0)
  const b = Math.max(ry, 0)
  const perimeter =
    Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width="100%"
      height="100%"
      style={{ overflow: "visible" }}
    >
      <ellipse
        cx={cx}
        cy={cy}
        rx={a}
        ry={b}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: perimeter,
          strokeDashoffset: 0,
          animation: "draw-border 0.4s ease-out forwards",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
        }}
      />
      <style>
        {`
          @keyframes draw-border {
            from { stroke-dashoffset: ${perimeter}; }
            to { stroke-dashoffset: 0; }
          }
        `}
      </style>
    </svg>
  )
}

export function CircleMark({ activity }: CircleMarkProps) {
  const [selections, setSelections] = useState<Map<number, number>>(new Map())
  const [showResults, setShowResults] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [imageScale, setImageScale] = useState({ x: 1, y: 1 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const imageRef = useRef<HTMLImageElement>(null)
  const clapAudioRef = useRef<HTMLAudioElement | null>(null)

  const config = activity.config as {
    section_path?: string
    section_image_url?: string
    answer?: AnswerArea[]
    circleCount?: number
    markCount?: number
    headerText?: string
    type?: "circle" | "markwithx"
  }

  const sectionPath = config.section_path || ""
  const sectionImageUrl = config.section_image_url || ""
  const answers = config.answer || []
  const activityType =
    config.type || (activity.type as "circle" | "markwithx") || "circle"

  let effectiveCircleCount = config.circleCount ?? 2
  const isMultiSelectMode = effectiveCircleCount === -1
  if (effectiveCircleCount === 0) {
    effectiveCircleCount = 2
  }

  useEffect(() => {
    clapAudioRef.current = new Audio("/sounds/clap.mp3")
    clapAudioRef.current.volume = 0.8
    clapAudioRef.current.load()
  }, [])

  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    const loadImage = async () => {
      setIsLoading(true)
      setImageError(false)

      const imagePath = sectionImageUrl || sectionPath
      if (!imagePath) {
        setIsLoading(false)
        setImageError(true)
        return
      }

      try {
        const url = await getPageImageUrl(imagePath)
        if (isMounted && url) {
          blobUrl = url
          setImageUrl(url)
          setIsLoading(false)
        } else if (isMounted) {
          setImageError(true)
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Failed to load activity image:", error)
        if (isMounted) {
          setImageError(true)
          setIsLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      isMounted = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [sectionImageUrl, sectionPath])

  const updateImageScale = useCallback(() => {
    const img = imageRef.current
    if (!img || !img.complete || img.naturalWidth === 0) return

    requestAnimationFrame(() => {
      const imgRect = img.getBoundingClientRect()
      if (imgRect.width === 0 || imgRect.height === 0) return

      const xScale = imgRect.width / img.naturalWidth
      const yScale = imgRect.height / img.naturalHeight

      setImageScale({ x: xScale, y: yScale })
      setImageLoaded(true)
    })
  }, [])

  useEffect(() => {
    const img = imageRef.current
    if (img) {
      if (img.complete) {
        updateImageScale()
      } else {
        img.addEventListener("load", updateImageScale)
      }
    }

    window.addEventListener("resize", updateImageScale)
    return () => {
      window.removeEventListener("resize", updateImageScale)
      if (img) {
        img.removeEventListener("load", updateImageScale)
      }
    }
  }, [updateImageScale])

  const handleAreaClick = (answerIndex: number) => {
    if (showResults) return

    const newSelections = new Map(selections)

    if (isMultiSelectMode) {
      const wasSelected = Array.from(newSelections.values()).includes(
        answerIndex,
      )
      if (wasSelected) {
        for (const [qIdx, aIdx] of newSelections.entries()) {
          if (aIdx === answerIndex) {
            newSelections.delete(qIdx)
            break
          }
        }
      } else {
        const nextQIdx = newSelections.size
        newSelections.set(nextQIdx, answerIndex)
      }
    } else {
      const questionIndex = Math.floor(answerIndex / effectiveCircleCount)

      if (newSelections.get(questionIndex) === answerIndex) {
        newSelections.delete(questionIndex)
      } else {
        newSelections.set(questionIndex, answerIndex)
      }
    }

    setSelections(newSelections)
  }

  const getQuestionIndex = (answerIndex: number): number => {
    if (isMultiSelectMode) return 0
    return Math.floor(answerIndex / effectiveCircleCount)
  }

  const isSelected = (answerIndex: number): boolean => {
    return Array.from(selections.values()).includes(answerIndex)
  }

  const isAnswerCorrect = (answerIndex: number): boolean => {
    return answers[answerIndex]?.isCorrect === true
  }

  const getScaledCoords = (answerIndex: number) => {
    const answer = answers[answerIndex]
    if (!answer) return { left: 0, top: 0, width: 0, height: 0 }
    return {
      left: answer.coords.x * imageScale.x,
      top: answer.coords.y * imageScale.y,
      width: answer.coords.w * imageScale.x,
      height: answer.coords.h * imageScale.y,
    }
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
    setSelections(new Map())
    setShowResults(false)
    setShowCelebration(false)
  }, [])

  const handleCheckAnswers = useCallback(() => {
    setShowResults(true)

    const correctAnswerIndices = answers
      .map((a, i) => (a.isCorrect ? i : -1))
      .filter((i) => i !== -1)

    const selectedIndices = Array.from(selections.values())

    const allCorrectSelected = correctAnswerIndices.every((i) =>
      selectedIndices.includes(i),
    )
    const noIncorrectSelected = selectedIndices.every(
      (i) => answers[i]?.isCorrect,
    )

    if (
      allCorrectSelected &&
      noIncorrectSelected &&
      selectedIndices.length > 0
    ) {
      playCelebration()
    }
  }, [answers, selections, playCelebration])

  const handleShowAnswers = useCallback(
    (show: boolean) => {
      if (show) {
        const correctSelections = new Map<number, number>()
        answers.forEach((answer, index) => {
          if (answer.isCorrect) {
            if (isMultiSelectMode) {
              correctSelections.set(correctSelections.size, index)
            } else {
              const questionIndex = Math.floor(index / effectiveCircleCount)
              correctSelections.set(questionIndex, index)
            }
          }
        })
        setSelections(correctSelections)
        setShowResults(true)
      } else {
        setSelections(new Map())
        setShowResults(false)
      }
    },
    [answers, effectiveCircleCount, isMultiSelectMode],
  )

  const handleShowNextAnswer = useCallback(() => {
    const correctAnswerIndices = answers
      .map((a, i) => (a.isCorrect ? i : -1))
      .filter((i) => i !== -1)

    const selectedIndices = Array.from(selections.values())

    for (const correctIndex of correctAnswerIndices) {
      if (!selectedIndices.includes(correctIndex)) {
        const newSelections = new Map(selections)
        if (isMultiSelectMode) {
          newSelections.set(newSelections.size, correctIndex)
        } else {
          const questionIndex = Math.floor(correctIndex / effectiveCircleCount)
          newSelections.set(questionIndex, correctIndex)
        }
        setSelections(newSelections)
        setShowResults(true)
        break
      }
    }
  }, [answers, selections, effectiveCircleCount, isMultiSelectMode])

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

  if ((!sectionPath && !sectionImageUrl) || answers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">No activity configured</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-cyan-500" />
      </div>
    )
  }

  if (imageError || !imageUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-slate-500">Failed to load activity image</p>
        <p className="text-xs text-slate-400">
          {sectionImageUrl || sectionPath || "No image path"}
        </p>
      </div>
    )
  }

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

      <div className="flex flex-1 items-center justify-center overflow-auto rounded-lg bg-slate-100 p-2">
        {imageUrl && !imageLoaded && (
          <div className="absolute flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-cyan-500" />
          </div>
        )}
        {imageUrl && (
          <div
            className="relative"
            style={{
              opacity: imageLoaded ? 1 : 0,
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Activity"
              className="max-h-[calc(100vh-220px)] max-w-full"
              style={{
                display: "block",
              }}
              onLoad={updateImageScale}
            />

            {imageLoaded &&
              answers.map((_, answerIndex) => {
                const selected = isSelected(answerIndex)
                const correct = isAnswerCorrect(answerIndex)
                const scaledCoords = getScaledCoords(answerIndex)
                const questionIndex = getQuestionIndex(answerIndex)

                return (
                  <button
                    type="button"
                    key={answerIndex}
                    onClick={() => handleAreaClick(answerIndex)}
                    disabled={showResults}
                    className={cn(
                      "absolute rounded-full transition-colors duration-200 box-border",
                      !showResults &&
                        !selected &&
                        "cursor-pointer border-2 border-dashed border-slate-400 bg-white/20 hover:border-slate-500 hover:bg-white/40",
                      !showResults &&
                        selected &&
                        (activityType === "markwithx"
                          ? "cursor-pointer border-transparent bg-red-50/60"
                          : "cursor-pointer border-transparent bg-blue-50/60"),
                      showResults &&
                        selected &&
                        correct &&
                        "border-2 border-green-500 bg-green-500/30",
                      showResults &&
                        selected &&
                        !correct &&
                        "border-2 border-red-500 bg-red-500/30",
                      showResults &&
                        !selected &&
                        "border-2 border-slate-300 bg-white/20",
                    )}
                    style={{
                      left: scaledCoords.left,
                      top: scaledCoords.top,
                      width: scaledCoords.width,
                      height: scaledCoords.height,
                      pointerEvents: showResults ? "none" : "auto",
                    }}
                    aria-label={`Question ${questionIndex + 1}, Option ${(answerIndex % effectiveCircleCount) + 1}${selected ? " (selected)" : ""}`}
                  >
                    {selected && !showResults && (
                      <AnimatedBorder
                        width={scaledCoords.width}
                        height={scaledCoords.height}
                        type={activityType}
                      />
                    )}

                    {showResults && selected && (
                      <div
                        className={cn(
                          "absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold shadow-lg",
                          correct
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white",
                        )}
                      >
                        {correct ? "✓" : "✗"}
                      </div>
                    )}
                  </button>
                )
              })}
          </div>
        )}

        {(!imageUrl || !imageLoaded) && (
          <div className="flex items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-cyan-500" />
          </div>
        )}
      </div>
    </div>
  )
}
