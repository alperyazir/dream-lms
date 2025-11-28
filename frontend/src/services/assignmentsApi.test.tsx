/**
 * Assignment API Service Tests
 * Story 4.7: Assignment Submission & Result Storage - QA Fixes
 *
 * Tests for submitAssignment function
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import axios from "axios"
import { submitAssignment } from "./assignmentsApi"
import type {
  AssignmentSubmitRequest,
  AssignmentSubmissionResponse,
} from "../types/assignment"

// Mock axios
vi.mock("axios")

// Mock OpenAPI config
vi.mock("../client", () => ({
  OpenAPI: {
    BASE: "http://localhost:8000",
    TOKEN: "mock-jwt-token",
  },
}))

describe("submitAssignment", () => {
  const mockAssignmentId = "test-assignment-123"
  const mockResponse: AssignmentSubmissionResponse = {
    success: true,
    message: "Assignment submitted successfully",
    score: 85,
    completed_at: "2025-11-25T10:30:00Z",
    assignment_id: mockAssignmentId,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default axios mock behavior
    const mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    }

    vi.mocked(axios.create).mockReturnValue(
      mockAxiosInstance as unknown as ReturnType<typeof axios.create>,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sends POST request to correct endpoint", async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: mockResponse })
    vi.mocked(axios.create).mockReturnValue({
      post: mockPost,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>)

    const submitData: AssignmentSubmitRequest = {
      answers_json: { type: "circle", selections: { "0": 1 } },
      score: 85,
      time_spent_minutes: 10,
    }

    await submitAssignment(mockAssignmentId, submitData)

    expect(mockPost).toHaveBeenCalledWith(
      `/api/v1/assignments/${mockAssignmentId}/submit`,
      expect.objectContaining({
        answers_json: submitData.answers_json,
        score: submitData.score,
        time_spent_minutes: submitData.time_spent_minutes,
      }),
    )
  })

  it("auto-populates completed_at if not provided", async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: mockResponse })
    vi.mocked(axios.create).mockReturnValue({
      post: mockPost,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>)

    const submitData: AssignmentSubmitRequest = {
      answers_json: {},
      score: 75,
      time_spent_minutes: 8,
    }

    await submitAssignment(mockAssignmentId, submitData)

    const callArgs = mockPost.mock.calls[0][1]
    expect(callArgs).toHaveProperty("completed_at")
    expect(typeof callArgs.completed_at).toBe("string")
    // Verify it's a valid ISO 8601 date string
    expect(new Date(callArgs.completed_at).toISOString()).toBe(
      callArgs.completed_at,
    )
  })

  it("uses provided completed_at if given", async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: mockResponse })
    vi.mocked(axios.create).mockReturnValue({
      post: mockPost,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>)

    const customCompletedAt = "2025-11-24T15:45:00Z"
    const submitData: AssignmentSubmitRequest = {
      answers_json: {},
      score: 90,
      time_spent_minutes: 12,
      completed_at: customCompletedAt,
    }

    await submitAssignment(mockAssignmentId, submitData)

    const callArgs = mockPost.mock.calls[0][1]
    expect(callArgs.completed_at).toBe(customCompletedAt)
  })

  it("includes all required fields in payload", async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: mockResponse })
    vi.mocked(axios.create).mockReturnValue({
      post: mockPost,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>)

    const submitData: AssignmentSubmitRequest = {
      answers_json: {
        type: "dragdroppicture",
        placements: { "100-200": "word1" },
      },
      score: 66.67,
      time_spent_minutes: 15,
    }

    await submitAssignment(mockAssignmentId, submitData)

    const callArgs = mockPost.mock.calls[0][1]
    expect(callArgs).toHaveProperty("answers_json")
    expect(callArgs).toHaveProperty("score")
    expect(callArgs).toHaveProperty("time_spent_minutes")
    expect(callArgs).toHaveProperty("completed_at")
    expect(callArgs.answers_json).toEqual(submitData.answers_json)
    expect(callArgs.score).toBe(submitData.score)
    expect(callArgs.time_spent_minutes).toBe(submitData.time_spent_minutes)
  })

  it("returns submission response on success", async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: mockResponse })
    vi.mocked(axios.create).mockReturnValue({
      post: mockPost,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>)

    const submitData: AssignmentSubmitRequest = {
      answers_json: {},
      score: 100,
      time_spent_minutes: 5,
    }

    const result = await submitAssignment(mockAssignmentId, submitData)

    expect(result).toEqual(mockResponse)
    expect(result.success).toBe(true)
    expect(result.score).toBe(85)
    expect(result.assignment_id).toBe(mockAssignmentId)
  })

  it("throws error on network failure", async () => {
    const networkError = new Error("Network Error")
    const mockPost = vi.fn().mockRejectedValue(networkError)
    vi.mocked(axios.create).mockReturnValue({
      post: mockPost,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>)

    const submitData: AssignmentSubmitRequest = {
      answers_json: {},
      score: 70,
      time_spent_minutes: 6,
    }

    await expect(submitAssignment(mockAssignmentId, submitData)).rejects.toThrow(
      "Network Error",
    )
  })

  it("throws error on server error (500)", async () => {
    const serverError = {
      response: {
        status: 500,
        data: { detail: "Internal Server Error" },
      },
    }
    const mockPost = vi.fn().mockRejectedValue(serverError)
    vi.mocked(axios.create).mockReturnValue({
      post: mockPost,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>)

    const submitData: AssignmentSubmitRequest = {
      answers_json: {},
      score: 80,
      time_spent_minutes: 7,
    }

    await expect(
      submitAssignment(mockAssignmentId, submitData),
    ).rejects.toMatchObject(serverError)
  })

  it("throws error on validation error (400)", async () => {
    const validationError = {
      response: {
        status: 400,
        data: { detail: "Invalid score value" },
      },
    }
    const mockPost = vi.fn().mockRejectedValue(validationError)
    vi.mocked(axios.create).mockReturnValue({
      post: mockPost,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>)

    const submitData: AssignmentSubmitRequest = {
      answers_json: {},
      score: 150, // Invalid score > 100
      time_spent_minutes: 5,
    }

    await expect(
      submitAssignment(mockAssignmentId, submitData),
    ).rejects.toMatchObject(validationError)
  })

  it("handles complex answer structures", async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: mockResponse })
    vi.mocked(axios.create).mockReturnValue({
      post: mockPost,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>)

    const complexAnswers = {
      type: "puzzlefindwords",
      foundWords: ["cat", "dog", "bird"],
      selections: [
        { word: "cat", positions: [[0, 0], [0, 1], [0, 2]] },
        { word: "dog", positions: [[1, 0], [1, 1], [1, 2]] },
      ],
    }

    const submitData: AssignmentSubmitRequest = {
      answers_json: complexAnswers,
      score: 100,
      time_spent_minutes: 20,
    }

    await submitAssignment(mockAssignmentId, submitData)

    const callArgs = mockPost.mock.calls[0][1]
    expect(callArgs.answers_json).toEqual(complexAnswers)
  })

  it("handles fractional scores", async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: mockResponse })
    vi.mocked(axios.create).mockReturnValue({
      post: mockPost,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>)

    const submitData: AssignmentSubmitRequest = {
      answers_json: {},
      score: 66.67, // Fractional score
      time_spent_minutes: 8,
    }

    await submitAssignment(mockAssignmentId, submitData)

    const callArgs = mockPost.mock.calls[0][1]
    expect(callArgs.score).toBe(66.67)
  })

  it("handles zero score", async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: mockResponse })
    vi.mocked(axios.create).mockReturnValue({
      post: mockPost,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>)

    const submitData: AssignmentSubmitRequest = {
      answers_json: { type: "circle", selections: {} },
      score: 0, // Zero score (all wrong)
      time_spent_minutes: 3,
    }

    await submitAssignment(mockAssignmentId, submitData)

    const callArgs = mockPost.mock.calls[0][1]
    expect(callArgs.score).toBe(0)
  })
})
