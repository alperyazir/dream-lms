import { AlertTriangle, X } from "lucide-react"
import { useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "danger"
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel()
      }
    },
    [onCancel]
  )

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
      return () => {
        window.removeEventListener("keydown", handleKeyDown)
      }
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            {variant === "danger" && (
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
            )}
            <h3 className="text-base font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 py-3 bg-slate-900/50 border-t border-slate-700">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              variant === "danger"
                ? "text-white bg-red-600 hover:bg-red-700"
                : "text-white bg-cyan-600 hover:bg-cyan-700"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
