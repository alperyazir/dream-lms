/**
 * Tour Type Definitions
 * Types for the guided onboarding tour system
 */

import type { Placement } from "react-joyride"

/**
 * Extended placement type that includes 'auto' and 'center' options
 * supported by React Joyride's Step.placement prop
 */
export type TourPlacement = Placement | "auto" | "center"

/**
 * A single step in a tour
 */
export interface TourStep {
  /** CSS selector or data-tour attribute for the target element */
  target: string
  /** Title displayed in the tooltip header */
  title: string
  /** Content displayed in the tooltip body */
  content: string | React.ReactNode
  /** Tooltip placement relative to target */
  placement?: TourPlacement
  /** Whether to disable the beacon animation */
  disableBeacon?: boolean
  /** Whether spotlight clicks are allowed on this step */
  spotlightClicks?: boolean
}

/**
 * Tour state shape
 */
export interface TourState {
  /** Whether the tour is currently running */
  isActive: boolean
  /** Current step index */
  stepIndex: number
  /** Whether the tour has been completed or skipped */
  isCompleted: boolean
  /** Identifier for role-specific tours */
  tourId: string | null
  /** The steps for the current tour */
  steps: TourStep[]
}

/**
 * Tour control methods
 */
export interface TourControls {
  /** Start a tour with the given steps */
  startTour: (steps: TourStep[], tourId?: string) => void
  /** Stop the current tour without marking as completed */
  stopTour: () => void
  /** Move to the next step */
  nextStep: () => void
  /** Move to the previous step */
  prevStep: () => void
  /** Go to a specific step */
  goToStep: (index: number) => void
  /** Skip the tour and mark as completed (calls API) */
  skipTour: () => Promise<void>
  /** Complete the tour (calls API) */
  completeTour: () => Promise<void>
  /** Reset tour state */
  resetTour: () => void
}

/**
 * Combined tour context type
 */
export type TourContextType = TourState & TourControls
