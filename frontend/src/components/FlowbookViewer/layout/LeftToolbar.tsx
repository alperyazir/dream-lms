import { BookOpen, FileText, Gamepad2, LogOut, Settings, Wrench } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useFlowbookUIStore } from "../stores"
import { ConfirmDialog } from "../ui/ConfirmDialog"

interface LeftToolbarProps {
  onClose?: () => void
}

interface ToolbarButtonProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  isActive?: boolean
  disabled?: boolean
  variant?: "default" | "danger"
}

function ToolbarButton({
  icon,
  label,
  onClick,
  isActive,
  disabled,
  variant = "default",
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2",
        "shadow-md",
        variant === "default" && [
          "bg-cyan-500 text-white",
          "hover:bg-cyan-600 active:scale-95",
          "focus-visible:ring-cyan-300",
          isActive && "bg-cyan-600 ring-2 ring-white",
          disabled && "cursor-not-allowed opacity-50 hover:bg-cyan-500",
        ],
        variant === "danger" && [
          "bg-slate-500 text-white",
          "hover:bg-red-500 active:scale-95",
          "focus-visible:ring-red-300",
        ],
      )}
    >
      {icon}
    </button>
  )
}

export function LeftToolbar({ onClose }: LeftToolbarProps) {
  const { viewMode, setViewMode } = useFlowbookUIStore()
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const handleViewModeToggle = () => {
    setViewMode(viewMode === "single" ? "double" : "single")
  }

  const handleCloseClick = () => {
    setShowCloseConfirm(true)
  }

  const handleCloseConfirm = () => {
    setShowCloseConfirm(false)
    onClose?.()
  }

  return (
    <>
      <aside className="absolute left-0 top-1/2 z-20 -translate-y-1/2">
        {/* Container with clean white background */}
        <div className="flex flex-col items-center gap-2 bg-white/95 backdrop-blur-sm rounded-r-2xl p-2 shadow-lg border border-l-0 border-slate-200">
          {/* Games */}
          <ToolbarButton
            icon={<Gamepad2 className="h-5 w-5" />}
            label="Games"
            disabled
          />

          {/* Tools */}
          <ToolbarButton
            icon={<Wrench className="h-5 w-5" />}
            label="Tools"
            disabled
          />

          {/* Single/Double Page */}
          <ToolbarButton
            icon={
              viewMode === "single" ? (
                <FileText className="h-5 w-5" />
              ) : (
                <BookOpen className="h-5 w-5" />
              )
            }
            label={
              viewMode === "single"
                ? "Switch to Double Page"
                : "Switch to Single Page"
            }
            onClick={handleViewModeToggle}
          />

          {/* Settings */}
          <ToolbarButton
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
            disabled
          />

          {/* Divider */}
          <div className="w-8 h-px bg-slate-300 my-1" />

          {/* Close/Exit Button at bottom */}
          {onClose && (
            <ToolbarButton
              icon={<LogOut className="h-5 w-5" />}
              label="Close Book"
              onClick={handleCloseClick}
              variant="danger"
            />
          )}
        </div>
      </aside>

      {/* Close Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCloseConfirm}
        title="Close Book"
        message="Are you sure you want to close this book? Any unsaved annotations will be preserved."
        confirmLabel="Close"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={handleCloseConfirm}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </>
  )
}
