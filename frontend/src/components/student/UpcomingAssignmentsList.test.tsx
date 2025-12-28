/**
 * Tests for Upcoming Assignments List Component
 * Story 22.1: Dashboard Layout Refactor
 */

import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import type { StudentAssignmentResponse } from "@/types/assignment"
import { UpcomingAssignmentsList } from "./UpcomingAssignmentsList"

// Mock Link component from router
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
  }) => <a href={to}>{children}</a>,
}))

describe("UpcomingAssignmentsList", () => {
  const mockAssignments: StudentAssignmentResponse[] = [
    {
      assignment_id: "1",
      assignment_name: "Math Quiz",
      instructions: null,
      due_date: "2025-12-28T14:00:00Z",
      time_limit_minutes: null,
      created_at: "2025-12-20T10:00:00Z",
      book_id: "book1",
      book_title: "Algebra 101",
      book_cover_url: null,
      activity_id: "act1",
      activity_title: "Quiz 1",
      activity_type: "quiz",
      status: "not_started",
      score: null,
      started_at: null,
      completed_at: null,
      time_spent_minutes: 0,
      activity_count: 1,
      is_past_due: false,
      days_until_due: 2,
    },
    {
      assignment_id: "2",
      assignment_name: "English Essay",
      instructions: null,
      due_date: "2025-12-29T16:00:00Z",
      time_limit_minutes: 60,
      created_at: "2025-12-20T11:00:00Z",
      book_id: "book2",
      book_title: "English Literature",
      book_cover_url: null,
      activity_id: "act2",
      activity_title: "Essay",
      activity_type: "essay",
      status: "in_progress",
      score: null,
      started_at: "2025-12-26T09:00:00Z",
      completed_at: null,
      time_spent_minutes: 15,
      activity_count: 1,
      is_past_due: false,
      days_until_due: 3,
    },
    {
      assignment_id: "3",
      assignment_name: "Completed Assignment",
      instructions: null,
      due_date: "2025-12-27T12:00:00Z",
      time_limit_minutes: null,
      created_at: "2025-12-19T10:00:00Z",
      book_id: "book3",
      book_title: "Science",
      book_cover_url: null,
      activity_id: "act3",
      activity_title: "Lab",
      activity_type: "lab",
      status: "completed",
      score: 95,
      started_at: "2025-12-25T10:00:00Z",
      completed_at: "2025-12-25T11:00:00Z",
      time_spent_minutes: 60,
      activity_count: 1,
      is_past_due: false,
      days_until_due: 1,
    },
  ]

  it("renders the card title", () => {
    render(<UpcomingAssignmentsList assignments={mockAssignments} />)
    expect(screen.getByText("Upcoming Assignments")).toBeInTheDocument()
  })

  it("renders 'View All' link", () => {
    render(<UpcomingAssignmentsList assignments={mockAssignments} />)
    expect(screen.getByText("View All")).toBeInTheDocument()
  })

  it("shows empty state when no upcoming assignments", () => {
    render(<UpcomingAssignmentsList assignments={[]} />)
    expect(screen.getByText("No upcoming assignments!")).toBeInTheDocument()
    expect(screen.getByText("You're all caught up. 🎉")).toBeInTheDocument()
  })

  it("filters out completed assignments", () => {
    render(<UpcomingAssignmentsList assignments={mockAssignments} />)
    expect(screen.queryByText("Completed Assignment")).not.toBeInTheDocument()
  })

  it("displays upcoming assignments in order", () => {
    render(<UpcomingAssignmentsList assignments={mockAssignments} />)
    expect(screen.getByText("Math Quiz")).toBeInTheDocument()
    expect(screen.getByText("English Essay")).toBeInTheDocument()
  })

  it("limits assignments to specified limit", () => {
    const manyAssignments: StudentAssignmentResponse[] = Array.from(
      { length: 10 },
      (_, i) => ({
        ...mockAssignments[0],
        assignment_id: `${i}`,
        assignment_name: `Assignment ${i}`,
        due_date: `2025-12-${27 + i}T10:00:00Z`,
      }),
    )

    render(<UpcomingAssignmentsList assignments={manyAssignments} limit={3} />)

    // Should only show 3 assignments
    expect(screen.getByText("Assignment 0")).toBeInTheDocument()
    expect(screen.getByText("Assignment 1")).toBeInTheDocument()
    expect(screen.getByText("Assignment 2")).toBeInTheDocument()
    expect(screen.queryByText("Assignment 3")).not.toBeInTheDocument()
  })

  it("filters out assignments without due dates", () => {
    const assignmentsWithoutDueDate = [
      ...mockAssignments,
      {
        ...mockAssignments[0],
        assignment_id: "4",
        assignment_name: "No Due Date",
        due_date: null,
        status: "not_started" as const,
      },
    ]

    render(<UpcomingAssignmentsList assignments={assignmentsWithoutDueDate} />)
    expect(screen.queryByText("No Due Date")).not.toBeInTheDocument()
  })
})
