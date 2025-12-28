/**
 * Tests for TimePlanningWarningDialog - Story 20.4
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TimePlanningWarningDialog } from "./TimePlanningWarningDialog"

describe("TimePlanningWarningDialog", () => {
  it("displays correct activity count (singular)", () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <TimePlanningWarningDialog
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        activityCount={1}
      />,
    )

    expect(
      screen.getByText(/You currently have 1 activity selected/),
    ).toBeInTheDocument()
  })

  it("displays correct activity count (plural)", () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <TimePlanningWarningDialog
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        activityCount={3}
      />,
    )

    expect(
      screen.getByText(/You currently have 3 activities selected/),
    ).toBeInTheDocument()
  })

  it("calls onCancel when Keep Activities button is clicked", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <TimePlanningWarningDialog
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        activityCount={3}
      />,
    )

    const keepButton = screen.getByRole("button", { name: /Keep Activities/i })
    await user.click(keepButton)

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("calls onConfirm when Enable & Clear Activities button is clicked", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <TimePlanningWarningDialog
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        activityCount={3}
      />,
    )

    const confirmButton = screen.getByRole("button", {
      name: /Enable & Clear Activities/i,
    })
    await user.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("warns about activity removal", () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <TimePlanningWarningDialog
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        activityCount={3}
      />,
    )

    expect(
      screen.getByText(/remove your selected activities/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /Time Planning uses a different activity selection method/i,
      ),
    ).toBeInTheDocument()
  })
})
