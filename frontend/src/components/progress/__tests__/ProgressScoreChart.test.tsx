/**
 * Tests for ProgressScoreChart component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 */

import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import type { ScoreTrendPoint } from "@/types/analytics"
import { ProgressScoreChart } from "../ProgressScoreChart"

// Mock ResizeObserver for Recharts
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const mockTrendData: ScoreTrendPoint[] = [
  { date: "2025-01-20", score: 75, assignment_name: "Math Quiz 1" },
  { date: "2025-01-22", score: 80, assignment_name: "Reading Test" },
  { date: "2025-01-25", score: 90, assignment_name: "Science Lab" },
]

const emptyTrendData: ScoreTrendPoint[] = []

describe("ProgressScoreChart", () => {
  it("renders chart title", () => {
    render(<ProgressScoreChart data={mockTrendData} />)

    expect(screen.getByText("Score Trend")).toBeInTheDocument()
  })

  it("renders empty state when no data", () => {
    render(<ProgressScoreChart data={emptyTrendData} />)

    expect(screen.getByText("Score Trend")).toBeInTheDocument()
    expect(
      screen.getByText("Complete some assignments to see your progress chart!"),
    ).toBeInTheDocument()
  })

  it("renders chart container with data", () => {
    render(<ProgressScoreChart data={mockTrendData} />)

    // Chart container should be present
    expect(
      screen.getByRole("img", { name: "Score trend chart" }),
    ).toBeInTheDocument()
  })

  it("renders legend with correct labels", () => {
    render(<ProgressScoreChart data={mockTrendData} avgScore={82} />)

    expect(screen.getByText("Your Scores")).toBeInTheDocument()
    expect(screen.getByText("Average (82%)")).toBeInTheDocument()
    expect(screen.getByText("Best (90%)")).toBeInTheDocument()
  })

  it("calculates average when not provided", () => {
    render(<ProgressScoreChart data={mockTrendData} />)

    // Average of 75, 80, 90 = 81.67, rounded to 82
    expect(screen.getByText("Average (82%)")).toBeInTheDocument()
  })

  it("uses provided avgScore for legend", () => {
    render(<ProgressScoreChart data={mockTrendData} avgScore={85} />)

    expect(screen.getByText("Average (85%)")).toBeInTheDocument()
  })

  it("identifies best score correctly", () => {
    const dataWithHighScore: ScoreTrendPoint[] = [
      { date: "2025-01-20", score: 60, assignment_name: "Quiz 1" },
      { date: "2025-01-22", score: 100, assignment_name: "Perfect Score" },
      { date: "2025-01-25", score: 80, assignment_name: "Quiz 3" },
    ]

    render(<ProgressScoreChart data={dataWithHighScore} />)

    expect(screen.getByText("Best (100%)")).toBeInTheDocument()
  })
})
