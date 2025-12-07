/**
 * Tests for AchievementBadges component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { Achievement } from "@/types/analytics"
import { AchievementBadges } from "../AchievementBadges"

const mockAchievements: Achievement[] = [
  {
    id: "first_complete",
    type: "first_complete",
    title: "First Steps",
    description: "Completed your first assignment!",
    earned_at: "2025-01-20T10:00:00Z",
    icon: "rocket",
  },
  {
    id: "perfect_score",
    type: "perfect_score",
    title: "Perfect!",
    description: "Scored 100% on an assignment",
    earned_at: "2025-01-22T14:30:00Z",
    icon: "star",
  },
  {
    id: "streak_7",
    type: "streak",
    title: "Week Warrior",
    description: "7-day completion streak",
    earned_at: "2025-01-25T09:00:00Z",
    icon: "flame",
  },
]

const emptyAchievements: Achievement[] = []

describe("AchievementBadges", () => {
  it("renders component title", () => {
    render(<AchievementBadges achievements={mockAchievements} />)

    expect(screen.getByText("Achievements")).toBeInTheDocument()
  })

  it("renders empty state when no achievements", () => {
    render(<AchievementBadges achievements={emptyAchievements} />)

    expect(screen.getByText("Achievements")).toBeInTheDocument()
    expect(
      screen.getByText("Complete assignments to earn badges!"),
    ).toBeInTheDocument()
  })

  it("displays count of earned achievements", () => {
    render(<AchievementBadges achievements={mockAchievements} />)

    expect(screen.getByText("3 earned")).toBeInTheDocument()
  })

  it("renders all achievement titles", () => {
    render(<AchievementBadges achievements={mockAchievements} />)

    expect(screen.getByText("First Steps")).toBeInTheDocument()
    expect(screen.getByText("Perfect!")).toBeInTheDocument()
    expect(screen.getByText("Week Warrior")).toBeInTheDocument()
  })

  it("formats earned dates correctly", () => {
    render(<AchievementBadges achievements={mockAchievements} />)

    expect(screen.getByText("Jan 20")).toBeInTheDocument()
    expect(screen.getByText("Jan 22")).toBeInTheDocument()
    expect(screen.getByText("Jan 25")).toBeInTheDocument()
  })

  it("has title attribute with description for accessibility", () => {
    render(<AchievementBadges achievements={mockAchievements} />)

    const badge = screen.getByTitle("Completed your first assignment!")
    expect(badge).toBeInTheDocument()
  })

  it("renders single achievement correctly", () => {
    const singleAchievement = [mockAchievements[0]]
    render(<AchievementBadges achievements={singleAchievement} />)

    expect(screen.getByText("1 earned")).toBeInTheDocument()
    expect(screen.getByText("First Steps")).toBeInTheDocument()
  })
})
