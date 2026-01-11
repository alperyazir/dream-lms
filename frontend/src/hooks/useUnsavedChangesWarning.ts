/**
 * Unsaved Changes Warning Hook (Story 27.19)
 *
 * Warns user when navigating away with unsaved changes.
 * Uses beforeunload event for browser close/refresh.
 * Returns a blocker function for use with in-app navigation.
 */

import { useCallback, useEffect, useRef } from "react"

export interface UseUnsavedChangesWarningOptions {
  when: boolean
  message?: string
}

export interface UseUnsavedChangesWarningReturn {
  /**
   * Call this before an action that would discard changes.
   * Returns true if user confirms, false if cancelled.
   */
  confirmDiscard: () => boolean
  /**
   * Whether there are unsaved changes
   */
  hasUnsavedChanges: boolean
}

export function useUnsavedChangesWarning({
  when,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: UseUnsavedChangesWarningOptions): UseUnsavedChangesWarningReturn {
  const whenRef = useRef(when)
  whenRef.current = when

  // Handle browser close/refresh
  useEffect(() => {
    if (!when) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers require returnValue to be set
      e.returnValue = message
      return message
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [when, message])

  // Confirmation function for in-app changes
  const confirmDiscard = useCallback(() => {
    if (!whenRef.current) return true
    return window.confirm(message)
  }, [message])

  return {
    confirmDiscard,
    hasUnsavedChanges: when,
  }
}
