/**
 * NotificationItem Component Tests
 * Story 6.1: Notification System Foundation
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Notification } from "@/types/notification"
import { NotificationItem } from "../NotificationItem"

const mockNotificationUnread: Notification = {
  id: "notif-1",
  user_id: "user-1",
  type: "assignment_created",
  title: "New Assignment Available",
  message: "You have a new math assignment to complete.",
  link: "/assignments/123",
  is_read: false,
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
}

const mockNotificationRead: Notification = {
  id: "notif-2",
  user_id: "user-1",
  type: "feedback_received",
  title: "Feedback on Your Work",
  message: "Your teacher has left feedback on your recent submission.",
  link: "/submissions/456",
  is_read: true,
  created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
}

const mockNotificationLong: Notification = {
  id: "notif-3",
  user_id: "user-1",
  type: "system_announcement",
  title:
    "A very long notification title that should be truncated when displayed in the UI component",
  message:
    "This is a very long message that contains a lot of text and should be truncated when displayed in the notification item component to prevent UI overflow issues.",
  link: null,
  is_read: false,
  created_at: new Date().toISOString(),
}

describe("NotificationItem", () => {
  it("renders notification with title and message", () => {
    render(<NotificationItem notification={mockNotificationUnread} />)

    expect(screen.getByText(/New Assignment Available/i)).toBeInTheDocument()
    expect(
      screen.getByText(/You have a new math assignment/i),
    ).toBeInTheDocument()
  })

  it("displays relative timestamp", () => {
    render(<NotificationItem notification={mockNotificationUnread} />)

    // Should show "about 2 hours ago" or similar
    expect(screen.getByText(/hours ago/i)).toBeInTheDocument()
  })

  it("shows unread indicator for unread notifications", () => {
    const { container } = render(
      <NotificationItem notification={mockNotificationUnread} />,
    )

    // Unread indicator should be present (blue dot)
    const unreadIndicator = container.querySelector(".bg-primary")
    expect(unreadIndicator).toBeInTheDocument()
  })

  it("does not show unread indicator for read notifications", () => {
    const { container } = render(
      <NotificationItem notification={mockNotificationRead} />,
    )

    // The container should not have the unread dot
    // We look for the specific class pattern used for the unread indicator
    const unreadIndicator = container.querySelector(
      ".w-2.h-2.rounded-full.bg-primary",
    )
    expect(unreadIndicator).not.toBeInTheDocument()
  })

  it("displays correct icon for assignment_created type", () => {
    const { container } = render(
      <NotificationItem notification={mockNotificationUnread} />,
    )

    // FileText icon for assignment_created type
    // Check for the icon container with blue color
    const iconContainer = container.querySelector(".bg-blue-100")
    expect(iconContainer).toBeInTheDocument()
  })

  it("displays correct icon for feedback_received type", () => {
    const { container } = render(
      <NotificationItem notification={mockNotificationRead} />,
    )

    // MessageSquare icon for feedback_received type
    // Check for the icon container with green color
    const iconContainer = container.querySelector(".bg-green-100")
    expect(iconContainer).toBeInTheDocument()
  })

  it("calls onClick handler when clicked", () => {
    const handleClick = vi.fn()
    render(
      <NotificationItem
        notification={mockNotificationUnread}
        onClick={handleClick}
      />,
    )

    const item = screen.getByRole("button")
    fireEvent.click(item)

    expect(handleClick).toHaveBeenCalledWith(mockNotificationUnread)
  })

  it("calls onClick handler on Enter key press", () => {
    const handleClick = vi.fn()
    render(
      <NotificationItem
        notification={mockNotificationUnread}
        onClick={handleClick}
      />,
    )

    const item = screen.getByRole("button")
    fireEvent.keyDown(item, { key: "Enter" })

    expect(handleClick).toHaveBeenCalledWith(mockNotificationUnread)
  })

  it("truncates long titles", () => {
    render(<NotificationItem notification={mockNotificationLong} />)

    // The title should be truncated
    const title = screen.getByText(/A very long notification title/i)
    expect(title).toBeInTheDocument()
    // The truncate class should be applied
    expect(title.className).toContain("truncate")
  })

  it("shows full message when showFullMessage is true", () => {
    render(
      <NotificationItem notification={mockNotificationLong} showFullMessage />,
    )

    const message = screen.getByText(/This is a very long message/i)
    expect(message.className).not.toContain("line-clamp-2")
  })

  it("applies read styling for read notifications", () => {
    render(<NotificationItem notification={mockNotificationRead} />)

    const title = screen.getByText(/Feedback on Your Work/i)
    expect(title.className).toContain("text-muted-foreground")
  })

  it("applies unread styling for unread notifications", () => {
    render(<NotificationItem notification={mockNotificationUnread} />)

    const title = screen.getByText(/New Assignment Available/i)
    expect(title.className).toContain("font-semibold")
  })
})
