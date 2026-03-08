/**
 * ActivityReviewRenderer - Purpose-built review UI for each activity type
 *
 * Shows student answers vs correct answers in a clean, readable format.
 * Does NOT embed the actual activity players - uses custom review layouts instead.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle, Search, XCircle } from "lucide-react"
import type {
  CircleActivity,
  DragDropPictureActivity,
  DragDropPictureGroupActivity,
  MatchTheWordsActivity,
  PuzzleFindWordsActivity,
} from "@/lib/mockData"
import { getActivityImageUrl } from "@/services/booksApi"
import type { ActivityScoreItem } from "@/types/assignment"

// Activity types that support visual review
const VISUAL_REVIEW_TYPES = new Set([
  "dragdroppicture",
  "dragdroppicturegroup",
  "circle",
  "markwithx",
  "matchthewords",
  "puzzlefindwords",
])

export function supportsVisualReview(activityType: string): boolean {
  return VISUAL_REVIEW_TYPES.has(activityType.toLowerCase())
}

/**
 * Resolve item IDs ("item-0") back to text using words array
 */
function resolveItemId(value: string, words: string[]): string {
  const match = value.match(/^item-(\d+)$/)
  if (match) {
    const index = parseInt(match[1], 10)
    return words[index] ?? value
  }
  return value
}

// --- Shared components ---

function ReviewRow({
  label,
  studentAnswer,
  correctAnswer,
  isCorrect,
}: {
  label: string
  studentAnswer: string
  correctAnswer: string
  isCorrect: boolean
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-md p-3 text-sm ${
        isCorrect
          ? "bg-green-50 dark:bg-green-950/30"
          : "bg-red-50 dark:bg-red-950/30"
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isCorrect ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        <div className="mt-1 space-y-0.5">
          <p>
            <span className="text-muted-foreground">Your answer: </span>
            <span
              className={
                isCorrect
                  ? "text-green-700 dark:text-green-400 font-medium"
                  : "text-red-700 dark:text-red-400 line-through"
              }
            >
              {studentAnswer || "—"}
            </span>
          </p>
          {!isCorrect && (
            <p>
              <span className="text-muted-foreground">Correct: </span>
              <span className="text-green-700 dark:text-green-400 font-medium">
                {correctAnswer}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// --- DragDrop review with answers overlaid on image ---

function DragDropReview({
  config,
  responseData,
  bookId,
}: {
  config: DragDropPictureActivity | DragDropPictureGroupActivity
  responseData: Record<string, any>
  bookId: string
}) {
  const rawAnswers = responseData.answers || responseData
  const isGroup = "group" in (config.answer[0] || {})
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imageScale, setImageScale] = useState({ x: 1, y: 1 })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getActivityImageUrl(bookId, config.section_path).then(setImgUrl).catch(() => {})
  }, [bookId, config.section_path])

  // Width-based scaling: image fills full width, height adjusts naturally
  const updateScale = useCallback(() => {
    const img = imageRef.current
    if (!img) return
    const scale = img.clientWidth / img.naturalWidth
    setImageScale({ x: scale, y: scale })
  }, [])

  // Re-calc on resize
  useEffect(() => {
    window.addEventListener("resize", updateScale)
    return () => window.removeEventListener("resize", updateScale)
  }, [updateScale])

  // Build review data for each drop zone
  const zones = config.answer.map((ans) => {
    const dropZoneId = `${ans.coords.x}-${ans.coords.y}`
    const rawVal = rawAnswers[dropZoneId]
    const studentText = rawVal ? resolveItemId(String(rawVal), config.words) : ""
    const correctText = isGroup
      ? (ans as any).group?.[0] ?? "?"
      : (ans as any).text ?? "?"
    const isCorrect = isGroup
      ? !!studentText && (ans as any).group?.includes(studentText)
      : studentText.trim().toLowerCase() === correctText.trim().toLowerCase()
    return { coords: ans.coords, studentText, correctText, isCorrect }
  })

  if (!imgUrl) return null

  return (
    <div ref={containerRef} className="relative rounded-lg border bg-white dark:bg-neutral-900 overflow-auto max-h-[400px]">
      <img
        ref={imageRef}
        src={imgUrl}
        alt="Activity"
        className="w-full h-auto block"
        onLoad={updateScale}
      />
      {/* Overlay answer labels on the image */}
      {zones.map((zone, idx) => {
        const left = zone.coords.x * imageScale.x
        const top = zone.coords.y * imageScale.y
        const width = Math.max(zone.coords.w * imageScale.x, 60)
        const height = zone.coords.h * imageScale.y

        return (
          <div
            key={idx}
            className="absolute flex flex-col items-center justify-center"
            style={{ left, top, width, minHeight: height }}
          >
            {zone.isCorrect ? (
              <div className="rounded border-2 border-green-500 bg-green-100/95 px-2 py-0.5 text-center shadow-sm">
                <span className="text-xs font-bold text-green-800">{zone.studentText}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                {zone.studentText && (
                  <div className="rounded border-2 border-red-400 bg-red-100/95 px-2 py-0.5 text-center shadow-sm">
                    <span className="text-xs font-bold text-red-700 line-through">{zone.studentText}</span>
                  </div>
                )}
                <div className="rounded border-2 border-green-500 bg-green-100/95 px-2 py-0.5 text-center shadow-sm">
                  <span className="text-xs font-bold text-green-800">{zone.correctText}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// --- Circle / MarkWithX review (overlay on image) ---

function CircleReview({
  config,
  responseData,
  bookId,
}: {
  config: CircleActivity
  responseData: Record<string, any>
  bookId: string
}) {
  const rawAnswers = responseData.answers || responseData
  const circleCount = config.circleCount ?? 2
  const effectiveCircleCount = circleCount === 0 ? 2 : circleCount
  const isMultiSelect = circleCount === -1

  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    getActivityImageUrl(bookId, config.section_path).then(setImgUrl).catch(() => {})
  }, [bookId, config.section_path])

  const updateScale = useCallback(() => {
    const img = imageRef.current
    if (!img) return
    setScale(img.clientWidth / img.naturalWidth)
  }, [])

  useEffect(() => {
    window.addEventListener("resize", updateScale)
    return () => window.removeEventListener("resize", updateScale)
  }, [updateScale])

  // Build per-option status: selected by student? is it the correct one?
  const selectedSet = new Set<number>()
  if (isMultiSelect) {
    for (const key of Object.keys(rawAnswers)) {
      selectedSet.add(parseInt(key, 10))
    }
  } else {
    // Question grouping: rawAnswers is {questionIdx: selectedAbsoluteIdx}
    for (const val of Object.values(rawAnswers)) {
      selectedSet.add(val as number)
    }
  }

  // For question grouping, find correct answer per question to mark missed ones
  const correctSet = new Set<number>()
  if (isMultiSelect) {
    config.answer.forEach((a, i) => { if (a.isCorrect) correctSet.add(i) })
  } else {
    const questionCount = Math.ceil(config.answer.length / effectiveCircleCount)
    for (let qi = 0; qi < questionCount; qi++) {
      const start = qi * effectiveCircleCount
      const end = Math.min(start + effectiveCircleCount, config.answer.length)
      for (let ai = start; ai < end; ai++) {
        if (config.answer[ai].isCorrect) {
          correctSet.add(ai)
          break
        }
      }
    }
  }

  if (!imgUrl) return null

  return (
    <div className="relative rounded-lg border bg-white dark:bg-neutral-900 overflow-auto max-h-[400px]">
      <img
        ref={imageRef}
        src={imgUrl}
        alt="Activity"
        className="w-full h-auto block"
        onLoad={updateScale}
      />
      {config.answer.map((ans, idx) => {
        const isSelected = selectedSet.has(idx)
        const isCorrectOption = correctSet.has(idx)
        // Skip options that weren't selected and aren't the correct answer
        if (!isSelected && !isCorrectOption) return null

        const left = ans.coords.x * scale
        const top = ans.coords.y * scale
        const w = (ans.coords as any).w ? (ans.coords as any).w * scale : 40
        const h = (ans.coords as any).h ? (ans.coords as any).h * scale : 40

        let borderClass: string
        if (isSelected && isCorrectOption) {
          // Student picked the right one - green
          borderClass = "border-green-500 bg-green-400/30"
        } else if (isSelected && !isCorrectOption) {
          // Student picked wrong - red
          borderClass = "border-red-500 bg-red-400/30"
        } else {
          // Correct answer student missed - green dashed
          borderClass = "border-green-500 border-dashed bg-green-400/20"
        }

        // Icon label: position at top-right corner of the circle
        const iconClass = (isSelected && isCorrectOption)
          ? "bg-green-500 text-white"
          : (isSelected && !isCorrectOption)
            ? "bg-red-500 text-white"
            : "bg-green-500 text-white"
        const iconText = (isSelected && isCorrectOption)
          ? "✓"
          : (isSelected && !isCorrectOption)
            ? "✗"
            : "✓"

        return (
          <div
            key={idx}
            className={`absolute rounded-full border-4 pointer-events-none ${borderClass}`}
            style={{ left, top, width: w, height: h }}
          >
            <div className={`absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold shadow ${iconClass}`}>
              {iconText}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- MatchTheWords review ---

function MatchWordsReview({
  config,
  responseData,
}: {
  config: MatchTheWordsActivity
  responseData: Record<string, any>
}) {
  const rawAnswers = responseData.answers || responseData

  // Reconstruct student matches per sentence
  const studentMatchBySentence = new Map<number, string>()
  for (const [key, wordText] of Object.entries(rawAnswers)) {
    const parts = key.split("-")
    if (parts.length >= 2) {
      const sentIdx = parseInt(parts[0], 10)
      studentMatchBySentence.set(sentIdx, String(wordText))
    }
  }

  return (
    <div className="space-y-2">
      {config.sentences.map((sentence, idx) => {
        const studentWord = studentMatchBySentence.get(idx) ?? ""
        const correctWord = sentence.word
        const isCorrect =
          studentWord.trim().toLowerCase() === correctWord.trim().toLowerCase()

        return (
          <ReviewRow
            key={idx}
            label={sentence.sentence}
            studentAnswer={studentWord}
            correctAnswer={correctWord}
            isCorrect={isCorrect}
          />
        )
      })}
    </div>
  )
}

// --- PuzzleFindWords review ---

function PuzzleFindWordsReview({
  config,
  responseData,
}: {
  config: PuzzleFindWordsActivity
  responseData: Record<string, any>
}) {
  const rawAnswers = responseData.answers || responseData
  const wordsArray: string[] = Array.isArray(rawAnswers)
    ? rawAnswers
    : rawAnswers.words || []
  const foundWords = new Set(wordsArray.map((w: string) => w.toLowerCase()))

  return (
    <div className="space-y-2">
      {config.words.map((word, idx) => {
        const found = foundWords.has(word.toLowerCase())
        return (
          <div
            key={idx}
            className={`flex items-center gap-3 rounded-md p-3 text-sm ${
              found
                ? "bg-green-50 dark:bg-green-950/30"
                : "bg-red-50 dark:bg-red-950/30"
            }`}
          >
            {found ? (
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            ) : (
              <Search className="h-4 w-4 text-red-600 flex-shrink-0" />
            )}
            <span className={found ? "text-green-700 dark:text-green-400 font-medium" : "text-red-700 dark:text-red-400"}>
              {word}
            </span>
            <span className="text-muted-foreground text-xs ml-auto">
              {found ? "Found" : "Missed"}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// --- Main renderer ---

interface ActivityReviewRendererProps {
  activity: ActivityScoreItem
  bookId: number | string
}

export function ActivityReviewRenderer({
  activity,
  bookId,
}: ActivityReviewRendererProps) {
  const config = activity.config_json
  const responseData = activity.response_data
  const activityType = activity.activity_type.toLowerCase()
  const bookIdStr = String(bookId)

  if (!config || !responseData) {
    return (
      <p className="text-sm text-muted-foreground italic p-4">
        Review data not available.
      </p>
    )
  }

  return (
    <div className="border-t pt-3 space-y-2">
      {(activityType === "dragdroppicture" ||
        activityType === "dragdroppicturegroup") && (
        <DragDropReview
          config={config as unknown as DragDropPictureActivity}
          responseData={responseData}
          bookId={bookIdStr}
        />
      )}
      {(activityType === "circle" || activityType === "markwithx") && (
        <CircleReview
          config={config as unknown as CircleActivity}
          responseData={responseData}
          bookId={bookIdStr}
        />
      )}
      {activityType === "matchthewords" && (
        <MatchWordsReview
          config={config as unknown as MatchTheWordsActivity}
          responseData={responseData}
        />
      )}
      {activityType === "puzzlefindwords" && (
        <PuzzleFindWordsReview
          config={config as unknown as PuzzleFindWordsActivity}
          responseData={responseData}
        />
      )}
    </div>
  )
}
