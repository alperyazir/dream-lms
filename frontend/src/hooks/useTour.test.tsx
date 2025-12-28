/**
 * useTour Hook Tests
 * Story 12.2: Frontend - Tour Library Integration & Infrastructure
 *
 * Tests tour hook functionality including:
 * - Starting tour sets isActive to true
 * - Step navigation (next, prev)
 * - Skip tour calls API and sets isCompleted
 * - Complete tour calls API and sets isCompleted
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TourProvider } from "@/contexts/TourContext"
import type { TourStep } from "@/types/tour"
import { useTour } from "./useTour"

// Mock the UsersService
vi.mock("@/client", () => ({
  UsersService: {
    completeTour: vi.fn(),
  },
}))

import { UsersService } from "@/client"

const mockSteps: TourStep[] = [
  {
    target: "[data-tour='step-1']",
    title: "Step 1",
    content: "This is step 1",
  },
  {
    target: "[data-tour='step-2']",
    title: "Step 2",
    content: "This is step 2",
  },
  {
    target: "[data-tour='step-3']",
    title: "Step 3",
    content: "This is step 3",
  },
]

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

describe("useTour", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(UsersService.completeTour).mockResolvedValue({
      message: "Tour completed successfully",
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("starts tour and sets isActive to true", () => {
    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isActive).toBe(false)

    act(() => {
      result.current.startTour(mockSteps)
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.stepIndex).toBe(0)
    expect(result.current.steps).toHaveLength(3)
  })

  it("starts tour with tourId when provided", () => {
    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.startTour(mockSteps, "student-tour")
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.tourId).toBe("student-tour")
  })

  it("advances to next step", () => {
    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.startTour(mockSteps)
    })

    expect(result.current.stepIndex).toBe(0)

    act(() => {
      result.current.nextStep()
    })

    expect(result.current.stepIndex).toBe(1)

    act(() => {
      result.current.nextStep()
    })

    expect(result.current.stepIndex).toBe(2)
  })

  it("goes to previous step", () => {
    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.startTour(mockSteps)
    })

    // Go to step 2
    act(() => {
      result.current.nextStep()
      result.current.nextStep()
    })

    expect(result.current.stepIndex).toBe(2)

    act(() => {
      result.current.prevStep()
    })

    expect(result.current.stepIndex).toBe(1)
  })

  it("does not go below step 0", () => {
    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.startTour(mockSteps)
    })

    expect(result.current.stepIndex).toBe(0)

    act(() => {
      result.current.prevStep()
    })

    expect(result.current.stepIndex).toBe(0)
  })

  it("goes to specific step with goToStep", () => {
    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.startTour(mockSteps)
    })

    act(() => {
      result.current.goToStep(2)
    })

    expect(result.current.stepIndex).toBe(2)
  })

  it("calls API on skipTour", async () => {
    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.startTour(mockSteps)
    })

    await act(async () => {
      await result.current.skipTour()
    })

    expect(UsersService.completeTour).toHaveBeenCalledTimes(1)
    expect(result.current.isActive).toBe(false)
    expect(result.current.isCompleted).toBe(true)
  })

  it("marks tour as completed after skip even if API fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
    vi.mocked(UsersService.completeTour).mockRejectedValue(
      new Error("Network error"),
    )

    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.startTour(mockSteps)
    })

    await act(async () => {
      await result.current.skipTour()
    })

    expect(result.current.isActive).toBe(false)
    expect(result.current.isCompleted).toBe(true)
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("calls API on completeTour", async () => {
    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.startTour(mockSteps)
    })

    await act(async () => {
      await result.current.completeTour()
    })

    expect(UsersService.completeTour).toHaveBeenCalledTimes(1)
    expect(result.current.isActive).toBe(false)
    expect(result.current.isCompleted).toBe(true)
  })

  it("stops tour without marking as completed", () => {
    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.startTour(mockSteps)
    })

    expect(result.current.isActive).toBe(true)

    act(() => {
      result.current.stopTour()
    })

    expect(result.current.isActive).toBe(false)
    expect(result.current.isCompleted).toBe(false)
  })

  it("resets tour state completely", () => {
    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.startTour(mockSteps, "test-tour")
      result.current.nextStep()
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.stepIndex).toBe(1)
    expect(result.current.tourId).toBe("test-tour")

    act(() => {
      result.current.resetTour()
    })

    expect(result.current.isActive).toBe(false)
    expect(result.current.stepIndex).toBe(0)
    expect(result.current.tourId).toBeNull()
    expect(result.current.steps).toHaveLength(0)
  })

  it("completes tour when advancing past last step", () => {
    const { result } = renderHook(() => useTour(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.startTour(mockSteps)
    })

    // Go through all steps
    act(() => {
      result.current.nextStep() // step 1
      result.current.nextStep() // step 2
      result.current.nextStep() // past last step
    })

    expect(result.current.isActive).toBe(false)
    expect(result.current.isCompleted).toBe(true)
  })
})
