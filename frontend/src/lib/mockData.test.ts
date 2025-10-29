import { describe, it, expect } from "vitest"
import {
  mockBooks,
  mockActivities,
  mockAssignments,
  mockAssignmentStudents,
  type Book,
  type Activity,
  type AssignmentFull,
  type AssignmentStudent,
} from "./mockData"

describe("Mock Data Structures", () => {
  describe("Books", () => {
    it("should have at least 12 books", () => {
      expect(mockBooks.length).toBeGreaterThanOrEqual(12)
    })

    it("should have valid Book structure for all books", () => {
      mockBooks.forEach((book: Book) => {
        // Check required fields exist
        expect(book.id).toBeDefined()
        expect(book.title).toBeDefined()
        expect(book.publisher).toBeDefined()
        expect(book.publisherId).toBeDefined()
        expect(book.coverUrl).toBeDefined()
        expect(book.description).toBeDefined()
        expect(book.grade).toBeDefined()
        expect(book.activityCount).toBeDefined()
        expect(book.created_at).toBeDefined()

        // Check field types
        expect(typeof book.id).toBe("string")
        expect(typeof book.title).toBe("string")
        expect(typeof book.publisher).toBe("string")
        expect(typeof book.publisherId).toBe("string")
        expect(typeof book.coverUrl).toBe("string")
        expect(typeof book.description).toBe("string")
        expect(typeof book.grade).toBe("string")
        expect(typeof book.activityCount).toBe("number")
        expect(typeof book.created_at).toBe("string")

        // Check ID is not empty
        expect(book.id.length).toBeGreaterThan(0)

        // Check activity count is positive
        expect(book.activityCount).toBeGreaterThan(0)
      })
    })
  })

  describe("Activities", () => {
    it("should have at least 20 activities", () => {
      expect(mockActivities.length).toBeGreaterThanOrEqual(20)
    })

    it("should have valid Activity structure for all activities", () => {
      mockActivities.forEach((activity: Activity) => {
        // Check required fields exist
        expect(activity.id).toBeDefined()
        expect(activity.bookId).toBeDefined()
        expect(activity.dream_activity_id).toBeDefined()
        expect(activity.title).toBeDefined()
        expect(activity.activityType).toBeDefined()
        expect(activity.order_index).toBeDefined()

        // Check field types
        expect(typeof activity.id).toBe("string")
        expect(typeof activity.bookId).toBe("string")
        expect(typeof activity.dream_activity_id).toBe("string")
        expect(typeof activity.title).toBe("string")
        expect(typeof activity.activityType).toBe("string")
        expect(typeof activity.order_index).toBe("number")

        // Check ID is not empty
        expect(activity.id.length).toBeGreaterThan(0)

        // Check activity type is one of the valid types
        const validTypes = [
          "dragdroppicture",
          "matchTheWords",
          "circle",
          "markwithx",
          "puzzleFindWords",
          "dragdroppicturegroup",
        ]
        expect(validTypes).toContain(activity.activityType)

        // Check order_index is positive
        expect(activity.order_index).toBeGreaterThan(0)

        // Check bookId references a valid book
        const bookExists = mockBooks.some((book) => book.id === activity.bookId)
        expect(bookExists).toBe(true)
      })
    })

    it("should have all 6 activity types represented", () => {
      const activityTypes = new Set(mockActivities.map((a) => a.activityType))

      expect(activityTypes.has("dragdroppicture")).toBe(true)
      expect(activityTypes.has("matchTheWords")).toBe(true)
      expect(activityTypes.has("circle")).toBe(true)
      expect(activityTypes.has("markwithx")).toBe(true)
      expect(activityTypes.has("puzzleFindWords")).toBe(true)
      expect(activityTypes.has("dragdroppicturegroup")).toBe(true)
    })
  })

  describe("Assignments", () => {
    it("should have at least 15 assignments", () => {
      expect(mockAssignments.length).toBeGreaterThanOrEqual(15)
    })

    it("should have valid AssignmentFull structure for all assignments", () => {
      mockAssignments.forEach((assignment: AssignmentFull) => {
        // Check required fields exist
        expect(assignment.id).toBeDefined()
        expect(assignment.teacherId).toBeDefined()
        expect(assignment.activityId).toBeDefined()
        expect(assignment.bookId).toBeDefined()
        expect(assignment.name).toBeDefined()
        expect(assignment.instructions).toBeDefined()
        expect(assignment.due_date).toBeDefined()
        expect(assignment.created_at).toBeDefined()
        expect(assignment.completionRate).toBeDefined()

        // Check field types
        expect(typeof assignment.id).toBe("string")
        expect(typeof assignment.teacherId).toBe("string")
        expect(typeof assignment.activityId).toBe("string")
        expect(typeof assignment.bookId).toBe("string")
        expect(typeof assignment.name).toBe("string")
        expect(typeof assignment.instructions).toBe("string")
        expect(typeof assignment.due_date).toBe("string")
        expect(typeof assignment.created_at).toBe("string")
        expect(typeof assignment.completionRate).toBe("number")

        // Check ID is not empty
        expect(assignment.id.length).toBeGreaterThan(0)

        // Check completion rate is between 0 and 100
        expect(assignment.completionRate).toBeGreaterThanOrEqual(0)
        expect(assignment.completionRate).toBeLessThanOrEqual(100)

        // Check due_date is a valid ISO string
        expect(() => new Date(assignment.due_date)).not.toThrow()

        // Check activityId references a valid activity
        const activityExists = mockActivities.some((activity) => activity.id === assignment.activityId)
        expect(activityExists).toBe(true)

        // Check bookId references a valid book
        const bookExists = mockBooks.some((book) => book.id === assignment.bookId)
        expect(bookExists).toBe(true)
      })
    })

    it("should have varied due dates (past, present, future)", () => {
      const now = new Date()
      const pastDue = mockAssignments.filter((a) => new Date(a.due_date) < now)
      const futureDue = mockAssignments.filter((a) => new Date(a.due_date) > now)

      // Check we have both past and future due dates
      expect(pastDue.length).toBeGreaterThan(0)
      expect(futureDue.length).toBeGreaterThan(0)
    })
  })

  describe("Assignment Students", () => {
    it("should have AssignmentStudent records", () => {
      expect(mockAssignmentStudents.length).toBeGreaterThan(0)
    })

    it("should have valid AssignmentStudent structure", () => {
      mockAssignmentStudents.forEach((submission: AssignmentStudent) => {
        // Check required fields exist
        expect(submission.id).toBeDefined()
        expect(submission.assignmentId).toBeDefined()
        expect(submission.studentId).toBeDefined()
        expect(submission.studentName).toBeDefined()
        expect(submission.status).toBeDefined()

        // Check field types
        expect(typeof submission.id).toBe("string")
        expect(typeof submission.assignmentId).toBe("string")
        expect(typeof submission.studentId).toBe("string")
        expect(typeof submission.studentName).toBe("string")
        expect(typeof submission.status).toBe("string")

        // Check status is one of the valid statuses
        const validStatuses = ["not_started", "in_progress", "completed"]
        expect(validStatuses).toContain(submission.status)

        // If completed, should have score
        if (submission.status === "completed") {
          expect(submission.score).toBeDefined()
          expect(typeof submission.score).toBe("number")
          expect(submission.score!).toBeGreaterThanOrEqual(0)
          expect(submission.score!).toBeLessThanOrEqual(100)
        }

        // Check assignmentId references a valid assignment
        const assignmentExists = mockAssignments.some((assignment) => assignment.id === submission.assignmentId)
        expect(assignmentExists).toBe(true)
      })
    })
  })

  describe("Data Relationships", () => {
    it("should have activities linked to books", () => {
      mockActivities.forEach((activity) => {
        const book = mockBooks.find((b) => b.id === activity.bookId)
        expect(book).toBeDefined()
      })
    })

    it("should have assignments linked to activities and books", () => {
      mockAssignments.forEach((assignment) => {
        const activity = mockActivities.find((a) => a.id === assignment.activityId)
        const book = mockBooks.find((b) => b.id === assignment.bookId)

        expect(activity).toBeDefined()
        expect(book).toBeDefined()
      })
    })

    it("should have assignment students linked to assignments", () => {
      mockAssignmentStudents.forEach((submission) => {
        const assignment = mockAssignments.find((a) => a.id === submission.assignmentId)
        expect(assignment).toBeDefined()
      })
    })
  })
})
