/**
 * useTour Hook - Business logic wrapper for tour context with API integration
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { UsersService } from "@/client"
import { useTourContext } from "@/contexts/TourContext"
import type { TourStep } from "@/types/tour"

export function useTour() {
  const context = useTourContext()
  const queryClient = useQueryClient()

  const completeTourMutation = useMutation({
    mutationFn: () => UsersService.completeTour(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })

  const startTour = useCallback(
    (steps: TourStep[], tourId?: string) => {
      context.startTour(steps, tourId)
    },
    [context],
  )

  const skipTour = useCallback(async () => {
    try {
      await completeTourMutation.mutateAsync()
      context.skipTour()
    } catch (error) {
      console.error("Failed to mark tour as completed:", error)
      context.skipTour()
    }
  }, [completeTourMutation, context])

  const completeTour = useCallback(async () => {
    try {
      await completeTourMutation.mutateAsync()
      context.completeTour()
    } catch (error) {
      console.error("Failed to mark tour as completed:", error)
      context.completeTour()
    }
  }, [completeTourMutation, context])

  return {
    isActive: context.isActive,
    stepIndex: context.stepIndex,
    isCompleted: context.isCompleted,
    tourId: context.tourId,
    steps: context.steps,
    startTour,
    stopTour: context.stopTour,
    nextStep: context.nextStep,
    prevStep: context.prevStep,
    goToStep: context.goToStep,
    skipTour,
    completeTour,
    resetTour: context.resetTour,
    isCompletingTour: completeTourMutation.isPending,
  }
}
