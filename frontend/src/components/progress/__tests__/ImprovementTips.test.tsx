/**
 * Tests for ImprovementTips component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ImprovementTips } from "../ImprovementTips"

const mockTips: string[] = [
  "Keep up the great work!",
  "Try reviewing Circle the Answer activities to boost your score!",
  "You're on a 5-day streak - amazing!",
]

const singleTip: string[] = ["Great job on your recent progress!"]

const emptyTips: string[] = []

describe("ImprovementTips", () => {
  it("renders component title", () => {
    render(<ImprovementTips tips={mockTips} />)

    expect(screen.getByText("Tips for You")).toBeInTheDocument()
  })

  it("renders nothing when tips are empty", () => {
    const { container } = render(<ImprovementTips tips={emptyTips} />)

    expect(container.firstChild).toBeNull()
  })

  it("renders all tips in the list", () => {
    render(<ImprovementTips tips={mockTips} />)

    expect(screen.getByText("Keep up the great work!")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Try reviewing Circle the Answer activities to boost your score!",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText("You're on a 5-day streak - amazing!"),
    ).toBeInTheDocument()
  })

  it("renders single tip correctly", () => {
    render(<ImprovementTips tips={singleTip} />)

    expect(screen.getByText("Tips for You")).toBeInTheDocument()
    expect(
      screen.getByText("Great job on your recent progress!"),
    ).toBeInTheDocument()
  })

  it("renders correct number of tip items", () => {
    render(<ImprovementTips tips={mockTips} />)

    // Each tip has a Sparkles icon in a container
    const tipContainers = screen.getAllByText(/./i).filter((el) => {
      return mockTips.includes(el.textContent || "")
    })

    expect(tipContainers).toHaveLength(3)
  })
})
