/**
 * useAutoSave Hook
 * Story 4.8: Activity Progress Persistence (Save & Resume)
 *
 * Auto-saves data at regular intervals and provides manual save trigger.
 */

import { useCallback, useEffect, useRef, useState } from "react"

export interface UseAutoSaveOptions {
  /**
   * Callback function to save data
   * @param answers - Current answers to save
   * @param timeSpent - Time spent in minutes
   */
  onSave: (answers: Record<string, any>, timeSpent: number) => Promise<void>

  /**
   * Auto-save interval in milliseconds (default: 30000ms = 30 seconds)
   */
  interval?: number

  /**
   * Whether auto-save is enabled (default: true)
   */
  enabled?: boolean
}

export interface UseAutoSaveReturn {
  /**
   * Timestamp of last successful save
   */
  lastSavedAt: Date | null

  /**
   * Whether a save operation is currently in progress
   */
  isSaving: boolean

  /**
   * Manually trigger a save operation
   */
  triggerManualSave: () => Promise<void>
}

/**
 * Hook for auto-saving assignment progress at regular intervals
 *
 * @param options - Auto-save configuration
 * @returns Auto-save state and controls
 *
 * @example
 * ```tsx
 * const { lastSavedAt, isSaving, triggerManualSave } = useAutoSave({
 *   onSave: async (answers, timeSpent) => {
 *     await saveProgress(assignmentId, {
 *       partial_answers_json: answers,
 *       time_spent_minutes: timeSpent
 *     })
 *   },
 *   interval: 30000, // 30 seconds
 *   enabled: status === 'in_progress'
 * })
 * ```
 */
export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveReturn {
  const { onSave, interval = 30000, enabled = true } = options

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const answersRef = useRef<Record<string, any>>({})
  const timeSpentRef = useRef<number>(0)

  /**
   * Save function that handles the actual save operation
   */
  const performSave = useCallback(async () => {
    if (isSaving) {
      // Already saving, skip this attempt
      return
    }

    setIsSaving(true)
    try {
      await onSave(answersRef.current, timeSpentRef.current)
      setLastSavedAt(new Date())
    } catch (error) {
      console.error("Auto-save failed:", error)
      // Don't throw - let the app continue
    } finally {
      setIsSaving(false)
    }
  }, [isSaving, onSave])

  /**
   * Manual save trigger
   */
  const triggerManualSave = useCallback(async () => {
    await performSave()
  }, [performSave])

  /**
   * Set up auto-save interval
   */
  useEffect(() => {
    if (!enabled) {
      // Clear interval if disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Set up interval
    intervalRef.current = setInterval(() => {
      performSave()
    }, interval)

    // Cleanup on unmount or when deps change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, interval, performSave])

  return {
    lastSavedAt,
    isSaving,
    triggerManualSave,
  }
}

/**
 * Hook variant that accepts dynamic answers and timeSpent
 * This is the recommended version for most use cases
 */
export function useAutoSaveWithData(
  answers: Record<string, any>,
  timeSpent: number,
  options: Omit<UseAutoSaveOptions, "onSave"> & {
    onSave: (answers: Record<string, any>, timeSpent: number) => Promise<void>
  },
): UseAutoSaveReturn {
  const { onSave, interval = 30000, enabled = true } = options

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Save function that uses current answers and timeSpent from props
   */
  const performSave = useCallback(async () => {
    if (isSaving) {
      return
    }

    setIsSaving(true)
    try {
      await onSave(answers, timeSpent)
      setLastSavedAt(new Date())
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }, [answers, timeSpent, isSaving, onSave])

  /**
   * Manual save trigger
   */
  const triggerManualSave = useCallback(async () => {
    await performSave()
  }, [performSave])

  /**
   * Set up auto-save interval
   */
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      performSave()
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, interval, performSave])

  return {
    lastSavedAt,
    isSaving,
    triggerManualSave,
  }
}
