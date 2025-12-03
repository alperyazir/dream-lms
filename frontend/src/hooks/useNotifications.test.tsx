/**
 * useNotifications Hook Tests
 * Story 6.1: Notification System Foundation
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor, act } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
} from "./useNotifications"
import * as notificationsApi from "@/services/notificationsApi"
import type { Notification, NotificationListResponse } from "@/types/notification"

// Mock the API
vi.mock("@/services/notificationsApi", () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
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

// Mock data
const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    user_id: "user-1",
    type: "assignment_created",
    title: "New Assignment",
    message: "You have a new assignment",
    link: "/assignments/1",
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "notif-2",
    user_id: "user-1",
    type: "feedback_received",
    title: "Feedback",
    message: "You received feedback",
    link: "/submissions/1",
    is_read: true,
    created_at: new Date().toISOString(),
  },
]

const mockNotificationListResponse: NotificationListResponse = {
  notifications: mockNotifications,
  total: 2,
  limit: 20,
  offset: 0,
  has_more: false,
}

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches notifications successfully", async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue(
      mockNotificationListResponse
    )

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.notifications).toEqual(mockNotifications)
    expect(result.current.total).toBe(2)
    expect(result.current.hasMore).toBe(false)
  })

  it("passes query params to API", async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue(
      mockNotificationListResponse
    )

    renderHook(
      () =>
        useNotifications({
          unread_only: true,
          type: "assignment_created",
          limit: 10,
          offset: 0,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
        unread_only: true,
        type: "assignment_created",
        limit: 10,
        offset: 0,
      })
    })
  })

  it("returns empty array when no notifications", async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue({
      notifications: [],
      total: 0,
      limit: 20,
      offset: 0,
      has_more: false,
    })

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.notifications).toEqual([])
    expect(result.current.total).toBe(0)
  })
})

describe("useUnreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches unread count successfully", async () => {
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue({ count: 5 })

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.count).toBe(5)
  })

  it("returns 0 when no unread notifications", async () => {
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue({ count: 0 })

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.count).toBe(0)
  })
})

describe("useMarkAsRead", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("marks notification as read successfully", async () => {
    const updatedNotification: Notification = {
      ...mockNotifications[0],
      is_read: true,
    }
    vi.mocked(notificationsApi.markAsRead).mockResolvedValue(updatedNotification)

    const { result } = renderHook(() => useMarkAsRead(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.markAsRead("notif-1")
    })

    await waitFor(() => {
      expect(result.current.isMarking).toBe(false)
    })

    expect(notificationsApi.markAsRead).toHaveBeenCalledWith("notif-1")
  })

  it("provides async mutation function", async () => {
    const updatedNotification: Notification = {
      ...mockNotifications[0],
      is_read: true,
    }
    vi.mocked(notificationsApi.markAsRead).mockResolvedValue(updatedNotification)

    const { result } = renderHook(() => useMarkAsRead(), {
      wrapper: createWrapper(),
    })

    let response: Notification | undefined
    await act(async () => {
      response = await result.current.markAsReadAsync("notif-1")
    })

    expect(response).toEqual(updatedNotification)
  })
})

describe("useMarkAllAsRead", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("marks all notifications as read successfully", async () => {
    vi.mocked(notificationsApi.markAllAsRead).mockResolvedValue({
      marked_count: 5,
    })

    const { result } = renderHook(() => useMarkAllAsRead(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.markAllAsRead()
    })

    await waitFor(() => {
      expect(result.current.isMarking).toBe(false)
    })

    expect(notificationsApi.markAllAsRead).toHaveBeenCalled()
    expect(result.current.markedCount).toBe(5)
  })

  it("provides async mutation function", async () => {
    vi.mocked(notificationsApi.markAllAsRead).mockResolvedValue({
      marked_count: 3,
    })

    const { result } = renderHook(() => useMarkAllAsRead(), {
      wrapper: createWrapper(),
    })

    let response: { marked_count: number } | undefined
    await act(async () => {
      response = await result.current.markAllAsReadAsync()
    })

    expect(response?.marked_count).toBe(3)
  })
})

describe("Query Keys", () => {
  it("has correct notification query key", () => {
    expect(NOTIFICATIONS_QUERY_KEY).toEqual(["notifications"])
  })

  it("has correct unread count query key", () => {
    expect(UNREAD_COUNT_QUERY_KEY).toEqual(["notifications", "unread-count"])
  })
})
