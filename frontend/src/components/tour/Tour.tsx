/**
 * Tour Component - React Joyride wrapper with custom configuration
 *
 * Includes skip confirmation dialog to prevent accidental tour dismissal.
 * Skip confirmation is shown when user presses Escape or clicks Skip button.
 */

import { useCallback, useEffect, useState } from "react"
import Joyride, {
  ACTIONS,
  type CallBackProps,
  EVENTS,
  STATUS,
  type Step,
} from "react-joyride"
import { useTour } from "@/hooks/useTour"
import { SkipTourDialog } from "./SkipTourDialog"
import { TourTooltip } from "./TourTooltip"

export function Tour() {
  const {
    isActive,
    stepIndex,
    steps,
    nextStep,
    prevStep,
    goToStep,
    skipTour,
    completeTour,
  } = useTour()

  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false)

  // Handle Escape key to show skip confirmation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isActive && !showSkipConfirmation) {
        event.preventDefault()
        setShowSkipConfirmation(true)
      }
    }

    if (isActive) {
      document.addEventListener("keydown", handleKeyDown)
      return () => {
        document.removeEventListener("keydown", handleKeyDown)
      }
    }
  }, [isActive, showSkipConfirmation])

  const handleConfirmSkip = useCallback(async () => {
    setShowSkipConfirmation(false)
    await skipTour()
  }, [skipTour])

  const handleCancelSkip = useCallback(() => {
    setShowSkipConfirmation(false)
  }, [])

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { action, index, status, type } = data

    // Handle tour completion
    if (status === STATUS.FINISHED) {
      await completeTour()
      return
    }

    // Handle skip button - show confirmation instead of immediately skipping
    if (status === STATUS.SKIPPED) {
      setShowSkipConfirmation(true)
      return
    }

    // Handle step navigation
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        nextStep()
      } else if (action === ACTIONS.PREV) {
        prevStep()
      }
    }

    // Handle target not found - skip to next step
    if (type === EVENTS.TARGET_NOT_FOUND) {
      if (index < steps.length - 1) {
        goToStep(index + 1)
      } else {
        await completeTour()
      }
    }

    // Handle close button click - show confirmation dialog
    if (action === ACTIONS.CLOSE) {
      setShowSkipConfirmation(true)
    }
  }

  // Convert our TourStep format to Joyride Step format
  const joyrideSteps: Step[] = steps.map((step) => ({
    target: step.target,
    title: step.title,
    content: step.content,
    placement: step.placement ?? "auto",
    disableBeacon: step.disableBeacon ?? true,
    spotlightClicks: step.spotlightClicks ?? false,
  }))

  if (!isActive || steps.length === 0) {
    return null
  }

  return (
    <>
      <Joyride
        steps={joyrideSteps}
        run={isActive && !showSkipConfirmation}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        disableOverlayClose
        spotlightClicks={false}
        callback={handleJoyrideCallback}
        tooltipComponent={TourTooltip}
        styles={{
          options: {
            zIndex: 10000,
            arrowColor: "hsl(var(--card))",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
          spotlight: {
            borderRadius: 8,
          },
        }}
        floaterProps={{
          disableAnimation: true,
        }}
      />
      <SkipTourDialog
        open={showSkipConfirmation}
        onConfirm={handleConfirmSkip}
        onCancel={handleCancelSkip}
      />
    </>
  )
}
