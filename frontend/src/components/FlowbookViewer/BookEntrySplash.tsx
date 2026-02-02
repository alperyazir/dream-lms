/**
 * Book Entry Splash Screen Component
 *
 * Clean, elegant animation sequence:
 * 1. Publisher logo fades in with scale animation
 * 2. Publisher name fades in below
 * 3. Logo + name move up
 * 4. Book cover fades in with scale
 * 5. Open button appears
 */

import { BookOpen, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { BookCover } from "@/components/books/BookCover"
import { Button } from "@/components/ui/button"
import { useSoundContext } from "@/hooks/useSoundEffects"

interface BookEntrySplashProps {
  title: string
  coverUrl: string | null
  publisherName: string
  publisherId: number
  isLoading?: boolean
  onOpen: () => void
  onClose?: () => void
}

type AnimationStage = "logo" | "name" | "move-up" | "book" | "ready"

export function BookEntrySplash({
  title,
  coverUrl,
  publisherName,
  publisherId,
  isLoading = false,
  onOpen,
  onClose,
}: BookEntrySplashProps) {
  const [stage, setStage] = useState<AnimationStage>("logo")
  const [logoError, setLogoError] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const { play } = useSoundContext()

  const publisherLogoUrl = `/api/v1/publishers/${publisherId}/logo`

  // Animation sequence
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    timers.push(setTimeout(() => setStage("name"), 800))
    timers.push(setTimeout(() => setStage("move-up"), 1800))
    timers.push(setTimeout(() => setStage("book"), 2400))
    timers.push(setTimeout(() => setStage("ready"), 3200))

    return () => timers.forEach(clearTimeout)
  }, [])

  const isStageActive = (checkStage: AnimationStage) => {
    const stages: AnimationStage[] = ["logo", "name", "move-up", "book", "ready"]
    return stages.indexOf(stage) >= stages.indexOf(checkStage)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Subtle animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Publisher Section */}
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out ${
            isStageActive("move-up") ? "-translate-y-8" : "translate-y-0"
          }`}
        >
          {/* Logo */}
          <div
            className={`transition-all duration-700 ease-out ${
              isStageActive("logo")
                ? "opacity-100 scale-100"
                : "opacity-0 scale-75"
            }`}
          >
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl" />

              {/* Logo Circle */}
              <div className="relative w-28 h-28 rounded-full overflow-hidden bg-white/10 backdrop-blur ring-2 ring-white/20 shadow-2xl flex items-center justify-center">
                {!logoError ? (
                  <img
                    src={publisherLogoUrl}
                    alt={publisherName}
                    className={`w-full h-full object-contain p-3 transition-opacity duration-300 ${
                      logoLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => setLogoLoaded(true)}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="text-4xl font-bold text-white/80">
                    {publisherName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Publisher Name */}
          <h2
            className={`mt-5 text-2xl font-semibold text-white/90 tracking-wide transition-all duration-500 ${
              isStageActive("name")
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            {publisherName}
          </h2>
        </div>

        {/* Book Section */}
        <div
          className={`mt-8 flex flex-col items-center transition-all duration-700 ${
            isStageActive("book")
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-8 scale-95"
          }`}
        >
          {/* Book Cover */}
          <div className="relative">
            <div className="absolute -inset-3 bg-primary/10 rounded-lg blur-lg" />
            <div className="relative w-52 aspect-[3/4] rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <BookCover coverUrl={null} title={title} size="lg" className="w-full h-full" />
              )}
            </div>
          </div>

          {/* Book Title */}
          <h1 className="mt-5 text-xl font-medium text-white text-center max-w-xs leading-snug">
            {title}
          </h1>
        </div>

        {/* Action Buttons */}
        <div
          className={`mt-8 flex flex-col items-center gap-3 transition-all duration-500 ${
            isStageActive("ready")
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <Button
            size="lg"
            className="px-10 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:scale-105"
            onClick={() => {
              play("bookOpen")
              onOpen()
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <BookOpen className="h-5 w-5 mr-2" />
                Open Book
              </>
            )}
          </Button>

          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10"
              onClick={onClose}
            >
              Back to Library
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
