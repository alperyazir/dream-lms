/**
 * useAssignmentSubmission Hook Tests
 * Story 4.7: Assignment Submission & Result Storage - QA Fixes
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as assignmentsApi from "@/services/assignmentsApi"
import type { AssignmentSubmissionResponse } from "@/types/assignment"
import { useAssignmentSubmission } from "./useAssignmentSubmission"

// Mock the API module
vi.mock("@/services/assignmentsApi", () => ({
  submitAssignment: vi.fn(),
}))

// Mock the toast hook
vi.mock("./useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

describe("useAssignmentSubmission", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    const rootRoute = createRootRoute()
    const router = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory(),
    })

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router}>{children}</RouterProvider>
      </QueryClientProvider>
    )
  }

  it("returns correct properties", () => {
    const { result } = renderHook(
      () =>
        useAssignmentSubmission({
          assignmentId: "test-assignment-id",
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current).toHaveProperty("submit")
    expect(result.current).toHaveProperty("isSubmitting")
    expect(result.current).toHaveProperty("error")
    expect(result.current).toHaveProperty("reset")
    expect(typeof result.current.submit).toBe("function")
    expect(typeof result.current.isSubmitting).toBe("boolean")
    expect(typeof result.current.reset).toBe("function")
  })

  it("starts with isSubmitting false and no error", () => {
    const { result } = renderHook(
      () =>
        useAssignmentSubmission({
          assignmentId: "test-assignment-id",
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it("calls submitAssignment with correct parameters", async () => {
    const mockResponse: AssignmentSubmissionResponse = {
      success: true,
      message: "Assignment submitted successfully",
      score: 85,
      completed_at: "2025-11-25T10:30:00Z",
      assignment_id: "test-assignment-id",
    }

    vi.mocked(assignmentsApi.submitAssignment).mockResolvedValue(mockResponse)

    const { result } = renderHook(
      () =>
        useAssignmentSubmission({
          assignmentId: "test-assignment-id",
        }),
      { wrapper: createWrapper() },
    )

    const submitData = {
      answers_json: { type: "circle", selections: { "0": 1 } },
      score: 85,
      time_spent_minutes: 10,
    }

    result.current.submit(submitData)

    await waitFor(() => {
      expect(assignmentsApi.submitAssignment).toHaveBeenCalledWith(
        "test-assignment-id",
        submitData,
      )
    })
  })

  it("invalidates queries on successful submission", async () => {
    const mockResponse: AssignmentSubmissionResponse = {
      success: true,
      message: "Assignment submitted successfully",
      score: 90,
      completed_at: "2025-11-25T10:30:00Z",
      assignment_id: "test-assignment-id",
    }

    vi.mocked(assignmentsApi.submitAssignment).mockResolvedValue(mockResponse)

    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(
      () =>
        useAssignmentSubmission({
          assignmentId: "test-assignment-id",
        }),
      { wrapper: createWrapper() },
    )

    const submitData = {
      answers_json: { type: "circle", selections: {} },
      score: 90,
      time_spent_minutes: 5,
    }

    result.current.submit(submitData)

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["assignments"],
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["assignment", "test-assignment-id"],
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["student", "assignments"],
      })
    })
  })

  it("calls onSuccess callback on successful submission", async () => {
    const mockResponse: AssignmentSubmissionResponse = {
      success: true,
      message: "Assignment submitted successfully",
      score: 75,
      completed_at: "2025-11-25T10:30:00Z",
      assignment_id: "test-assignment-id",
    }

    vi.mocked(assignmentsApi.submitAssignment).mockResolvedValue(mockResponse)

    const onSuccess = vi.fn()

    const { result } = renderHook(
      () =>
        useAssignmentSubmission({
          assignmentId: "test-assignment-id",
          onSuccess,
        }),
      { wrapper: createWrapper() },
    )

    const submitData = {
      answers_json: {},
      score: 75,
      time_spent_minutes: 8,
    }

    result.current.submit(submitData)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it("calls onError callback on failed submission", async () => {
    const mockError = new Error("Network error")
    vi.mocked(assignmentsApi.submitAssignment).mockRejectedValue(mockError)

    const onError = vi.fn()

    const { result } = renderHook(
      () =>
        useAssignmentSubmission({
          assignmentId: "test-assignment-id",
          onError,
        }),
      { wrapper: createWrapper() },
    )

    const submitData = {
      answers_json: {},
      score: 80,
      time_spent_minutes: 6,
    }

    result.current.submit(submitData)

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError)
    })
  })

  it("sets error state on failed submission", async () => {
    const mockError = new Error("Submission failed")
    vi.mocked(assignmentsApi.submitAssignment).mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useAssignmentSubmission({
          assignmentId: "test-assignment-id",
        }),
      { wrapper: createWrapper() },
    )

    const submitData = {
      answers_json: {},
      score: 70,
      time_spent_minutes: 7,
    }

    result.current.submit(submitData)

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })

  it("reset clears error state", async () => {
    const mockError = new Error("Submission failed")
    vi.mocked(assignmentsApi.submitAssignment).mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useAssignmentSubmission({
          assignmentId: "test-assignment-id",
        }),
      { wrapper: createWrapper() },
    )

    const submitData = {
      answers_json: {},
      score: 60,
      time_spent_minutes: 9,
    }

    // Submit and wait for error
    result.current.submit(submitData)
    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    // Reset and check error is cleared
    result.current.reset()
    await waitFor(() => {
      expect(result.current.error).toBeNull()
    })
  })

  it("sets isSubmitting to true during submission", async () => {
    // Create a promise we can control
    let resolveSubmission: (value: AssignmentSubmissionResponse) => void
    const submissionPromise = new Promise<AssignmentSubmissionResponse>(
      (resolve) => {
        resolveSubmission = resolve
      },
    )

    vi.mocked(assignmentsApi.submitAssignment).mockReturnValue(
      submissionPromise,
    )

    const { result } = renderHook(
      () =>
        useAssignmentSubmission({
          assignmentId: "test-assignment-id",
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current.isSubmitting).toBe(false)

    const submitData = {
      answers_json: {},
      score: 95,
      time_spent_minutes: 4,
    }

    result.current.submit(submitData)

    // Should be submitting
    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(true)
    })

    // Resolve the submission
    resolveSubmission!({
      success: true,
      message: "Success",
      score: 95,
      completed_at: "2025-11-25T10:30:00Z",
      assignment_id: "test-assignment-id",
    })

    // Should no longer be submitting
    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false)
    })
  })
})
