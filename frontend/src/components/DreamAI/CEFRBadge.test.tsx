/**
 * CEFR Badge Component Tests
 * Story 27.18: Vocabulary Explorer with Audio Player
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CEFRBadge } from "./CEFRBadge"

describe("CEFRBadge", () => {
  it("renders A1 level badge", () => {
    render(<CEFRBadge level="A1" />)
    expect(screen.getByText("A1")).toBeInTheDocument()
  })

  it("renders A2 level badge", () => {
    render(<CEFRBadge level="A2" />)
    expect(screen.getByText("A2")).toBeInTheDocument()
  })

  it("renders B1 level badge", () => {
    render(<CEFRBadge level="B1" />)
    expect(screen.getByText("B1")).toBeInTheDocument()
  })

  it("renders B2 level badge", () => {
    render(<CEFRBadge level="B2" />)
    expect(screen.getByText("B2")).toBeInTheDocument()
  })

  it("renders C1 level badge", () => {
    render(<CEFRBadge level="C1" />)
    expect(screen.getByText("C1")).toBeInTheDocument()
  })

  it("renders C2 level badge", () => {
    render(<CEFRBadge level="C2" />)
    expect(screen.getByText("C2")).toBeInTheDocument()
  })

  it("applies green color to A1 level", () => {
    render(<CEFRBadge level="A1" />)
    const badge = screen.getByText("A1")
    expect(badge).toHaveClass("bg-green-100", "text-green-800")
  })

  it("applies red color to C1 level", () => {
    render(<CEFRBadge level="C1" />)
    const badge = screen.getByText("C1")
    expect(badge).toHaveClass("bg-red-100", "text-red-800")
  })

  it("applies small size class when size=sm", () => {
    render(<CEFRBadge level="A1" size="sm" />)
    const badge = screen.getByText("A1")
    expect(badge).toHaveClass("text-xs")
  })

  it("applies large size class when size=lg", () => {
    render(<CEFRBadge level="A1" size="lg" />)
    const badge = screen.getByText("A1")
    expect(badge).toHaveClass("text-base")
  })
})
