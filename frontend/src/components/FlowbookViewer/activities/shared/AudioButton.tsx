import { Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFlowbookAudioStore } from "../../stores"

interface AudioButtonProps {
  audioSrc: string
  size?: "sm" | "md"
  className?: string
}

export function AudioButton({
  audioSrc,
  size = "md",
  className,
}: AudioButtonProps) {
  const { currentSrc, isPlaying, play, pause } = useFlowbookAudioStore()

  const isActive = currentSrc === audioSrc
  const isThisPlaying = isActive && isPlaying

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (isThisPlaying) {
      pause()
    } else {
      play(audioSrc)
    }
  }

  const sizeClasses = {
    sm: "h-6 w-6 p-1",
    md: "h-8 w-8 p-1.5",
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "rounded-full transition-colors",
        "hover:bg-cyan-100 active:bg-cyan-200",
        isThisPlaying && "bg-cyan-500 text-white hover:bg-cyan-600",
        !isThisPlaying && "text-cyan-600",
        sizeClasses[size],
        className,
      )}
      aria-label={isThisPlaying ? "Pause audio" : "Play audio"}
    >
      <Volume2
        className={cn("h-full w-full", isThisPlaying && "animate-pulse")}
      />
    </button>
  )
}
