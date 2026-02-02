import {
  ChevronRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  RotateCcw,
  Volume2,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { getMediaUrl } from "@/services/booksApi"
import type { ActivityReference } from "@/types/flowbook"
import { useFlowbookAudioStore, useFlowbookUIStore } from "../stores"

interface ActivityToolbarProps {
  activity: ActivityReference
  onCheckAnswers?: () => void
  onShowAnswers?: (show: boolean) => void
  onShowNextAnswer?: () => void
  onReset?: () => void
}

interface IconButtonProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  isActive?: boolean
  disabled?: boolean
  size?: "sm" | "md" | "lg"
}

function IconButton({
  icon,
  label,
  onClick,
  isActive,
  disabled,
  size = "md",
}: IconButtonProps) {
  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2.5",
    lg: "p-3.5",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center rounded-lg transition-all duration-200",
        sizeClasses[size],
        "text-cyan-400 hover:bg-slate-700 hover:text-cyan-300",
        isActive && "bg-slate-700 text-cyan-300",
        disabled &&
          "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-cyan-400",
      )}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  )
}

export function ActivityToolbar({
  activity,
  onCheckAnswers,
  onShowAnswers,
  onShowNextAnswer,
  onReset,
}: ActivityToolbarProps) {
  const { closeActivity } = useFlowbookUIStore()
  const { currentSrc, isPlaying, play, pause } = useFlowbookAudioStore()
  const [showAnswers, setShowAnswers] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Get audio_extra URL from activity config (backend provides full API URL)
  const activityConfig = activity.config as {
    audio_extra?: { path?: string; url?: string }
  }
  const audioExtraApiUrl = activityConfig?.audio_extra?.url

  // Load authenticated audio URL if audio_extra exists
  useEffect(() => {
    if (!audioExtraApiUrl) {
      setAudioUrl(null)
      return
    }

    let isMounted = true
    let blobUrl: string | null = null

    const loadAudioUrl = async () => {
      try {
        // Fetch as blob with authentication using the API URL
        const url = await getMediaUrl(audioExtraApiUrl)
        if (isMounted && url) {
          blobUrl = url
          setAudioUrl(url)
        }
      } catch (error) {
        console.error("Failed to load audio_extra:", error)
      }
    }

    loadAudioUrl()

    return () => {
      isMounted = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [audioExtraApiUrl])

  const isAudioPlaying = audioUrl && currentSrc === audioUrl && isPlaying

  const handlePlayAudio = () => {
    if (!audioUrl) return

    if (isAudioPlaying) {
      pause()
    } else {
      play(audioUrl)
    }
  }

  const handleCheckAnswers = () => {
    const windowCheck = (
      window as unknown as { __activityCheckAnswers?: () => void }
    ).__activityCheckAnswers
    if (windowCheck) {
      windowCheck()
    }
    onCheckAnswers?.()
  }

  const handleToggleAnswers = () => {
    const newValue = !showAnswers
    setShowAnswers(newValue)
    const windowShowAnswers = (
      window as unknown as { __activityShowAnswers?: (show: boolean) => void }
    ).__activityShowAnswers
    if (windowShowAnswers) {
      windowShowAnswers(newValue)
    }
    onShowAnswers?.(newValue)
  }

  const handleNextAnswer = () => {
    const windowShowNext = (
      window as unknown as { __activityShowNextAnswer?: () => void }
    ).__activityShowNextAnswer
    if (windowShowNext) {
      windowShowNext()
    }
    onShowNextAnswer?.()
  }

  const handleReset = () => {
    const windowReset = (window as unknown as { __activityReset?: () => void })
      .__activityReset
    if (windowReset) {
      windowReset()
    }
    setShowAnswers(false)
    onReset?.()
  }

  return (
    <aside className="flex w-16 flex-col items-center justify-center gap-2 bg-slate-800 py-4">
      {/* Audio Extra Button - only show if audio_extra path exists */}
      {audioUrl && (
        <IconButton
          icon={<Volume2 className="h-7 w-7" />}
          label={isAudioPlaying ? "Pause audio" : "Play audio"}
          onClick={handlePlayAudio}
          isActive={!!isAudioPlaying}
          size="lg"
        />
      )}

      <IconButton
        icon={<ClipboardCheck className="h-7 w-7" />}
        label="Check answers"
        onClick={handleCheckAnswers}
        size="lg"
      />

      <IconButton
        icon={
          showAnswers ? (
            <EyeOff className="h-7 w-7" />
          ) : (
            <Eye className="h-7 w-7" />
          )
        }
        label={showAnswers ? "Hide answers" : "Show answers"}
        onClick={handleToggleAnswers}
        isActive={showAnswers}
        size="lg"
      />

      <IconButton
        icon={<ChevronRight className="h-7 w-7" />}
        label="Show next answer"
        onClick={handleNextAnswer}
        size="lg"
      />

      <IconButton
        icon={<RotateCcw className="h-7 w-7" />}
        label="Reset activity"
        onClick={handleReset}
        size="lg"
      />

      <IconButton
        icon={<X className="h-7 w-7" />}
        label="Close activity"
        onClick={closeActivity}
        size="lg"
      />
    </aside>
  )
}
