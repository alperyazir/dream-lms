/**
 * Tests for Progress Summary Card Component
 * Story 22.1: Dashboard Layout Refactor
 */

import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import type { StudentProgressStats } from "@/types/analytics"
import { ProgressSummaryCard } from "./ProgressSummaryCard"

// Mock Link component from router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe("ProgressSummaryCard", () => {
  const mockStats: StudentProgressStats = {
    total_completed: 15,
    avg_score: 85,
    current_streak: 5,
    streak_start_date: "2025-12-21",
    improvement_trend: "improving",
  }

  it("renders the card title", () => {
    render(<ProgressSummaryCard stats={mockStats} />)
    expect(screen.getByText("Your Progress")).toBeInTheDocument()
  })

  it("renders 'View Details' link", () => {
    render(<ProgressSummaryCard stats={mockStats} />)
    expect(screen.getByText("View Details")).toBeInTheDocument()
  })

  it("displays overall completion percentage", () => {
    render(<ProgressSummaryCard stats={mockStats} />)
    expect(screen.getByText("Overall Progress")).toBeInTheDocument()
    expect(screen.getByText("85%")).toBeInTheDocument()
  })

  it("displays total assignments completed", () => {
    render(<ProgressSummaryCard stats={mockStats} />)
    expect(screen.getByText("Assignments")).toBeInTheDocument()
    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("completed")).toBeInTheDocument()
  })

  it("displays learning streak when streak > 0", () => {
    render(<ProgressSummaryCard stats={mockStats} />)
    expect(screen.getByText("Learning Streak")).toBeInTheDocument()
    expect(screen.getByText(/5 days/)).toBeInTheDocument()
  })

  it("displays singular 'day' for 1-day streak", () => {
    const statsWithOneDay = { ...mockStats, current_streak: 1 }
    render(<ProgressSummaryCard stats={statsWithOneDay} />)
    expect(screen.getByText(/1 day/)).toBeInTheDocument()
  })

  it("does not display streak section when streak is 0", () => {
    const statsWithNoStreak = { ...mockStats, current_streak: 0 }
    render(<ProgressSummaryCard stats={statsWithNoStreak} />)
    expect(screen.queryByText("Learning Streak")).not.toBeInTheDocument()
  })

  it("rounds avg_score to whole number", () => {
    const statsWithDecimal = { ...mockStats, avg_score: 87.6 }
    render(<ProgressSummaryCard stats={statsWithDecimal} />)
    expect(screen.getByText("88%")).toBeInTheDocument()
  })
})
