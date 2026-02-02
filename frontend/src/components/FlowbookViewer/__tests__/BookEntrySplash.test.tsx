/**
 * BookEntrySplash Component Tests
 */

import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { BookEntrySplash } from "../BookEntrySplash"

describe("BookEntrySplash", () => {
  const defaultProps = {
    title: "Mathematics Grade 5",
    coverUrl: "https://example.com/cover.jpg",
    publisherName: "Universal ELT",
    publisherId: 1,
    onOpen: vi.fn(),
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("renders publisher logo", () => {
    render(<BookEntrySplash {...defaultProps} />)

    const logo = screen.getByAltText("Universal ELT")
    expect(logo).toHaveAttribute("src", "/api/v1/publishers/1/logo")
  })

  it("renders publisher name after name stage", () => {
    render(<BookEntrySplash {...defaultProps} />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText("Universal ELT")).toBeInTheDocument()
  })

  it("renders book title after book stage", () => {
    render(<BookEntrySplash {...defaultProps} />)

    act(() => {
      vi.advanceTimersByTime(2500)
    })

    expect(screen.getByText("Mathematics Grade 5")).toBeInTheDocument()
  })

  it("renders Open Book button after ready stage", () => {
    render(<BookEntrySplash {...defaultProps} />)

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(screen.getByRole("button", { name: /open book/i })).toBeInTheDocument()
  })

  it("calls onOpen when Open Book button is clicked", () => {
    const onOpen = vi.fn()
    render(<BookEntrySplash {...defaultProps} onOpen={onOpen} />)

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    fireEvent.click(screen.getByRole("button", { name: /open book/i }))

    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it("renders Back to Library button when onClose is provided", () => {
    const onClose = vi.fn()
    render(<BookEntrySplash {...defaultProps} onClose={onClose} />)

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(screen.getByRole("button", { name: /back to library/i })).toBeInTheDocument()
  })

  it("calls onClose when Back to Library button is clicked", () => {
    const onClose = vi.fn()
    render(<BookEntrySplash {...defaultProps} onClose={onClose} />)

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    fireEvent.click(screen.getByRole("button", { name: /back to library/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not render Back button when onClose is not provided", () => {
    render(<BookEntrySplash {...defaultProps} />)

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(screen.queryByRole("button", { name: /back to library/i })).not.toBeInTheDocument()
  })

  it("shows loading state when isLoading is true", () => {
    render(<BookEntrySplash {...defaultProps} isLoading={true} />)

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /loading/i })).toBeDisabled()
  })

  it("shows fallback initial when logo fails to load", () => {
    render(<BookEntrySplash {...defaultProps} />)

    const logo = screen.getByAltText("Universal ELT")
    fireEvent.error(logo)

    expect(screen.getByText("U")).toBeInTheDocument()
  })
})
