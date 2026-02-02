import { useState } from "react"
import type { FillAnswerArea } from "@/types/flowbook"

interface FillAnswerOverlayProps {
  fillAnswer: FillAnswerArea
  pageWidth: number
  pageHeight: number
}

export function FillAnswerOverlay({
  fillAnswer,
  pageWidth,
  pageHeight,
}: FillAnswerOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Calculate position as percentage of page dimensions
  const left = (fillAnswer.x / pageWidth) * 100
  const top = (fillAnswer.y / pageHeight) * 100
  const width = (fillAnswer.width / pageWidth) * 100
  const height = (fillAnswer.height / pageHeight) * 100

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsVisible(!isVisible)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="absolute cursor-pointer pointer-events-auto z-10"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      title={isVisible ? "Click to hide answer" : "Click to show answer"}
    >
      {/* Clickable area with thin dashed border */}
      <div
        className="relative h-full w-full rounded"
        style={{
          border: "1px dashed rgba(120, 120, 120, 0.5)",
        }}
      >
        {/* Answer text - only visible when clicked */}
        {isVisible && (
          <span
            className="absolute inset-0 flex items-center justify-center font-bold text-red-600"
            style={{
              fontSize: `${height * 0.7}vh`,
              lineHeight: 1,
              textShadow: "0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white",
              whiteSpace: "nowrap",
            }}
          >
            {fillAnswer.text}
          </span>
        )}
      </div>
    </button>
  )
}
