/**
 * Tour Context - Manages guided onboarding tour state
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react"
import type { TourContextType, TourState, TourStep } from "@/types/tour"

const initialState: TourState = {
  isActive: false,
  stepIndex: 0,
  isCompleted: false,
  tourId: null,
  steps: [],
}

const TourContext = createContext<TourContextType | undefined>(undefined)

export function TourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TourState>(initialState)

  const startTour = useCallback((steps: TourStep[], tourId?: string) => {
    setState({
      isActive: true,
      stepIndex: 0,
      isCompleted: false,
      tourId: tourId ?? null,
      steps,
    })
  }, [])

  const stopTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
    }))
  }, [])

  const nextStep = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.stepIndex + 1
      if (nextIndex >= prev.steps.length) {
        return {
          ...prev,
          isActive: false,
          isCompleted: true,
        }
      }
      return {
        ...prev,
        stepIndex: nextIndex,
      }
    })
  }, [])

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stepIndex: Math.max(0, prev.stepIndex - 1),
    }))
  }, [])

  const goToStep = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      stepIndex: Math.max(0, Math.min(index, prev.steps.length - 1)),
    }))
  }, [])

  const skipTour = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      isCompleted: true,
    }))
  }, [])

  const completeTour = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      isCompleted: true,
    }))
  }, [])

  const resetTour = useCallback(() => {
    setState(initialState)
  }, [])

  return (
    <TourContext.Provider
      value={{
        ...state,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        goToStep,
        skipTour,
        completeTour,
        resetTour,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTourContext() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error("useTourContext must be used within TourProvider")
  }
  return context
}
