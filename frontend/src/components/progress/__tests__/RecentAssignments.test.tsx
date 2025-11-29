/**
 * Tests for RecentAssignments component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RecentAssignments } from "../RecentAssignments"
import type { ProgressRecentAssignment } from "@/types/analytics"

const mockAssignments: ProgressRecentAssignment[] = [
  {
    id: "1",
    name: "Math Quiz Chapter 5",
    score: 95,
    completed_at: "2025-01-25T10:30:00Z",
    has_feedback: true,
    activity_type: "matchTheWords",
    book_title: "Math Fundamentals",
  },
  {
    id: "2",
    name: "Reading Comprehension",
    score: 78,
    completed_at: "2025-01-24T14:00:00Z",
    has_feedback: false,
    activity_type: "circle",
    book_title: "English Stories",
  },
  {
    id: "3",
    name: "Perfect Score Quiz",
    score: 100,
    completed_at: "2025-01-23T09:00:00Z",
    has_feedback: true,
    activity_type: "dragdroppicture",
    book_title: "Science Lab",
  },
]

const emptyAssignments: ProgressRecentAssignment[] = []

describe("RecentAssignments", () => {
  it("renders component title", () => {
    render(<RecentAssignments assignments={mockAssignments} />)

    expect(screen.getByText("Recent Assignments")).toBeInTheDocument()
  })

  it("renders empty state when no assignments", () => {
    render(<RecentAssignments assignments={emptyAssignments} />)

    expect(screen.getByText("Recent Assignments")).toBeInTheDocument()
    expect(
      screen.getByText("No completed assignments yet. Start practicing!"),
    ).toBeInTheDocument()
  })

  it("renders all assignments in list", () => {
    render(<RecentAssignments assignments={mockAssignments} />)

    expect(screen.getByText("Math Quiz Chapter 5")).toBeInTheDocument()
    expect(screen.getByText("Reading Comprehension")).toBeInTheDocument()
    expect(screen.getByText("Perfect Score Quiz")).toBeInTheDocument()
  })

  it("displays book titles for assignments", () => {
    render(<RecentAssignments assignments={mockAssignments} />)

    expect(screen.getByText("Math Fundamentals")).toBeInTheDocument()
    expect(screen.getByText("English Stories")).toBeInTheDocument()
    expect(screen.getByText("Science Lab")).toBeInTheDocument()
  })

  it("displays scores with correct formatting", () => {
    render(<RecentAssignments assignments={mockAssignments} />)

    expect(screen.getByText("95%")).toBeInTheDocument()
    expect(screen.getByText("78%")).toBeInTheDocument()
    expect(screen.getByText("100%")).toBeInTheDocument()
  })

  it("shows Perfect! badge for 100% score", () => {
    render(<RecentAssignments assignments={mockAssignments} />)

    expect(screen.getByText("Perfect!")).toBeInTheDocument()
  })

  it("does not show Perfect! badge for non-100 scores", () => {
    const nonPerfectAssignments = mockAssignments.filter((a) => a.score !== 100)
    render(<RecentAssignments assignments={nonPerfectAssignments} />)

    expect(screen.queryByText("Perfect!")).not.toBeInTheDocument()
  })

  it("formats dates correctly", () => {
    render(<RecentAssignments assignments={mockAssignments} />)

    // Should show formatted dates like "Jan 25"
    expect(screen.getByText("Jan 25")).toBeInTheDocument()
    expect(screen.getByText("Jan 24")).toBeInTheDocument()
    expect(screen.getByText("Jan 23")).toBeInTheDocument()
  })
})
