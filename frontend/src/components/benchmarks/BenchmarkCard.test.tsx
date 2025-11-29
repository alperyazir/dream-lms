/**
 * BenchmarkCard Component Tests
 * Story 5.7: Performance Comparison & Benchmarking
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BenchmarkCard } from "./BenchmarkCard"
import type {
  BenchmarkData,
  ClassMetrics,
} from "@/types/benchmarks"

// Mock class metrics
const mockClassMetrics: ClassMetrics = {
  class_id: "class-1",
  class_name: "Math 101",
  average_score: 78.5,
  completion_rate: 85,
  total_assignments: 12,
  active_students: 25,
}

// Mock school benchmark (available)
const mockSchoolBenchmark: BenchmarkData = {
  level: "school",
  average_score: 75.2,
  completion_rate: 80,
  sample_size: 8,
  period: "monthly",
  is_available: true,
}

// Mock publisher benchmark (available)
const mockPublisherBenchmark: BenchmarkData = {
  level: "publisher",
  average_score: 72.8,
  completion_rate: 78,
  sample_size: 45,
  period: "monthly",
  is_available: true,
}

// Mock unavailable benchmark
const mockUnavailableBenchmark: BenchmarkData = {
  level: "school",
  average_score: 0,
  completion_rate: 0,
  sample_size: 2,
  period: "monthly",
  is_available: false,
}

describe("BenchmarkCard", () => {
  it("renders class metrics correctly", () => {
    render(
      <BenchmarkCard
        classMetrics={mockClassMetrics}
        schoolBenchmark={mockSchoolBenchmark}
        publisherBenchmark={mockPublisherBenchmark}
      />,
    )

    // Check class score is displayed
    expect(screen.getByText("79%")).toBeInTheDocument() // Rounded from 78.5
    expect(screen.getByText("Your Class")).toBeInTheDocument()
  })

  it("renders school benchmark when available", () => {
    render(
      <BenchmarkCard
        classMetrics={mockClassMetrics}
        schoolBenchmark={mockSchoolBenchmark}
        publisherBenchmark={mockPublisherBenchmark}
      />,
    )

    // Check school benchmark is displayed
    expect(screen.getByText("75%")).toBeInTheDocument() // Rounded from 75.2
    expect(screen.getByText("School Average")).toBeInTheDocument()
  })

  it("renders publisher benchmark when available", () => {
    render(
      <BenchmarkCard
        classMetrics={mockClassMetrics}
        schoolBenchmark={mockSchoolBenchmark}
        publisherBenchmark={mockPublisherBenchmark}
      />,
    )

    // Check publisher benchmark is displayed
    expect(screen.getByText("73%")).toBeInTheDocument() // Rounded from 72.8
    expect(screen.getByText("Publisher Average")).toBeInTheDocument()
  })

  it("shows 'Not enough data' when benchmark is unavailable", () => {
    render(
      <BenchmarkCard
        classMetrics={mockClassMetrics}
        schoolBenchmark={mockUnavailableBenchmark}
        publisherBenchmark={null}
      />,
    )

    // Check unavailable message is shown
    expect(screen.getAllByText("Not enough data yet").length).toBeGreaterThan(0)
  })

  it("shows additional class stats in footer", () => {
    render(
      <BenchmarkCard
        classMetrics={mockClassMetrics}
        schoolBenchmark={mockSchoolBenchmark}
        publisherBenchmark={mockPublisherBenchmark}
      />,
    )

    // Check footer stats
    expect(screen.getByText("25 active students")).toBeInTheDocument()
    expect(screen.getByText("12 assignments")).toBeInTheDocument()
    expect(screen.getByText("85% completion rate")).toBeInTheDocument()
  })

  it("renders title correctly", () => {
    render(
      <BenchmarkCard
        classMetrics={mockClassMetrics}
        schoolBenchmark={mockSchoolBenchmark}
        publisherBenchmark={mockPublisherBenchmark}
      />,
    )

    expect(screen.getByText("Performance Comparison")).toBeInTheDocument()
  })
})
