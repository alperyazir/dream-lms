/**
 * ActivityBenchmarkTable Component Tests
 * Story 5.7: Performance Comparison & Benchmarking
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ActivityBenchmarkTable } from "./ActivityBenchmarkTable"
import type { ActivityTypeBenchmark } from "@/types/benchmarks"

// Mock activity benchmarks
const mockActivityBenchmarks: ActivityTypeBenchmark[] = [
  {
    activity_type: "DragDropPicture",
    activity_label: "Drag & Drop Picture",
    class_average: 85,
    benchmark_average: 75,
    difference_percent: 10,
  },
  {
    activity_type: "MatchTheWords",
    activity_label: "Match The Words",
    class_average: 70,
    benchmark_average: 78,
    difference_percent: -8,
  },
  {
    activity_type: "Circle",
    activity_label: "Circle Activity",
    class_average: 82,
    benchmark_average: 80,
    difference_percent: 2,
  },
]

describe("ActivityBenchmarkTable", () => {
  it("renders table headers correctly", () => {
    render(<ActivityBenchmarkTable activityBenchmarks={mockActivityBenchmarks} />)

    expect(screen.getByText("Activity Type")).toBeInTheDocument()
    expect(screen.getByText("Your Class")).toBeInTheDocument()
    expect(screen.getByText("Benchmark")).toBeInTheDocument()
    expect(screen.getByText("Difference")).toBeInTheDocument()
  })

  it("renders activity labels correctly", () => {
    render(<ActivityBenchmarkTable activityBenchmarks={mockActivityBenchmarks} />)

    expect(screen.getByText("Drag & Drop Picture")).toBeInTheDocument()
    expect(screen.getByText("Match The Words")).toBeInTheDocument()
    expect(screen.getByText("Circle Activity")).toBeInTheDocument()
  })

  it("renders class averages correctly", () => {
    render(<ActivityBenchmarkTable activityBenchmarks={mockActivityBenchmarks} />)

    expect(screen.getByText("85%")).toBeInTheDocument()
    expect(screen.getByText("70%")).toBeInTheDocument()
    expect(screen.getByText("82%")).toBeInTheDocument()
  })

  it("renders positive differences with + sign", () => {
    render(<ActivityBenchmarkTable activityBenchmarks={mockActivityBenchmarks} />)

    expect(screen.getByText("+10%")).toBeInTheDocument()
    expect(screen.getByText("+2%")).toBeInTheDocument()
  })

  it("renders negative differences without + sign", () => {
    render(<ActivityBenchmarkTable activityBenchmarks={mockActivityBenchmarks} />)

    expect(screen.getByText("-8%")).toBeInTheDocument()
  })

  it("sorts by absolute difference (largest gaps first)", () => {
    render(<ActivityBenchmarkTable activityBenchmarks={mockActivityBenchmarks} />)

    const rows = screen.getAllByRole("row")
    // First row is header, so data rows start at index 1
    // Sorted order should be: +10%, -8%, +2%
    expect(rows[1]).toHaveTextContent("Drag & Drop Picture")
    expect(rows[2]).toHaveTextContent("Match The Words")
    expect(rows[3]).toHaveTextContent("Circle Activity")
  })

  it("shows empty state when no data", () => {
    render(<ActivityBenchmarkTable activityBenchmarks={[]} />)

    expect(
      screen.getByText("No activity type data available yet"),
    ).toBeInTheDocument()
  })

  it("hides benchmark column when showSchoolBenchmark is false", () => {
    render(
      <ActivityBenchmarkTable
        activityBenchmarks={mockActivityBenchmarks}
        showSchoolBenchmark={false}
      />,
    )

    expect(screen.queryByText("Benchmark")).not.toBeInTheDocument()
  })

  it("renders title correctly", () => {
    render(<ActivityBenchmarkTable activityBenchmarks={mockActivityBenchmarks} />)

    expect(screen.getByText("Performance by Activity Type")).toBeInTheDocument()
  })

  it("renders legend correctly", () => {
    render(<ActivityBenchmarkTable activityBenchmarks={mockActivityBenchmarks} />)

    expect(screen.getByText("Above benchmark (>5%)")).toBeInTheDocument()
    expect(screen.getByText("Below benchmark (<-5%)")).toBeInTheDocument()
    expect(screen.getByText("At benchmark (±5%)")).toBeInTheDocument()
  })
})
