import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { getPageImageUrl } from "@/services/booksApi"
import type { ActivityReference } from "@/types/flowbook"

interface FillPictureProps {
  activity: ActivityReference
}

interface AnswerArea {
  coords: { x: number; y: number; w: number; h: number }
  text: string
  opacity?: number
}

interface DCSConfig {
  section_path?: string
  section_image_url?: string
  headerText?: string
  answer?: AnswerArea[]
}

export function FillPicture({ activity }: FillPictureProps) {
  const [revealedAreas, setRevealedAreas] = useState<Set<string>>(new Set())
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const config = activity.config as DCSConfig

  const answerAreas = (config.answer || []).map((area, index) => ({
    id: `area-${index}`,
    ...area,
  }))

  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    const loadImage = async () => {
      const imagePath = config.section_image_url || config.section_path
      if (!imagePath) return

      try {
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
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [config.section_image_url, config.section_path])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    })
    setImageLoaded(true)
  }

  const handleAreaClick = (areaId: string) => {
    setRevealedAreas((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(areaId)) {
        newSet.delete(areaId)
      } else {
        newSet.add(areaId)
      }
      return newSet
    })
  }

  const handleReset = useCallback(() => {
    setRevealedAreas(new Set())
  }, [])

  const handleShowAnswers = useCallback(
    (show: boolean) => {
      if (show) {
        setRevealedAreas(new Set(answerAreas.map((a) => a.id)))
      } else {
        setRevealedAreas(new Set())
      }
    },
    [answerAreas],
  )

  const handleShowNextAnswer = useCallback(() => {
    for (const area of answerAreas) {
      if (!revealedAreas.has(area.id)) {
        setRevealedAreas((prev) => new Set([...prev, area.id]))
        break
      }
    }
  }, [answerAreas, revealedAreas])

  useEffect(() => {
    const win = window as unknown as {
      __activityReset?: () => void
      __activityCheckAnswers?: () => void
      __activityShowAnswers?: (show: boolean) => void
      __activityShowNextAnswer?: () => void
    }
    win.__activityReset = handleReset
    win.__activityCheckAnswers = undefined
    win.__activityShowAnswers = handleShowAnswers
    win.__activityShowNextAnswer = handleShowNextAnswer
    return () => {
      delete win.__activityReset
      delete win.__activityCheckAnswers
      delete win.__activityShowAnswers
      delete win.__activityShowNextAnswer
    }
  }, [handleReset, handleShowAnswers, handleShowNextAnswer])

  if (answerAreas.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">No areas configured for this activity</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col relative select-none">
      <div className="flex flex-1 items-center justify-center bg-slate-100 rounded-lg overflow-hidden">
        <div className="relative">
          {imageUrl && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Activity"
              className="max-h-[70vh] w-auto object-contain select-none pointer-events-none"
              draggable={false}
              onLoad={handleImageLoad}
              onDragStart={(e) => e.preventDefault()}
            />
          )}

          {imageLoaded && imageDimensions && (
            <div className="absolute inset-0">
              {answerAreas.map((area) => {
                const isRevealed = revealedAreas.has(area.id)

                const maxCoord = Math.max(
                  area.coords.x,
                  area.coords.y,
                  area.coords.w,
                  area.coords.h,
                )
                const isPercentage =
                  maxCoord <= 100 && imageDimensions.width > 200

                let leftPercent: number,
                  topPercent: number,
                  widthPercent: number,
                  heightPercent: number

                if (isPercentage) {
                  leftPercent = area.coords.x
                  topPercent = area.coords.y
                  widthPercent = area.coords.w
                  heightPercent = area.coords.h
                } else {
                  leftPercent = (area.coords.x / imageDimensions.width) * 100
                  topPercent = (area.coords.y / imageDimensions.height) * 100
                  widthPercent = (area.coords.w / imageDimensions.width) * 100
                  heightPercent = (area.coords.h / imageDimensions.height) * 100
                }

                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => handleAreaClick(area.id)}
                    className={cn(
                      "absolute flex items-center justify-center",
                      "rounded transition-all duration-200",
                      "cursor-pointer",
                      !isRevealed &&
                        "border-2 border-dashed border-slate-400/50 bg-slate-200/30 hover:border-cyan-500 hover:bg-cyan-100/50",
                      isRevealed && "bg-cyan-500/90",
                    )}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                    }}
                  >
                    {isRevealed && (
                      <span className="text-white font-medium text-sm px-2 text-center truncate">
                        {area.text}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
