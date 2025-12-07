/**
 * Tests for ActivityBreakdown component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 */

import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import type { ActivityTypeScore } from "@/types/analytics"
import { ActivityBreakdown } from "../ActivityBreakdown"

// Mock ResizeObserver for Recharts
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const mockBreakdownData: ActivityTypeScore[] = [
  {
    activity_type: "matchTheWords",
    avg_score: 92,
    total_completed: 5,
    label: "Word Matching",
  },
  {
    activity_type: "circle",
    avg_score: 78,
    total_completed: 3,
    label: "Circle the Answer",
  },
  {
    activity_type: "dragdroppicture",
    avg_score: 85,
    total_completed: 4,
    label: "Drag & Drop",
  },
]

const singleItemData: ActivityTypeScore[] = [
  {
    activity_type: "matchTheWords",
    avg_score: 88,
    total_completed: 2,
    label: "Word Matching",
  },
]

const emptyBreakdownData: ActivityTypeScore[] = []

describe("ActivityBreakdown", () => {
  it("renders chart title", () => {
    render(<ActivityBreakdown data={mockBreakdownData} />)

    expect(screen.getByText("Activity Breakdown")).toBeInTheDocument()
  })

  it("renders empty state when no data", () => {
    render(<ActivityBreakdown data={emptyBreakdownData} />)

    expect(screen.getByText("Activity Breakdown")).toBeInTheDocument()
    expect(
      screen.getByText("Complete different activities to see your breakdown!"),
    ).toBeInTheDocument()
  })

  it("renders chart container with data", () => {
    render(<ActivityBreakdown data={mockBreakdownData} />)

    expect(
      screen.getByRole("img", { name: "Activity breakdown chart" }),
    ).toBeInTheDocument()
  })

  it("displays best activity correctly (highest score)", () => {
    render(<ActivityBreakdown data={mockBreakdownData} />)

    expect(screen.getByText("Best activity:")).toBeInTheDocument()
    expect(screen.getByText("Word Matching (92%)")).toBeInTheDocument()
  })

  it("displays needs practice activity correctly (lowest score)", () => {
    render(<ActivityBreakdown data={mockBreakdownData} />)

    expect(screen.getByText("Needs practice:")).toBeInTheDocument()
    expect(screen.getByText("Circle the Answer (78%)")).toBeInTheDocument()
  })

  it("does not show needs practice for single activity", () => {
    render(<ActivityBreakdown data={singleItemData} />)

    expect(screen.getByText("Best activity:")).toBeInTheDocument()
    expect(screen.queryByText("Needs practice:")).not.toBeInTheDocument()
  })

  it("sorts activities by score (highest first)", () => {
    render(<ActivityBreakdown data={mockBreakdownData} />)

    // Best activity should be Word Matching (92%)
    expect(screen.getByText("Word Matching (92%)")).toBeInTheDocument()
  })
})
