/**
 * RecipientItem Component Tests
 * Story 20.8: Messaging Recipient Enhancements
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { Recipient } from "@/types/message"
import { RecipientItem } from "../RecipientItem"

describe("RecipientItem", () => {
  const mockPublisher: Recipient = {
    user_id: "pub-1",
    name: "John Publisher",
    email: "john@publisher.com",
    organization_name: "ABC Publishing Co.",
    role: "publisher",
  }

  const mockTeacher: Recipient = {
    user_id: "teacher-1",
    name: "Jane Teacher",
    email: "jane@teacher.com",
    role: "teacher",
  }

  it("shows publisher organization name", () => {
    render(<RecipientItem recipient={mockPublisher} />)
    expect(screen.getByText("John Publisher")).toBeInTheDocument()
    expect(screen.getByText("ABC Publishing Co.")).toBeInTheDocument()
  })

  it("handles publisher without organization", () => {
    const publisherNoOrg: Recipient = {
      ...mockPublisher,
      organization_name: null,
    }
    render(<RecipientItem recipient={publisherNoOrg} />)
    expect(screen.getByText("John Publisher")).toBeInTheDocument()
    expect(screen.getByText("john@publisher.com")).toBeInTheDocument()
  })

  it("shows email for non-publisher recipients", () => {
    render(<RecipientItem recipient={mockTeacher} />)
    expect(screen.getByText("Jane Teacher")).toBeInTheDocument()
    expect(screen.getByText("jane@teacher.com")).toBeInTheDocument()
  })

  it("displays check icon when selected", () => {
    const { container } = render(
      <RecipientItem recipient={mockPublisher} selected={true} />,
    )
    // Check icon should be in the DOM
    const checkIcon = container.querySelector("svg.lucide-check")
    expect(checkIcon).toBeInTheDocument()
  })

  it("does not display check icon when not selected", () => {
    const { container } = render(
      <RecipientItem recipient={mockPublisher} selected={false} />,
    )
    // Check icon should not be in the DOM
    const checkIcon = container.querySelector("svg.lucide-check")
    expect(checkIcon).not.toBeInTheDocument()
  })

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn()
    render(<RecipientItem recipient={mockPublisher} onClick={handleClick} />)

    const recipientDiv = screen.getByRole("button")
    recipientDiv.click()

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
