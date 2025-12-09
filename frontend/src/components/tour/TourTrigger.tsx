/**
 * TourTrigger Component - Automatically starts onboarding tour for eligible users
 *
 * This component checks if the user is eligible for the onboarding tour and
 * starts it automatically after a short delay to let the UI render.
 *
 * Eligibility criteria:
 * - User must be logged in
 * - User's has_completed_tour must be false
 * - User's role must not be 'admin' (admins don't see onboarding tour)
 *
 * Edge case handling:
 * - On page refresh, tour state is reset (context resets)
 * - TourTrigger will check has_completed_tour again on mount
 * - If still false, tour restarts from beginning
 * - User can skip at any time if they don't want to redo tour
 */

import { useEffect, useRef } from "react"
import useAuth from "@/hooks/useAuth"
import { useTour } from "@/hooks/useTour"
import { getTourStepsForRole } from "./steps"

export function TourTrigger() {
  const { user } = useAuth()
  const { startTour, isActive } = useTour()
  const hasTriggered = useRef(false)

  // Store startTour in a ref to avoid re-running effect when it changes
  const startTourRef = useRef(startTour)
  startTourRef.current = startTour

  useEffect(() => {
    // Prevent multiple triggers in the same session
    if (hasTriggered.current || isActive) {
      return
    }

    // Check if user is eligible for the tour
    if (!user) {
      return
    }

    // Role must be defined
    if (!user.role) {
      return
    }

    // Admin users don't see the onboarding tour
    if (user.role === "admin") {
      return
    }

    // Don't show tour if already completed
    if (user.has_completed_tour === true) {
      return
    }

    // Mark as triggered to prevent re-triggering
    hasTriggered.current = true

    // Get role-specific tour steps
    const steps = getTourStepsForRole(user.role)

    // Don't start if no steps available (shouldn't happen for non-admin)
    if (steps.length === 0) {
      return
    }

    // Add small delay (500ms) to let UI render before starting tour
    const timeoutId = setTimeout(() => {
      startTourRef.current(steps, "onboarding")
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isActive])

  // This component doesn't render anything visible
  return null
}
