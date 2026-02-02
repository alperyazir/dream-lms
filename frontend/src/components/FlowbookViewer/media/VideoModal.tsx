import { X } from "lucide-react"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { VideoPlayer } from "./VideoPlayer"

interface VideoModalProps {
  src: string
  poster?: string
  subtitleSrc?: string
  isOpen: boolean
  onClose: () => void
}

export function VideoModal({
  src,
  poster,
  subtitleSrc,
  isOpen,
  onClose,
}: VideoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose()
    }
  }

  const modalContent = (
    <div
      ref={modalRef}
      className={cn(
        "fixed inset-0 z-[100]",
        "flex items-center justify-center",
        "bg-black/80 backdrop-blur-sm",
        "animate-in fade-in duration-200",
      )}
      onClick={handleBackdropClick}
    >
      {/* Modal Content */}
      <div className="relative mx-4 w-full max-w-4xl animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "absolute -top-12 right-0 z-10",
            "rounded-full p-2",
            "bg-white/10 hover:bg-white/20",
            "text-white transition-colors",
          )}
          aria-label="Close video"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Video Container */}
        <div className="overflow-hidden rounded-lg bg-black shadow-2xl">
          <div className="aspect-video">
            <VideoPlayer
              src={src}
              poster={poster}
              subtitleSrc={subtitleSrc}
              onEnded={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  )

  // Use portal to render at document body for proper z-index stacking
  return createPortal(modalContent, document.body)
}
