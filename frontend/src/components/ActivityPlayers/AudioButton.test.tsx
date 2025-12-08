/**
 * AudioButton Component Tests
 * Story 10.2: Frontend Audio Player Component
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { AudioButton } from "./AudioButton"

describe("AudioButton", () => {
  it("renders without crashing", () => {
    const onClick = vi.fn()
    render(<AudioButton onClick={onClick} />)
    expect(screen.getByRole("button")).toBeInTheDocument()
  })

  it("calls onClick when clicked", () => {
    const onClick = vi.fn()
    render(<AudioButton onClick={onClick} />)

    const button = screen.getByRole("button")
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("shows headphones icon when not active", () => {
    const onClick = vi.fn()
    render(<AudioButton onClick={onClick} isActive={false} />)

    // Button should have aria-label indicating it can show audio
    expect(
      screen.getByRole("button", { name: /listen to audio/i }),
    ).toBeInTheDocument()
  })

  it("shows volume icon when active", () => {
    const onClick = vi.fn()
    render(<AudioButton onClick={onClick} isActive={true} />)

    // Button should have aria-label indicating it can hide audio
    expect(
      screen.getByRole("button", { name: /hide audio player/i }),
    ).toBeInTheDocument()
  })

  it("has aria-expanded attribute", () => {
    const onClick = vi.fn()

    // Test when not active
    const { rerender } = render(<AudioButton onClick={onClick} isActive={false} />)
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false")

    // Test when active
    rerender(<AudioButton onClick={onClick} isActive={true} />)
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true")
  })

  it("is disabled when loading", () => {
    const onClick = vi.fn()
    render(<AudioButton onClick={onClick} isLoading={true} />)

    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
  })

  it("is not disabled when not loading", () => {
    const onClick = vi.fn()
    render(<AudioButton onClick={onClick} isLoading={false} />)

    const button = screen.getByRole("button")
    expect(button).not.toBeDisabled()
  })

  it("shows loading spinner when loading", () => {
    const onClick = vi.fn()
    render(<AudioButton onClick={onClick} isLoading={true} />)

    // Loading state should show a spinner (div with animate-spin class)
    const button = screen.getByRole("button")
    const spinner = button.querySelector(".animate-spin")
    expect(spinner).toBeInTheDocument()
  })

  it("shows active indicator dot when active", () => {
    const onClick = vi.fn()
    render(<AudioButton onClick={onClick} isActive={true} />)

    // Active state should show an indicator dot
    const button = screen.getByRole("button")
    const dot = button.querySelector(".bg-teal-500")
    expect(dot).toBeInTheDocument()
  })
})
