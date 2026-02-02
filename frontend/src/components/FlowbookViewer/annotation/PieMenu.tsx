import { Highlighter, Pencil, Presentation } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useAnnotationStore } from "../stores"

interface PieMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  onOpenToolbar: (tool: "pen" | "highlight") => void
  onOpenWhiteboard?: () => void
}

type MenuItemId = "draw" | "highlight" | "whiteboard"

interface MenuItem {
  id: MenuItemId
  icon: React.ReactNode
  label: string
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "highlight",
    icon: <Highlighter className="h-6 w-6" />,
    label: "Highlight",
  },
  { id: "draw", icon: <Pencil className="h-6 w-6" />, label: "Draw" },
  {
    id: "whiteboard",
    icon: <Presentation className="h-6 w-6" />,
    label: "Whiteboard",
  },
]

const RADIUS = 70
const INNER_RADIUS = 25
const ANGLE_SPAN = Math.PI
const START_ANGLE = -Math.PI

export function PieMenu({
  isOpen,
  position,
  onClose,
  onOpenToolbar,
  onOpenWhiteboard,
}: PieMenuProps) {
  const { setActiveTool, showAnnotations, toggleAnnotations } =
    useAnnotationStore()

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Handle main menu item click - open toolbar or action
  const handleSegmentClick = useCallback(
    (id: MenuItemId) => {
      if (id === "draw") {
        setActiveTool("pen")
        if (!showAnnotations) toggleAnnotations()
        onOpenToolbar("pen")
        onClose()
      } else if (id === "highlight") {
        setActiveTool("highlight")
        if (!showAnnotations) toggleAnnotations()
        onOpenToolbar("highlight")
        onClose()
      } else if (id === "whiteboard") {
        onOpenWhiteboard?.()
        onClose()
      }
    },
    [showAnnotations, toggleAnnotations, setActiveTool, onOpenToolbar, onOpenWhiteboard, onClose]
  )

  // Calculate position for each segment
  const getSegmentAngle = (index: number, total: number) => {
    const angleStep = ANGLE_SPAN / total
    return START_ANGLE + angleStep * index + angleStep / 2
  }

  // Handle click outside to close
  const handleBackdropClick = useCallback(() => {
    onClose()
  }, [onClose])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      window.addEventListener("keydown", handleKeyDown)
      return () => {
        window.removeEventListener("keydown", handleKeyDown)
      }
    } else {
      setIsAnimating(false)
    }
  }, [isOpen, handleKeyDown])

  // Reset when menu opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" style={{ touchAction: "none" }}>
      {/* Backdrop - click to close */}
      <div className="absolute inset-0" onClick={handleBackdropClick} />

      {/* Menu container */}
      <div
        className="absolute"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Main Pie Menu - Donut shape without center circle */}
        <svg
          width={RADIUS * 2 + 20}
          height={RADIUS + 20}
          viewBox={`${-RADIUS - 10} ${-RADIUS - 10} ${RADIUS * 2 + 20} ${RADIUS + 20}`}
          className={cn(
            "absolute pointer-events-auto transition-all duration-200",
            isAnimating ? "scale-100 opacity-100" : "scale-75 opacity-0"
          )}
          style={{
            left: -RADIUS - 10,
            top: -RADIUS - 10,
          }}
        >
          {MENU_ITEMS.map((item, index) => {
            const total = MENU_ITEMS.length
            const angleStep = ANGLE_SPAN / total
            const startAngle = START_ANGLE + angleStep * index
            const endAngle = startAngle + angleStep
            const isSelected = selectedIndex === index

            // Outer arc points
            const outerX1 = Math.cos(startAngle) * RADIUS
            const outerY1 = Math.sin(startAngle) * RADIUS
            const outerX2 = Math.cos(endAngle) * RADIUS
            const outerY2 = Math.sin(endAngle) * RADIUS

            // Inner arc points
            const innerX1 = Math.cos(startAngle) * INNER_RADIUS
            const innerY1 = Math.sin(startAngle) * INNER_RADIUS
            const innerX2 = Math.cos(endAngle) * INNER_RADIUS
            const innerY2 = Math.sin(endAngle) * INNER_RADIUS

            const largeArcFlag = angleStep > Math.PI ? 1 : 0

            // Donut segment path: outer arc -> line to inner -> inner arc (reverse) -> line back
            const pathD = `
              M ${outerX1} ${outerY1}
              A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${outerX2} ${outerY2}
              L ${innerX2} ${innerY2}
              A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1}
              Z
            `

            const iconAngle = getSegmentAngle(index, total)
            const iconRadius = (RADIUS + INNER_RADIUS) / 2
            const iconX = Math.cos(iconAngle) * iconRadius
            const iconY = Math.sin(iconAngle) * iconRadius

            return (
              <g key={item.id} className="cursor-pointer">
                <path
                  d={pathD}
                  className={cn(
                    "transition-all duration-150",
                    isSelected ? "fill-cyan-600" : "fill-slate-700 hover:fill-slate-600"
                  )}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                  onClick={() => handleSegmentClick(item.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseLeave={() => setSelectedIndex(null)}
                />
                <foreignObject
                  x={iconX - 16}
                  y={iconY - 16}
                  width="32"
                  height="32"
                  className="pointer-events-none"
                >
                  <div
                    className={cn(
                      "flex h-full w-full items-center justify-center text-white transition-transform duration-150",
                      isSelected && "scale-110"
                    )}
                  >
                    {item.icon}
                  </div>
                </foreignObject>
              </g>
            )
          })}
        </svg>

        {/* Label tooltip */}
        {selectedIndex !== null && (
          <div
            className="absolute whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white shadow-lg pointer-events-none"
            style={{
              left: 0,
              top: -RADIUS - 35,
              transform: "translateX(-50%)",
            }}
          >
            {MENU_ITEMS[selectedIndex].label}
          </div>
        )}
      </div>
    </div>
  )
}
