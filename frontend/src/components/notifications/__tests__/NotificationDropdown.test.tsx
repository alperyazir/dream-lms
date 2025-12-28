/**
 * NotificationDropdown Component Tests
 * Story 16.1: Fix Notification Click Navigation
 *
 * Tests for notification click behavior - navigation happens first,
 * mark-as-read fires in background (non-blocking).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as useNotificationsModule from "@/hooks/useNotifications"
import type { Notification } from "@/types/notification"
import { NotificationDropdown } from "../NotificationDropdown"

// Mock navigate function
const mockNavigate = vi.fn()

// Mock the router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
}))

// Mock the hooks
vi.mock("@/hooks/useNotifications", () => ({
  useNotificationPanel: vi.fn(),
}))

// Sample notifications for testing
const mockUnreadNotification: Notification = {
  id: "notif-1",
  user_id: "user-1",
  type: "assignment_created",
  title: "New Assignment",
  message: "You have a new assignment to complete.",
  link: "/assignments/123",
  is_read: false,
  created_at: new Date().toISOString(),
}

const mockReadNotification: Notification = {
  id: "notif-2",
  user_id: "user-1",
  type: "feedback_received",
  title: "Feedback Received",
  message: "Your teacher left feedback.",
  link: "/submissions/456",
  is_read: true,
  created_at: new Date().toISOString(),
}

const mockNotificationNoLink: Notification = {
  id: "notif-3",
  user_id: "user-1",
  type: "system_announcement",
  title: "System Announcement",
  message: "Important system update.",
  link: null,
  is_read: false,
  created_at: new Date().toISOString(),
}

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("NotificationDropdown", () => {
  let mockOnNotificationClick: ReturnType<typeof vi.fn>
  let mockOnMarkAllRead: ReturnType<typeof vi.fn>
  let mockOnClose: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnNotificationClick = vi.fn()
    mockOnMarkAllRead = vi.fn()
    mockOnClose = vi.fn()

    // Default mock
    vi.mocked(useNotificationsModule.useNotificationPanel).mockReturnValue({
      notifications: [mockUnreadNotification, mockReadNotification],
      total: 2,
      hasMore: false,
      isLoading: false,
      unreadCount: 1,
      onNotificationClick: mockOnNotificationClick,
      onMarkAllRead: mockOnMarkAllRead,
      isMarkingRead: false,
      isMarkingAllRead: false,
      refetch: vi.fn(),
    })
  })

  describe("Story 16.1: Click Navigation Behavior", () => {
    it("navigates immediately on click (synchronous)", () => {
      render(<NotificationDropdown onClose={mockOnClose} />, {
        wrapper: createWrapper(),
      })

      const item = screen.getByText("New Assignment")
      fireEvent.click(item)

      // Navigation should be called first
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/assignments/123" })
    })

    it("closes dropdown after navigation is initiated", () => {
      render(<NotificationDropdown onClose={mockOnClose} />, {
        wrapper: createWrapper(),
      })

      const item = screen.getByText("New Assignment")
      fireEvent.click(item)

      // onClose should be called
      expect(mockOnClose).toHaveBeenCalled()
    })

    it("marks notification as read in background (non-blocking)", () => {
      render(<NotificationDropdown onClose={mockOnClose} />, {
        wrapper: createWrapper(),
      })

      const item = screen.getByText("New Assignment")
      fireEvent.click(item)

      // onNotificationClick should be called (fire-and-forget)
      expect(mockOnNotificationClick).toHaveBeenCalledWith(
        mockUnreadNotification,
      )
    })

    it("navigates to fallback /notifications when link is null", () => {
      vi.mocked(useNotificationsModule.useNotificationPanel).mockReturnValue({
        notifications: [mockNotificationNoLink],
        total: 1,
        hasMore: false,
        isLoading: false,
        unreadCount: 1,
        onNotificationClick: mockOnNotificationClick,
        onMarkAllRead: mockOnMarkAllRead,
        isMarkingRead: false,
        isMarkingAllRead: false,
        refetch: vi.fn(),
      })

      render(<NotificationDropdown onClose={mockOnClose} />, {
        wrapper: createWrapper(),
      })

      const item = screen.getByText("System Announcement")
      fireEvent.click(item)

      // Should navigate to fallback /notifications
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/notifications" })
    })

    it("does not call onNotificationClick for already-read notifications", () => {
      vi.mocked(useNotificationsModule.useNotificationPanel).mockReturnValue({
        notifications: [mockReadNotification],
        total: 1,
        hasMore: false,
        isLoading: false,
        unreadCount: 0,
        onNotificationClick: mockOnNotificationClick,
        onMarkAllRead: mockOnMarkAllRead,
        isMarkingRead: false,
        isMarkingAllRead: false,
        refetch: vi.fn(),
      })

      render(<NotificationDropdown onClose={mockOnClose} />, {
        wrapper: createWrapper(),
      })

      const item = screen.getByText("Feedback Received")
      fireEvent.click(item)

      // Navigation should still happen
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/submissions/456" })
      // But onNotificationClick should NOT be called (already read)
      expect(mockOnNotificationClick).not.toHaveBeenCalled()
    })

    it("calls handlers in correct order: navigate, close, then mark-as-read", () => {
      const callOrder: string[] = []

      mockNavigate.mockImplementation(() => {
        callOrder.push("navigate")
      })

      mockOnClose.mockImplementation(() => {
        callOrder.push("close")
      })

      mockOnNotificationClick.mockImplementation(() => {
        callOrder.push("markAsRead")
      })

      render(<NotificationDropdown onClose={mockOnClose} />, {
        wrapper: createWrapper(),
      })

      const item = screen.getByText("New Assignment")
      fireEvent.click(item)

      expect(callOrder).toEqual(["navigate", "close", "markAsRead"])
    })
  })

  describe("Existing functionality", () => {
    it("renders notification list", () => {
      render(<NotificationDropdown />, { wrapper: createWrapper() })

      expect(screen.getByText("New Assignment")).toBeInTheDocument()
      expect(screen.getByText("Feedback Received")).toBeInTheDocument()
    })

    it("shows empty state when no notifications", () => {
      vi.mocked(useNotificationsModule.useNotificationPanel).mockReturnValue({
        notifications: [],
        total: 0,
        hasMore: false,
        isLoading: false,
        unreadCount: 0,
        onNotificationClick: mockOnNotificationClick,
        onMarkAllRead: mockOnMarkAllRead,
        isMarkingRead: false,
        isMarkingAllRead: false,
        refetch: vi.fn(),
      })

      render(<NotificationDropdown />, { wrapper: createWrapper() })

      expect(screen.getByText("No notifications")).toBeInTheDocument()
    })

    it("shows loading skeleton while loading", () => {
      vi.mocked(useNotificationsModule.useNotificationPanel).mockReturnValue({
        notifications: [],
        total: 0,
        hasMore: false,
        isLoading: true,
        unreadCount: 0,
        onNotificationClick: mockOnNotificationClick,
        onMarkAllRead: mockOnMarkAllRead,
        isMarkingRead: false,
        isMarkingAllRead: false,
        refetch: vi.fn(),
      })

      const { container } = render(<NotificationDropdown />, {
        wrapper: createWrapper(),
      })

      // Should show skeleton elements (Skeleton component renders with animate-pulse)
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it("shows mark all read button when unread count > 0", () => {
      render(<NotificationDropdown />, { wrapper: createWrapper() })

      expect(screen.getByText("Mark all read")).toBeInTheDocument()
    })

    it("calls onMarkAllRead when mark all read button clicked", () => {
      render(<NotificationDropdown />, { wrapper: createWrapper() })

      const markAllReadButton = screen.getByText("Mark all read")
      fireEvent.click(markAllReadButton)

      expect(mockOnMarkAllRead).toHaveBeenCalled()
    })
  })
})
