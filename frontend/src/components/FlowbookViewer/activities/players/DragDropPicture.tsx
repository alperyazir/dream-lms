import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { getPageImageUrl } from "@/services/booksApi"
import type { ActivityReference } from "@/types/flowbook"

interface DragDropPictureProps {
  activity: ActivityReference
}

interface DropZone {
  coords: { x: number; y: number; w: number; h: number }
  text?: string
  opacity?: number
}

interface DCSConfig {
  words?: string[]
  section_path?: string
  section_image_url?: string
  headerText?: string
  dropZones?: DropZone[]
  answer?: DropZone[]
}

type Placements = Record<string, string>

export function DragDropPicture({ activity }: DragDropPictureProps) {
  const [placements, setPlacements] = useState<Placements>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [isShowingAnswers, setIsShowingAnswers] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const clapAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    clapAudioRef.current = new Audio("/sounds/clap.mp3")
    clapAudioRef.current.volume = 0.8
    clapAudioRef.current.load()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  )

  const handleReturnToBank = useCallback(
    (wordId: string) => {
      if (showResults) return
      setPlacements((prev) => {
        const newPlacements = { ...prev }
        Object.keys(newPlacements).forEach((key) => {
          if (newPlacements[key] === wordId) {
            delete newPlacements[key]
          }
        })
        return newPlacements
      })
    },
    [showResults],
  )

  const config = activity.config as DCSConfig

  const words = (config.words || []).map((word, index) => ({
    id: `word-${index}`,
    text: word.trim(),
  }))

  const dropZones = (config.dropZones || config.answer || []).map(
    (zone, index) => ({
      id: `zone-${index}`,
      ...zone,
    }),
  )

  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    const loadImage = async () => {
      // Use section_image_url if available (full API URL from backend)
      const imagePath = config.section_image_url || config.section_path
      if (!imagePath) return

      try {
        // Fetch through authenticated API and get blob URL
        const url = await getPageImageUrl(imagePath)
        if (isMounted && url) {
          blobUrl = url
          setImageUrl(url)
        }
      } catch (error) {
        console.error("Failed to load activity image:", error)
      }
    }

    loadImage()

    return () => {
      isMounted = false
      // Revoke blob URL on cleanup to free memory
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [config.section_image_url, config.section_path])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const dims = {
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
    setImageDimensions(dims)
    setImageLoaded(true)
  }

  const placedWordIds = Object.values(placements)
  const wordsInBank = words.filter((word) => !placedWordIds.includes(word.id))

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const wordId = active.id as string
    const dropTarget = over.id as string

    if (dropTarget === "word-bank") {
      setPlacements((prev) => {
        const newPlacements = { ...prev }
        Object.keys(newPlacements).forEach((key) => {
          if (newPlacements[key] === wordId) {
            delete newPlacements[key]
          }
        })
        return newPlacements
      })
      return
    }

    if (dropTarget.startsWith("zone-")) {
      setPlacements((prev) => {
        const newPlacements = { ...prev }
        Object.keys(newPlacements).forEach((key) => {
          if (newPlacements[key] === wordId) {
            delete newPlacements[key]
          }
        })
        newPlacements[dropTarget] = wordId
        return newPlacements
      })
    }
  }

  const handleReset = useCallback(() => {
    setPlacements({})
    setShowResults(false)
    setIsShowingAnswers(false)
    setShowCelebration(false)
  }, [])

  const checkAllCorrect = useCallback(() => {
    const zonesWithAnswers = dropZones.filter((z) => z.text)
    if (zonesWithAnswers.length === 0) return false

    return zonesWithAnswers.every((zone) => {
      const wordId = placements[zone.id]
      if (!wordId) return false
      const word = words.find((w) => w.id === wordId)
      if (!word) return false
      return word.text.toLowerCase().trim() === zone.text!.toLowerCase().trim()
    })
  }, [dropZones, words, placements])

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

  const handleCheckAnswers = useCallback(() => {
    setShowResults(true)
    setIsShowingAnswers(false)

    if (checkAllCorrect()) {
      playCelebration()
    }
  }, [checkAllCorrect, playCelebration])

  const handleShowAnswers = useCallback(
    (show: boolean) => {
      if (show) {
        const correctPlacements: Placements = {}
        dropZones.forEach((zone) => {
          if (zone.text) {
            const matchingWord = words.find(
              (w) =>
                w.text.toLowerCase().trim() === zone.text!.toLowerCase().trim(),
            )
            if (matchingWord) {
              correctPlacements[zone.id] = matchingWord.id
            }
          }
        })
        setPlacements(correctPlacements)
        setShowResults(true)
        setIsShowingAnswers(true)
      } else {
        setPlacements({})
        setShowResults(false)
        setIsShowingAnswers(false)
      }
    },
    [dropZones, words],
  )

  const handleShowNextAnswer = useCallback(() => {
    for (const zone of dropZones) {
      if (zone.text && !placements[zone.id]) {
        const matchingWord = words.find(
          (w) =>
            w.text.toLowerCase().trim() === zone.text!.toLowerCase().trim(),
        )
        if (matchingWord) {
          setPlacements((prev) => ({
            ...prev,
            [zone.id]: matchingWord.id,
          }))
          setShowResults(true)
          setIsShowingAnswers(true)
          break
        }
      }
    }
  }, [dropZones, words, placements])

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

  const isCorrect = (zoneId: string): boolean | null => {
    if (!showResults) return null
    const wordId = placements[zoneId]
    if (!wordId) return null
    const word = words.find((w) => w.id === wordId)
    const zone = dropZones.find((z) => z.id === zoneId)
    if (!word || !zone?.text) return null
    return word.text.toLowerCase().trim() === zone.text.toLowerCase().trim()
  }

  const activeWord = words.find((w) => w.id === activeId)

  if (words.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">No words configured for this activity</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col relative">
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

        <WordBank
          words={wordsInBank}
          allWords={words}
          activeId={activeId}
          disabled={showResults}
          showResults={showResults}
          isShowingAnswers={isShowingAnswers}
        />

        <div className="flex flex-1 items-center justify-center mt-3 bg-slate-100 rounded-lg overflow-hidden">
          <div className="relative">
            {imageUrl && (
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Activity"
                className="max-h-[60vh] w-auto object-contain select-none pointer-events-none"
                draggable={false}
                onLoad={handleImageLoad}
                onDragStart={(e) => e.preventDefault()}
              />
            )}

            {imageLoaded && imageDimensions && (
              <div className="absolute inset-0 pointer-events-none">
                {dropZones.map((zone) => {
                  const wordId = placements[zone.id]
                  const word = wordId
                    ? words.find((w) => w.id === wordId) || null
                    : null
                  const correct = isCorrect(zone.id)

                  const maxCoord = Math.max(
                    zone.coords.x,
                    zone.coords.y,
                    zone.coords.w,
                    zone.coords.h,
                  )
                  const isPercentage =
                    maxCoord <= 100 && imageDimensions.width > 200

                  let leftPercent: number,
                    topPercent: number,
                    widthPercent: number,
                    heightPercent: number

                  if (isPercentage) {
                    leftPercent = zone.coords.x
                    topPercent = zone.coords.y
                    widthPercent = zone.coords.w
                    heightPercent = zone.coords.h
                  } else {
                    leftPercent = (zone.coords.x / imageDimensions.width) * 100
                    topPercent = (zone.coords.y / imageDimensions.height) * 100
                    widthPercent = (zone.coords.w / imageDimensions.width) * 100
                    heightPercent =
                      (zone.coords.h / imageDimensions.height) * 100
                  }

                  return (
                    <DropZoneArea
                      key={zone.id}
                      id={zone.id}
                      left={leftPercent}
                      top={topPercent}
                      width={widthPercent}
                      height={heightPercent}
                      word={word}
                      isCorrect={correct}
                      disabled={showResults}
                      onWordClick={handleReturnToBank}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeWord && (
            <div className="rounded-lg bg-cyan-500 px-3 py-2 text-white shadow-lg font-medium text-sm">
              {activeWord.text}
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}

function WordBank({
  words,
  allWords,
  activeId,
  disabled,
  showResults,
  isShowingAnswers,
}: {
  words: { id: string; text: string }[]
  allWords: { id: string; text: string }[]
  activeId: string | null
  disabled: boolean
  showResults: boolean
  isShowingAnswers: boolean
}) {
  const { setNodeRef } = useDroppable({ id: "word-bank" })

  const draggingWord = activeId ? allWords.find((w) => w.id === activeId) : null
  const isDraggingFromBank =
    draggingWord && words.some((w) => w.id === activeId)

  return (
    <div
      ref={setNodeRef}
      className="flex h-[95px] flex-wrap justify-center items-start content-start gap-2 rounded-lg border-2 border-dashed p-2 border-slate-300 bg-slate-50 overflow-y-auto"
    >
      {words.length > 0 ? (
        words.map((word) => {
          const isBeingDragged = word.id === activeId
          return isBeingDragged ? (
            <div
              key={word.id}
              className="rounded-lg px-3 py-2 border border-dashed border-slate-300 bg-slate-100 font-medium text-sm text-transparent shadow-md select-none"
            >
              {word.text}
            </div>
          ) : (
            <DraggableWord
              key={word.id}
              id={word.id}
              text={word.text}
              disabled={disabled}
              isCorrect={showResults && !isShowingAnswers ? false : null}
            />
          )
        })
      ) : isDraggingFromBank ? (
        <div className="rounded-lg px-3 py-1.5 border border-dashed border-slate-300 bg-slate-100 font-medium text-sm text-transparent shadow-md select-none">
          {draggingWord.text}
        </div>
      ) : (
        <div className="rounded-lg px-3 py-2 font-medium text-sm text-transparent select-none">
          &#8203;
        </div>
      )}
    </div>
  )
}

function DraggableWord({
  id,
  text,
  disabled,
  isCorrect,
  onClick,
}: {
  id: string
  text: string
  disabled?: boolean
  isCorrect?: boolean | null
  onClick?: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
  })

  const handleClick = (e: React.MouseEvent) => {
    if (onClick && !disabled) {
      e.stopPropagation()
      onClick()
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      onClick={handleClick}
      className={cn(
        "relative rounded-lg px-3 py-2 shadow-md border font-medium text-sm bg-white border-slate-200 text-slate-800 select-none",
        !disabled && "cursor-grab hover:shadow-lg hover:border-cyan-300",
        disabled && "cursor-default",
        isDragging && "opacity-50 cursor-grabbing",
      )}
    >
      {text}
      {isCorrect === true && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold shadow">
          ✓
        </span>
      )}
      {isCorrect === false && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold shadow">
          ✗
        </span>
      )}
    </div>
  )
}

function DropZoneArea({
  id,
  left,
  top,
  width,
  height,
  word,
  isCorrect,
  disabled,
  onWordClick,
}: {
  id: string
  left: number
  top: number
  width: number
  height: number
  word: { id: string; text: string } | null
  isCorrect: boolean | null
  disabled: boolean
  onWordClick?: (wordId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute pointer-events-auto flex items-center justify-center",
        "rounded transition-colors",
        !word && "border-2 border-dashed",
        isOver && "border-cyan-500 bg-cyan-100/50",
        !isOver && !word && "border-slate-400/50 bg-slate-200/30",
      )}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
    >
      {word && (
        <DraggableWord
          id={word.id}
          text={word.text}
          disabled={disabled}
          isCorrect={isCorrect}
          onClick={() => onWordClick?.(word.id)}
        />
      )}
    </div>
  )
}
