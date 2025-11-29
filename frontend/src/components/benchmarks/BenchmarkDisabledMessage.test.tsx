/**
 * BenchmarkDisabledMessage Component Tests
 * Story 5.7: Performance Comparison & Benchmarking
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BenchmarkDisabledMessage } from "./BenchmarkDisabledMessage"

describe("BenchmarkDisabledMessage", () => {
  it("renders default message when no custom message provided", () => {
    render(<BenchmarkDisabledMessage />)

    expect(
      screen.getByText("Benchmarking Not Available"),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Benchmarking has been disabled for your school. Contact your administrator for more information.",
      ),
    ).toBeInTheDocument()
  })

  it("renders custom message when provided", () => {
    const customMessage = "Benchmarking is currently under maintenance."
    render(<BenchmarkDisabledMessage message={customMessage} />)

    expect(screen.getByText(customMessage)).toBeInTheDocument()
  })

  it("renders privacy note", () => {
    render(<BenchmarkDisabledMessage />)

    expect(
      screen.getByText(/Your school may have opted out of benchmarking/i),
    ).toBeInTheDocument()
  })

  it("renders as card variant by default", () => {
    render(<BenchmarkDisabledMessage />)

    // Card variant shows the "Not Available" title
    expect(
      screen.getByText("Benchmarking Not Available"),
    ).toBeInTheDocument()
  })

  it("renders as alert variant when specified", () => {
    render(<BenchmarkDisabledMessage variant="alert" />)

    // Alert variant shows "Benchmarking Disabled" title
    expect(screen.getByText("Benchmarking Disabled")).toBeInTheDocument()
  })

  it("handles null message gracefully", () => {
    render(<BenchmarkDisabledMessage message={null} />)

    // Should show default message
    expect(
      screen.getByText(
        "Benchmarking has been disabled for your school. Contact your administrator for more information.",
      ),
    ).toBeInTheDocument()
  })
})
