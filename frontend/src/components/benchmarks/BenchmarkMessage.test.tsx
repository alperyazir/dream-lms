/**
 * BenchmarkMessage Component Tests
 * Story 5.7: Performance Comparison & Benchmarking
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { BenchmarkMessage as BenchmarkMessageType } from "@/types/benchmarks"
import { BenchmarkMessage } from "./BenchmarkMessage"

describe("BenchmarkMessage", () => {
  it("renders excelling message correctly", () => {
    const message: BenchmarkMessageType = {
      type: "excelling",
      title: "Outstanding Performance!",
      description: "Your class is performing exceptionally well.",
      icon: "trophy",
      focus_area: null,
    }

    render(<BenchmarkMessage message={message} />)

    expect(screen.getByText("Outstanding Performance!")).toBeInTheDocument()
    expect(
      screen.getByText("Your class is performing exceptionally well."),
    ).toBeInTheDocument()
  })

  it("renders above_average message correctly", () => {
    const message: BenchmarkMessageType = {
      type: "above_average",
      title: "Great Progress!",
      description: "Your class is performing above the benchmark.",
      icon: "trending-up",
      focus_area: null,
    }

    render(<BenchmarkMessage message={message} />)

    expect(screen.getByText("Great Progress!")).toBeInTheDocument()
    expect(
      screen.getByText("Your class is performing above the benchmark."),
    ).toBeInTheDocument()
  })

  it("renders at_average message correctly", () => {
    const message: BenchmarkMessageType = {
      type: "at_average",
      title: "On Track",
      description: "Your class is performing at the expected level.",
      icon: "target",
      focus_area: null,
    }

    render(<BenchmarkMessage message={message} />)

    expect(screen.getByText("On Track")).toBeInTheDocument()
  })

  it("renders below_average message correctly", () => {
    const message: BenchmarkMessageType = {
      type: "below_average",
      title: "Room for Improvement",
      description: "Your class is slightly below the benchmark.",
      icon: "alert",
      focus_area: "Reading Comprehension",
    }

    render(<BenchmarkMessage message={message} />)

    expect(screen.getByText("Room for Improvement")).toBeInTheDocument()
    expect(screen.getByText("Focus area:")).toBeInTheDocument()
    expect(screen.getByText("Reading Comprehension")).toBeInTheDocument()
  })

  it("renders needs_focus message correctly", () => {
    const message: BenchmarkMessageType = {
      type: "needs_focus",
      title: "Attention Needed",
      description: "Your class needs additional support.",
      icon: "book",
      focus_area: "Word Recognition",
    }

    render(<BenchmarkMessage message={message} />)

    expect(screen.getByText("Attention Needed")).toBeInTheDocument()
    expect(screen.getByText("Word Recognition")).toBeInTheDocument()
  })

  it("does not show focus area when null", () => {
    const message: BenchmarkMessageType = {
      type: "above_average",
      title: "Great Progress!",
      description: "Your class is performing above the benchmark.",
      icon: "trending-up",
      focus_area: null,
    }

    render(<BenchmarkMessage message={message} />)

    expect(screen.queryByText("Focus area:")).not.toBeInTheDocument()
  })
})
