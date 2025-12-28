/**
 * TourTrigger Component Tests
 * Story 12.4: Frontend - Tour Trigger & Flow Integration
 *
 * Tests tour trigger functionality including:
 * - Starts tour for teacher with has_completed_tour=false
 * - Starts tour for student with has_completed_tour=false
 * - Starts tour for publisher with has_completed_tour=false
 * - Does NOT start tour for admin
 * - Does NOT start tour if has_completed_tour=true
 * - Does NOT start tour if user is null/undefined
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { UserPublic, UserRole } from "@/client"
import { TourProvider } from "@/contexts/TourContext"
import { TourTrigger } from "./TourTrigger"

// Mock useAuth hook
const mockUser = vi.fn<[], { user: UserPublic | null | undefined }>()
vi.mock("@/hooks/useAuth", () => ({
  default: () => mockUser(),
}))

// Mock useTour hook
const mockStartTour = vi.fn()
const mockIsActive = vi.fn<[], boolean>()
vi.mock("@/hooks/useTour", () => ({
  useTour: () => ({
    startTour: mockStartTour,
    isActive: mockIsActive(),
  }),
}))

// Mock getTourStepsForRole
vi.mock("./steps", () => ({
  getTourStepsForRole: (role: UserRole) => {
    if (role === "admin") return []
    return [
      {
        target: "[data-tour='test']",
        title: "Test Step",
        content: "Test content",
      },
    ]
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TourProvider>{children}</TourProvider>
      </QueryClientProvider>
    )
  }
}

function createUser(overrides: Partial<UserPublic> = {}): UserPublic {
  return {
    id: "test-user-id",
    email: "test@example.com",
    is_active: true,
    is_superuser: false,
    full_name: "Test User",
    role: "teacher",
    has_completed_tour: false,
    must_change_password: false,
    ...overrides,
  }
}

describe("TourTrigger", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockIsActive.mockReturnValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("starts tour for teacher with has_completed_tour=false", () => {
    mockUser.mockReturnValue({
      user: createUser({ role: "teacher", has_completed_tour: false }),
    })

    render(<TourTrigger />, { wrapper: createWrapper() })

    // Tour should not start immediately
    expect(mockStartTour).not.toHaveBeenCalled()

    // Fast-forward past the 500ms delay
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockStartTour).toHaveBeenCalledTimes(1)
    expect(mockStartTour).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ target: "[data-tour='test']" }),
      ]),
      "onboarding",
    )
  })

  it("starts tour for student with has_completed_tour=false", () => {
    mockUser.mockReturnValue({
      user: createUser({ role: "student", has_completed_tour: false }),
    })

    render(<TourTrigger />, { wrapper: createWrapper() })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockStartTour).toHaveBeenCalledTimes(1)
    expect(mockStartTour).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ target: "[data-tour='test']" }),
      ]),
      "onboarding",
    )
  })

  it("starts tour for publisher with has_completed_tour=false", () => {
    mockUser.mockReturnValue({
      user: createUser({ role: "publisher", has_completed_tour: false }),
    })

    render(<TourTrigger />, { wrapper: createWrapper() })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockStartTour).toHaveBeenCalledTimes(1)
    expect(mockStartTour).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ target: "[data-tour='test']" }),
      ]),
      "onboarding",
    )
  })

  it("does NOT start tour for admin", () => {
    mockUser.mockReturnValue({
      user: createUser({ role: "admin", has_completed_tour: false }),
    })

    render(<TourTrigger />, { wrapper: createWrapper() })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockStartTour).not.toHaveBeenCalled()
  })

  it("does NOT start tour if has_completed_tour=true", () => {
    mockUser.mockReturnValue({
      user: createUser({ role: "teacher", has_completed_tour: true }),
    })

    render(<TourTrigger />, { wrapper: createWrapper() })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockStartTour).not.toHaveBeenCalled()
  })

  it("does NOT start tour if user is null", () => {
    mockUser.mockReturnValue({ user: null })

    render(<TourTrigger />, { wrapper: createWrapper() })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockStartTour).not.toHaveBeenCalled()
  })

  it("does NOT start tour if user is undefined", () => {
    mockUser.mockReturnValue({ user: undefined })

    render(<TourTrigger />, { wrapper: createWrapper() })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockStartTour).not.toHaveBeenCalled()
  })

  it("does NOT start tour if user role is undefined", () => {
    mockUser.mockReturnValue({ user: createUser({ role: undefined }) })

    render(<TourTrigger />, { wrapper: createWrapper() })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockStartTour).not.toHaveBeenCalled()
  })

  it("does NOT start tour if tour is already active", () => {
    mockUser.mockReturnValue({
      user: createUser({ role: "teacher", has_completed_tour: false }),
    })
    mockIsActive.mockReturnValue(true)

    render(<TourTrigger />, { wrapper: createWrapper() })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockStartTour).not.toHaveBeenCalled()
  })

  it("renders nothing visible", () => {
    mockUser.mockReturnValue({ user: createUser() })

    const { container } = render(<TourTrigger />, { wrapper: createWrapper() })

    expect(container.innerHTML).toBe("")
  })
})
