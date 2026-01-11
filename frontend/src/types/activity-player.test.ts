import { describe, expect, it } from "vitest"
import {
  type ActivityPlayerProps,
  type ActivityResult,
  createActivityResult,
  createProgressUpdate,
  isActivityPlayerProps,
  type ProgressUpdate,
} from "./activity-player"

describe("activity-player types", () => {
  describe("isActivityPlayerProps", () => {
    it("returns true for valid ActivityPlayerProps", () => {
      const validProps: ActivityPlayerProps = {
        assignmentId: "test-123",
        activityType: "vocabulary_quiz",
        activityContent: {
          type: "vocabulary_quiz",
          questions: [],
        },
        onComplete: () => {},
        onProgress: () => {},
      }

      expect(isActivityPlayerProps(validProps)).toBe(true)
    })

    it("returns false for null", () => {
      expect(isActivityPlayerProps(null)).toBe(false)
    })

    it("returns false for undefined", () => {
      expect(isActivityPlayerProps(undefined)).toBe(false)
    })

    it("returns false for non-object", () => {
      expect(isActivityPlayerProps("not an object")).toBe(false)
      expect(isActivityPlayerProps(123)).toBe(false)
      expect(isActivityPlayerProps(true)).toBe(false)
    })

    it("returns false for object missing assignmentId", () => {
      const invalid = {
        activityType: "vocabulary_quiz",
        activityContent: {},
        onComplete: () => {},
        onProgress: () => {},
      }

      expect(isActivityPlayerProps(invalid)).toBe(false)
    })

    it("returns false for object missing callbacks", () => {
      const invalid = {
        assignmentId: "test-123",
        activityType: "vocabulary_quiz",
        activityContent: {},
      }

      expect(isActivityPlayerProps(invalid)).toBe(false)
    })

    it("returns false when callbacks are not functions", () => {
      const invalid = {
        assignmentId: "test-123",
        activityType: "vocabulary_quiz",
        activityContent: {},
        onComplete: "not a function",
        onProgress: "not a function",
      }

      expect(isActivityPlayerProps(invalid)).toBe(false)
    })
  })

  describe("createActivityResult", () => {
    it("creates a valid ActivityResult", () => {
      const result = createActivityResult(85, 100, 17, 20, 300, {
        answers: { q1: "answer1" },
      })

      const expected: ActivityResult = {
        status: "completed",
        score: 85,
        maxScore: 100,
        correctCount: 17,
        totalCount: 20,
        timeSpent: 300,
        responseData: { answers: { q1: "answer1" } },
      }

      expect(result).toEqual(expected)
    })

    it("creates result with zero score", () => {
      const result = createActivityResult(0, 100, 0, 10, 120, {})

      expect(result.score).toBe(0)
      expect(result.correctCount).toBe(0)
      expect(result.status).toBe("completed")
    })

    it("creates result with perfect score", () => {
      const result = createActivityResult(100, 100, 10, 10, 180, {})

      expect(result.score).toBe(100)
      expect(result.correctCount).toBe(10)
      expect(result.totalCount).toBe(10)
    })

    it("creates result with complex response data", () => {
      const complexData = {
        answers: { q1: "a", q2: "b", q3: "c" },
        attemptCounts: { q1: 1, q2: 2, q3: 1 },
        metadata: { difficulty: "medium", language: "en" },
      }

      const result = createActivityResult(75, 100, 3, 4, 240, complexData)

      expect(result.responseData).toEqual(complexData)
    })
  })

  describe("createProgressUpdate", () => {
    it("creates a valid ProgressUpdate with all fields", () => {
      const update = createProgressUpdate(
        150,
        { answers: { q1: "answer1" } },
        50,
        100,
      )

      const expected: ProgressUpdate = {
        status: "in_progress",
        timeSpent: 150,
        responseData: { answers: { q1: "answer1" } },
        score: 50,
        maxScore: 100,
      }

      expect(update).toEqual(expected)
    })

    it("creates progress update without score fields", () => {
      const update = createProgressUpdate(60, { answers: {} })

      expect(update.status).toBe("in_progress")
      expect(update.timeSpent).toBe(60)
      expect(update.responseData).toEqual({ answers: {} })
      expect(update.score).toBeUndefined()
      expect(update.maxScore).toBeUndefined()
    })

    it("creates progress update with only score", () => {
      const update = createProgressUpdate(90, {}, 25)

      expect(update.score).toBe(25)
      expect(update.maxScore).toBeUndefined()
    })

    it("creates progress update with only maxScore", () => {
      const update = createProgressUpdate(90, {}, undefined, 100)

      expect(update.score).toBeUndefined()
      expect(update.maxScore).toBe(100)
    })

    it("handles empty response data", () => {
      const update = createProgressUpdate(30, {})

      expect(update.responseData).toEqual({})
      expect(update.timeSpent).toBe(30)
    })

    it("handles complex response data", () => {
      const complexData = {
        currentQuestion: 3,
        answers: { q1: "a", q2: "b" },
        partialScores: { q1: 10, q2: 8 },
      }

      const update = createProgressUpdate(120, complexData, 18, 20)

      expect(update.responseData).toEqual(complexData)
    })
  })

  describe("ActivityResult type", () => {
    it("enforces status as completed", () => {
      const result: ActivityResult = {
        status: "completed",
        score: 90,
        maxScore: 100,
        correctCount: 9,
        totalCount: 10,
        timeSpent: 300,
        responseData: {},
      }

      expect(result.status).toBe("completed")
    })
  })

  describe("ProgressUpdate type", () => {
    it("enforces status as in_progress", () => {
      const update: ProgressUpdate = {
        status: "in_progress",
        timeSpent: 150,
        responseData: {},
      }

      expect(update.status).toBe("in_progress")
    })
  })
})
