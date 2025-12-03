/**
 * NotificationBell Component Tests
 * Story 6.1: Notification System Foundation
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, fireEvent } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NotificationBell } from "../NotificationBell"
import * as useNotificationsModule from "@/hooks/useNotifications"

// Mock the router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

// Mock the hooks
vi.mock("@/hooks/useNotifications", () => ({
  useUnreadCount: vi.fn(),
  useNotificationPanel: vi.fn(),
}))

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

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for useNotificationPanel
    vi.mocked(useNotificationsModule.useNotificationPanel).mockReturnValue({
      notifications: [],
      total: 0,
      hasMore: false,
      isLoading: false,
      unreadCount: 0,
      onNotificationClick: vi.fn(),
      onMarkAllRead: vi.fn(),
      isMarkingRead: false,
      isMarkingAllRead: false,
      refetch: vi.fn(),
    })
  })

  it("renders bell icon", () => {
    vi.mocked(useNotificationsModule.useUnreadCount).mockReturnValue({
      count: 0,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<NotificationBell />, { wrapper: createWrapper() })

    // Should render the bell button
    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument()
  })

  it("shows unread count badge when count > 0", () => {
    vi.mocked(useNotificationsModule.useUnreadCount).mockReturnValue({
      count: 5,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<NotificationBell />, { wrapper: createWrapper() })

    // Badge should show the count
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("hides badge when count is 0", () => {
    vi.mocked(useNotificationsModule.useUnreadCount).mockReturnValue({
      count: 0,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<NotificationBell />, { wrapper: createWrapper() })

    // No badge should be visible
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("shows 99+ for counts over 99", () => {
    vi.mocked(useNotificationsModule.useUnreadCount).mockReturnValue({
      count: 150,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<NotificationBell />, { wrapper: createWrapper() })

    expect(screen.getByText("99+")).toBeInTheDocument()
  })

  it("includes unread count in aria-label when there are unread notifications", () => {
    vi.mocked(useNotificationsModule.useUnreadCount).mockReturnValue({
      count: 3,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<NotificationBell />, { wrapper: createWrapper() })

    expect(
      screen.getByRole("button", { name: /notifications.*3 unread/i })
    ).toBeInTheDocument()
  })

  it("renders with small size variant", () => {
    vi.mocked(useNotificationsModule.useUnreadCount).mockReturnValue({
      count: 2,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    const { container } = render(<NotificationBell size="sm" />, {
      wrapper: createWrapper(),
    })

    // Small size should have h-9 w-9 classes
    const button = container.querySelector("button")
    expect(button?.className).toContain("h-9")
    expect(button?.className).toContain("w-9")
  })

  it("opens popover on click", async () => {
    vi.mocked(useNotificationsModule.useUnreadCount).mockReturnValue({
      count: 1,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    vi.mocked(useNotificationsModule.useNotificationPanel).mockReturnValue({
      notifications: [],
      total: 0,
      hasMore: false,
      isLoading: false,
      unreadCount: 1,
      onNotificationClick: vi.fn(),
      onMarkAllRead: vi.fn(),
      isMarkingRead: false,
      isMarkingAllRead: false,
      refetch: vi.fn(),
    })

    render(<NotificationBell />, { wrapper: createWrapper() })

    const button = screen.getByRole("button", { name: /notifications/i })
    fireEvent.click(button)

    // Should show notification dropdown content
    // The popover title should appear
    expect(await screen.findByText("Notifications")).toBeInTheDocument()
  })
})
