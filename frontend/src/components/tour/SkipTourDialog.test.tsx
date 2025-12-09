/**
 * SkipTourDialog Component Tests
 * Story 12.4: Frontend - Tour Trigger & Flow Integration
 *
 * Tests skip tour confirmation dialog:
 * - Renders dialog when open=true
 * - Does not render when open=false
 * - Calls onConfirm when confirm button clicked
 * - Calls onCancel when cancel button clicked
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SkipTourDialog } from "./SkipTourDialog"

describe("SkipTourDialog", () => {
  it("renders dialog when open is true", () => {
    render(
      <SkipTourDialog open={true} onConfirm={vi.fn()} onCancel={vi.fn()} />
    )

    expect(screen.getByText("Skip Tour?")).toBeInTheDocument()
    expect(
      screen.getByText(/Are you sure you want to skip the tour\?/)
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /continue tour/i })
    ).toBeInTheDocument()
  })

  it("does not render when open is false", () => {
    render(
      <SkipTourDialog open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />
    )

    expect(screen.queryByText("Skip Tour?")).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Are you sure you want to skip the tour\?/)
    ).not.toBeInTheDocument()
  })

  it("calls onConfirm when skip button is clicked", () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <SkipTourDialog open={true} onConfirm={onConfirm} onCancel={onCancel} />
    )

    fireEvent.click(screen.getByRole("button", { name: /skip/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    // onCancel may be called by onOpenChange when dialog closes, so we just check onConfirm was called
  })

  it("calls onCancel when continue tour button is clicked", () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <SkipTourDialog open={true} onConfirm={onConfirm} onCancel={onCancel} />
    )

    fireEvent.click(screen.getByRole("button", { name: /continue tour/i }))

    // onCancel is called once from button click and may be called again from onOpenChange
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("displays correct warning message", () => {
    render(
      <SkipTourDialog open={true} onConfirm={vi.fn()} onCancel={vi.fn()} />
    )

    expect(
      screen.getByText(/You won't see it again/)
    ).toBeInTheDocument()
  })
})
