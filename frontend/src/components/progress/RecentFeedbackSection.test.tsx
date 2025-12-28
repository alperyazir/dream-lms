/**
 * Tests for Recent Feedback Section Component
 * Story 22.2: My Progress Page Enhancement
 */

import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import type { ProgressRecentAssignment } from "@/types/analytics"
import { RecentFeedbackSection } from "./RecentFeedbackSection"

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

describe("RecentFeedbackSection", () => {
  const mockAssignmentsWithFeedback: ProgressRecentAssignment[] = [
    {
      id: "1",
      name: "Math Quiz",
      score: 95,
      completed_at: "2025-12-26T10:00:00Z",
      has_feedback: true,
      activity_type: "quiz",
      book_title: "Algebra 101",
    },
    {
      id: "2",
      name: "English Essay",
      score: 87,
      completed_at: "2025-12-25T14:00:00Z",
      has_feedback: true,
      activity_type: "essay",
      book_title: "English Literature",
    },
    {
      id: "3",
      name: "Science Lab",
      score: 92,
      completed_at: "2025-12-24T16:00:00Z",
      has_feedback: true,
      activity_type: "lab",
      book_title: "Biology",
    },
  ]

  const mockAssignmentsWithoutFeedback: ProgressRecentAssignment[] = [
    {
      id: "4",
      name: "History Assignment",
      score: 88,
      completed_at: "2025-12-23T12:00:00Z",
      has_feedback: false,
      activity_type: "quiz",
      book_title: "World History",
    },
  ]

  const mockMixedAssignments: ProgressRecentAssignment[] = [
    ...mockAssignmentsWithFeedback,
    ...mockAssignmentsWithoutFeedback,
  ]

  it("renders section title", () => {
    render(<RecentFeedbackSection recentAssignments={[]} />)
    expect(screen.getByText("Recent Feedback")).toBeInTheDocument()
  })

  it("shows empty state when no feedback exists", () => {
    render(<RecentFeedbackSection recentAssignments={[]} />)
    expect(screen.getByText("No feedback yet!")).toBeInTheDocument()
    expect(
      screen.getByText("Complete assignments to receive teacher feedback."),
    ).toBeInTheDocument()
  })

  it("shows empty state when no assignments have feedback", () => {
    render(
      <RecentFeedbackSection
        recentAssignments={mockAssignmentsWithoutFeedback}
      />,
    )
    expect(screen.getByText("No feedback yet!")).toBeInTheDocument()
  })

  it("displays assignments with feedback", () => {
    render(
      <RecentFeedbackSection recentAssignments={mockAssignmentsWithFeedback} />,
    )
    expect(screen.getByText("Math Quiz")).toBeInTheDocument()
    expect(screen.getByText("English Essay")).toBeInTheDocument()
    expect(screen.getByText("Science Lab")).toBeInTheDocument()
  })

  it("filters out assignments without feedback", () => {
    render(<RecentFeedbackSection recentAssignments={mockMixedAssignments} />)
    expect(screen.getByText("Math Quiz")).toBeInTheDocument()
    expect(screen.queryByText("History Assignment")).not.toBeInTheDocument()
  })

  it("displays book titles", () => {
    render(
      <RecentFeedbackSection recentAssignments={mockAssignmentsWithFeedback} />,
    )
    expect(screen.getByText(/Algebra 101/)).toBeInTheDocument()
    expect(screen.getByText(/English Literature/)).toBeInTheDocument()
    expect(screen.getByText(/Biology/)).toBeInTheDocument()
  })

  it("displays scores with correct badge variant", () => {
    render(
      <RecentFeedbackSection recentAssignments={mockAssignmentsWithFeedback} />,
    )
    expect(screen.getByText("95%")).toBeInTheDocument()
    expect(screen.getByText("87%")).toBeInTheDocument()
    expect(screen.getByText("92%")).toBeInTheDocument()
  })

  it("limits feedback items to specified limit", () => {
    const manyAssignments: ProgressRecentAssignment[] = Array.from(
      { length: 10 },
      (_, i) => ({
        id: `${i}`,
        name: `Assignment ${i}`,
        score: 90,
        completed_at: "2025-12-26T10:00:00Z",
        has_feedback: true,
        activity_type: "quiz",
        book_title: "Test Book",
      }),
    )

    render(
      <RecentFeedbackSection recentAssignments={manyAssignments} limit={3} />,
    )

    // Should only show 3 assignments
    expect(screen.getByText("Assignment 0")).toBeInTheDocument()
    expect(screen.getByText("Assignment 1")).toBeInTheDocument()
    expect(screen.getByText("Assignment 2")).toBeInTheDocument()
    expect(screen.queryByText("Assignment 3")).not.toBeInTheDocument()
  })

  it("renders feedback available indicator", () => {
    render(
      <RecentFeedbackSection recentAssignments={mockAssignmentsWithFeedback} />,
    )
    const feedbackIndicators = screen.getAllByText("Teacher feedback available")
    expect(feedbackIndicators).toHaveLength(3)
  })

  it("creates links to assignment details", () => {
    render(
      <RecentFeedbackSection
        recentAssignments={[mockAssignmentsWithFeedback[0]]}
      />,
    )
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/student/assignments/$assignmentId")
  })
})
