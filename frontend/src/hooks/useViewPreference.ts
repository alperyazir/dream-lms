import { useCallback, useState } from "react"
import type { ViewMode } from "@/components/ui/view-mode-toggle"

export function useViewPreference(
  key: string,
  defaultValue: ViewMode = "grid",
): [ViewMode, (value: ViewMode) => void] {
  const storageKey = `viewMode_${key}`

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return defaultValue
    const stored = localStorage.getItem(storageKey)
    return (stored as ViewMode) || defaultValue
  })

  const setViewMode = useCallback(
    (value: ViewMode) => {
      setViewModeState(value)
      localStorage.setItem(storageKey, value)
    },
    [storageKey],
  )

  return [viewMode, setViewMode]
}
