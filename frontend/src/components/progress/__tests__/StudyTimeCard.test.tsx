/**
 * Tests for StudyTimeCard component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StudyTimeCard } from "../StudyTimeCard"
import type { StudyTimeStats } from "@/types/analytics"

const mockStatsWithHours: StudyTimeStats = {
  this_week_minutes: 120, // 2 hours
  this_month_minutes: 480, // 8 hours
  avg_per_assignment: 15,
}

const mockStatsMinutesOnly: StudyTimeStats = {
  this_week_minutes: 45,
  this_month_minutes: 30,
  avg_per_assignment: 10,
}

const mockStatsWithMixed: StudyTimeStats = {
  this_week_minutes: 75, // 1h 15m
  this_month_minutes: 150, // 2h 30m
  avg_per_assignment: 12.5,
}

const mockStatsZero: StudyTimeStats = {
  this_week_minutes: 0,
  this_month_minutes: 0,
  avg_per_assignment: 0,
}

describe("StudyTimeCard", () => {
  it("renders component title", () => {
    render(<StudyTimeCard stats={mockStatsWithHours} />)

    expect(screen.getByText("Study Time")).toBeInTheDocument()
  })

  it("displays section labels", () => {
    render(<StudyTimeCard stats={mockStatsWithHours} />)

    expect(screen.getByText("This Week")).toBeInTheDocument()
    expect(screen.getByText("This Month")).toBeInTheDocument()
    expect(screen.getByText("Per Assignment")).toBeInTheDocument()
  })

  it("formats time in hours when >= 60 minutes (exact hours)", () => {
    render(<StudyTimeCard stats={mockStatsWithHours} />)

    expect(screen.getByText("2h")).toBeInTheDocument() // 120 min
    expect(screen.getByText("8h")).toBeInTheDocument() // 480 min
  })

  it("formats time in minutes when < 60", () => {
    render(<StudyTimeCard stats={mockStatsMinutesOnly} />)

    expect(screen.getByText("45m")).toBeInTheDocument()
    expect(screen.getByText("30m")).toBeInTheDocument()
  })

  it("formats mixed hours and minutes", () => {
    render(<StudyTimeCard stats={mockStatsWithMixed} />)

    expect(screen.getByText("1h 15m")).toBeInTheDocument() // 75 min
    expect(screen.getByText("2h 30m")).toBeInTheDocument() // 150 min
  })

  it("rounds average per assignment", () => {
    render(<StudyTimeCard stats={mockStatsWithMixed} />)

    // 12.5 rounds to 13m
    expect(screen.getByText("13m")).toBeInTheDocument()
  })

  it("shows encouragement message for >= 60 minutes this week", () => {
    render(<StudyTimeCard stats={mockStatsWithHours} />)

    expect(
      screen.getByText("Great job staying consistent this week!"),
    ).toBeInTheDocument()
  })

  it("shows different encouragement for < 60 minutes this week", () => {
    render(<StudyTimeCard stats={mockStatsMinutesOnly} />)

    expect(
      screen.getByText("Keep up the practice - every minute counts!"),
    ).toBeInTheDocument()
  })

  it("does not show encouragement when zero minutes", () => {
    render(<StudyTimeCard stats={mockStatsZero} />)

    expect(
      screen.queryByText("Great job staying consistent this week!"),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("Keep up the practice - every minute counts!"),
    ).not.toBeInTheDocument()
  })

  it("handles zero stats correctly", () => {
    render(<StudyTimeCard stats={mockStatsZero} />)

    expect(screen.getAllByText("0m")).toHaveLength(3)
  })
})
