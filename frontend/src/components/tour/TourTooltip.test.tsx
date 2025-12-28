/**
 * TourTooltip Component Tests
 * Story 12.2: Frontend - Tour Library Integration & Infrastructure
 *
 * Tests tour tooltip functionality including:
 * - Renders step title and content
 * - Navigation buttons work correctly
 * - Skip button fires callback
 * - Accessibility attributes present
 */

import { fireEvent, render, screen } from "@testing-library/react"
import type { TooltipRenderProps } from "react-joyride"
import { describe, expect, it, vi } from "vitest"
import { TourTooltip } from "./TourTooltip"

const createMockProps = (
  overrides: Partial<TooltipRenderProps> = {},
): TooltipRenderProps =>
  ({
    continuous: true,
    index: 0,
    size: 3,
    step: {
      target: "[data-tour='test']",
      title: "Test Title",
      content: "Test Content",
      placement: "bottom",
      disableBeacon: true,
    },
    isLastStep: false,
    backProps: {
      "aria-label": "Back",
      "data-action": "back",
      onClick: vi.fn(),
      role: "button",
      title: "Back",
    },
    closeProps: {
      "aria-label": "Close",
      "data-action": "close",
      onClick: vi.fn(),
      role: "button",
      title: "Close",
    },
    primaryProps: {
      "aria-label": "Next",
      "data-action": "primary",
      onClick: vi.fn(),
      role: "button",
      title: "Next",
    },
    skipProps: {
      "aria-label": "Skip",
      "data-action": "skip",
      onClick: vi.fn(),
      role: "button",
      title: "Skip",
    },
    tooltipProps: {
      "aria-modal": true,
      role: "alertdialog",
      ref: vi.fn(),
    },
    ...overrides,
  }) as TooltipRenderProps

describe("TourTooltip", () => {
  it("renders step title and content", () => {
    const props = createMockProps()
    render(<TourTooltip {...props} />)

    expect(screen.getByText("Test Title")).toBeInTheDocument()
    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("displays step progress indicator", () => {
    const props = createMockProps({ index: 1, size: 5 })
    render(<TourTooltip {...props} />)

    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument()
  })

  it("calls onNext when Next button clicked", () => {
    const primaryOnClick = vi.fn()
    const props = createMockProps({
      primaryProps: {
        "aria-label": "Next",
        "data-action": "primary",
        onClick: primaryOnClick,
        role: "button",
        title: "Next",
      },
    })
    render(<TourTooltip {...props} />)

    const nextButton = screen.getByRole("button", { name: /next step/i })
    fireEvent.click(nextButton)

    expect(primaryOnClick).toHaveBeenCalled()
  })

  it("calls onBack when Back button clicked", () => {
    const backOnClick = vi.fn()
    const props = createMockProps({
      index: 1, // Not first step, so Back button shows
      backProps: {
        "aria-label": "Back",
        "data-action": "back",
        onClick: backOnClick,
        role: "button",
        title: "Back",
      },
    })
    render(<TourTooltip {...props} />)

    const backButton = screen.getByRole("button", { name: /previous step/i })
    fireEvent.click(backButton)

    expect(backOnClick).toHaveBeenCalled()
  })

  it("does not show Back button on first step", () => {
    const props = createMockProps({ index: 0 })
    render(<TourTooltip {...props} />)

    expect(
      screen.queryByRole("button", { name: /previous step/i }),
    ).not.toBeInTheDocument()
  })

  it("calls onSkip when Skip button clicked", () => {
    const skipOnClick = vi.fn()
    const props = createMockProps({
      skipProps: {
        "aria-label": "Skip",
        "data-action": "skip",
        onClick: skipOnClick,
        role: "button",
        title: "Skip",
      },
    })
    render(<TourTooltip {...props} />)

    const skipButton = screen.getByRole("button", { name: /skip tour/i })
    fireEvent.click(skipButton)

    expect(skipOnClick).toHaveBeenCalled()
  })

  it("calls onClose when close button clicked", () => {
    const closeOnClick = vi.fn()
    const props = createMockProps({
      closeProps: {
        "aria-label": "Close",
        "data-action": "close",
        onClick: closeOnClick,
        role: "button",
        title: "Close",
      },
    })
    render(<TourTooltip {...props} />)

    const closeButton = screen.getByRole("button", { name: /close tour/i })
    fireEvent.click(closeButton)

    expect(closeOnClick).toHaveBeenCalled()
  })

  it("shows Finish button on last step", () => {
    const props = createMockProps({ isLastStep: true })
    render(<TourTooltip {...props} />)

    expect(
      screen.getByRole("button", { name: /finish tour/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("Finish")).toBeInTheDocument()
  })

  it("has accessible dialog role", () => {
    const props = createMockProps()
    render(<TourTooltip {...props} />)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("has aria-labelledby pointing to title", () => {
    const props = createMockProps()
    render(<TourTooltip {...props} />)

    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-labelledby", "tour-tooltip-title")
  })

  it("has aria-describedby pointing to content", () => {
    const props = createMockProps()
    render(<TourTooltip {...props} />)

    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-describedby", "tour-tooltip-content")
  })

  it("renders without title when step has no title", () => {
    const props = createMockProps()
    // Override step without title
    const propsWithoutTitle = {
      ...props,
      step: {
        ...props.step,
        title: undefined,
        content: "Content only",
      },
    }
    render(<TourTooltip {...propsWithoutTitle} />)

    expect(screen.queryByRole("heading")).not.toBeInTheDocument()
    expect(screen.getByText("Content only")).toBeInTheDocument()
  })

  it("does not show primary button when not continuous", () => {
    const props = createMockProps({ continuous: false })
    render(<TourTooltip {...props} />)

    expect(
      screen.queryByRole("button", { name: /next step/i }),
    ).not.toBeInTheDocument()
  })
})
