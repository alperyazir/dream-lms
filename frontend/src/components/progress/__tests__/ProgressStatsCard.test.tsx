/**
 * Tests for ProgressStatsCard component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { StudentProgressStats } from "@/types/analytics"
import { ProgressStatsCard } from "../ProgressStatsCard"

const mockStatsImproving: StudentProgressStats = {
  total_completed: 15,
  avg_score: 85.5,
  current_streak: 5,
  streak_start_date: "2025-01-23",
  improvement_trend: "improving",
}

const mockStatsStable: StudentProgressStats = {
  total_completed: 10,
  avg_score: 75.0,
  current_streak: 3,
  streak_start_date: "2025-01-25",
  improvement_trend: "stable",
}

const mockStatsDeclining: StudentProgressStats = {
  total_completed: 8,
  avg_score: 60.2,
  current_streak: 1,
  streak_start_date: "2025-01-27",
  improvement_trend: "declining",
}

const mockStatsZero: StudentProgressStats = {
  total_completed: 0,
  avg_score: 0,
  current_streak: 0,
  streak_start_date: null,
  improvement_trend: "stable",
}

describe("ProgressStatsCard", () => {
  it("renders with improving trend stats", () => {
    render(<ProgressStatsCard stats={mockStatsImproving} />)

    expect(screen.getByText("Your Progress")).toBeInTheDocument()
    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("Completed")).toBeInTheDocument()
    expect(screen.getByText("86%")).toBeInTheDocument() // Rounded
    expect(screen.getByText("Avg Score")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("Days Streak")).toBeInTheDocument()
    expect(screen.getByText("Improving")).toBeInTheDocument()
    expect(screen.getByText("Trend")).toBeInTheDocument()
  })

  it("renders with stable trend stats", () => {
    render(<ProgressStatsCard stats={mockStatsStable} />)

    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("75%")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Steady")).toBeInTheDocument()
  })

  it("renders with declining trend stats", () => {
    render(<ProgressStatsCard stats={mockStatsDeclining} />)

    expect(screen.getByText("8")).toBeInTheDocument()
    expect(screen.getByText("60%")).toBeInTheDocument()
    expect(screen.getByText("Needs Attention")).toBeInTheDocument()
  })

  it("renders singular 'Day Streak' for streak of 1", () => {
    render(<ProgressStatsCard stats={mockStatsDeclining} />)

    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("Day Streak")).toBeInTheDocument()
  })

  it("renders zero state correctly", () => {
    render(<ProgressStatsCard stats={mockStatsZero} />)

    // Two "0" elements: total_completed and current_streak
    expect(screen.getAllByText("0")).toHaveLength(2)
    expect(screen.getByText("0%")).toBeInTheDocument()
    expect(screen.getByText("Steady")).toBeInTheDocument()
  })

  it("rounds average score to nearest integer", () => {
    const statsWithDecimal: StudentProgressStats = {
      ...mockStatsImproving,
      avg_score: 87.4,
    }
    render(<ProgressStatsCard stats={statsWithDecimal} />)

    expect(screen.getByText("87%")).toBeInTheDocument()
  })
})
