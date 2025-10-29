import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { AssignmentCard } from "./AssignmentCard"
import type { AssignmentFull, Book, AssignmentStudent } from "@/lib/mockData"

// Mock useCountdown hook
vi.mock("@/hooks/useCountdown", () => ({
  useCountdown: vi.fn(() => ({
    timeLeft: "2 days 5 hours",
    isPastDue: false,
  })),
}))

const mockAssignment: AssignmentFull = {
  id: "1",
  teacherId: "1",
  activityId: "activity-1",
  bookId: "book-1",
  name: "Math Quiz - Chapter 1",
  instructions: "Complete all problems",
  due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
  time_limit_minutes: 30,
  created_at: new Date().toISOString(),
  completionRate: 0,
}

const mockBook: Book = {
  id: "book-1",
  title: "Mathematics Grade 3",
  publisher: "Dream Publisher",
  publisherId: "pub-1",
  coverUrl: "https://via.placeholder.com/200x300",
  description: "Elementary mathematics",
  grade: "3",
  activityCount: 10,
  created_at: new Date().toISOString(),
}

describe("AssignmentCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders assignment with countdown timer for not_started status", () => {
    const mockSubmission: AssignmentStudent = {
      id: "sub-1",
      assignmentId: "1",
      studentId: "student-1",
      studentName: "John Doe",
      status: "not_started",
      score: undefined,
      started_at: undefined,
      completed_at: undefined,
      time_spent_minutes: undefined,
    }

    render(
      <AssignmentCard
        assignment={mockAssignment}
        book={mockBook}
        submission={mockSubmission}
      />
    )

    // Check assignment name is rendered
    expect(screen.getByText("Math Quiz - Chapter 1")).toBeInTheDocument()

    // Check book title is rendered
    expect(screen.getByText("Mathematics Grade 3")).toBeInTheDocument()

    // Check countdown timer is displayed
    expect(screen.getByText("Due in:")).toBeInTheDocument()
    expect(screen.getByText("2 days 5 hours")).toBeInTheDocument()

    // Check "Start Assignment" button is present
    expect(screen.getByRole("button", { name: /start assignment/i })).toBeInTheDocument()

    // Check status badge shows "Not Started"
    expect(screen.getByText("Not Started")).toBeInTheDocument()
  })

  it("shows score for completed status", () => {
    const mockSubmission: AssignmentStudent = {
      id: "sub-1",
      assignmentId: "1",
      studentId: "student-1",
      studentName: "John Doe",
      status: "completed",
      score: 85,
      started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      time_spent_minutes: 25,
    }

    render(
      <AssignmentCard
        assignment={mockAssignment}
        book={mockBook}
        submission={mockSubmission}
      />
    )

    // Check assignment name is rendered
    expect(screen.getByText("Math Quiz - Chapter 1")).toBeInTheDocument()

    // Check score is displayed
    expect(screen.getByText("Score:")).toBeInTheDocument()
    expect(screen.getByText("85%")).toBeInTheDocument()

    // Check "Review" button is present
    expect(screen.getByRole("button", { name: /review assignment/i })).toBeInTheDocument()

    // Check status badge shows "Completed"
    expect(screen.getByText("Completed")).toBeInTheDocument()

    // Check countdown is NOT displayed for completed assignments
    expect(screen.queryByText("Due in:")).not.toBeInTheDocument()
  })

  it("applies correct status badge colors", () => {
    const { rerender } = render(
      <AssignmentCard
        assignment={mockAssignment}
        book={mockBook}
        submission={{
          id: "sub-1",
          assignmentId: "1",
          studentId: "student-1",
          studentName: "John Doe",
          status: "not_started",
        }}
      />
    )

    // Check "Not Started" badge has blue background
    let badge = screen.getByText("Not Started")
    expect(badge).toHaveClass("bg-blue-100")
    expect(badge).toHaveClass("text-blue-800")

    // Rerender with "In Progress" status
    rerender(
      <AssignmentCard
        assignment={mockAssignment}
        book={mockBook}
        submission={{
          id: "sub-1",
          assignmentId: "1",
          studentId: "student-1",
          studentName: "John Doe",
          status: "in_progress",
          started_at: new Date().toISOString(),
        }}
      />
    )

    // Check "In Progress" badge has yellow background
    badge = screen.getByText("In Progress")
    expect(badge).toHaveClass("bg-yellow-100")
    expect(badge).toHaveClass("text-yellow-800")

    // Rerender with "Completed" status
    rerender(
      <AssignmentCard
        assignment={mockAssignment}
        book={mockBook}
        submission={{
          id: "sub-1",
          assignmentId: "1",
          studentId: "student-1",
          studentName: "John Doe",
          status: "completed",
          score: 90,
          completed_at: new Date().toISOString(),
        }}
      />
    )

    // Check "Completed" badge has green background
    badge = screen.getByText("Completed")
    expect(badge).toHaveClass("bg-green-100")
    expect(badge).toHaveClass("text-green-800")
  })
})
