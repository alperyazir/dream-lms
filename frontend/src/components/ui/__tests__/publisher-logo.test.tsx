import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PublisherLogo } from "../publisher-logo"

describe("PublisherLogo", () => {
  it("renders loading skeleton initially", () => {
    render(<PublisherLogo publisherId="123" />)
    // The skeleton should be present initially
    const skeleton = document.querySelector(".animate-pulse")
    expect(skeleton).toBeInTheDocument()
  })

  it("shows fallback icon on error", async () => {
    render(<PublisherLogo publisherId="invalid" />)

    // Simulate image error
    const img = document.querySelector("img")
    if (img) {
      fireEvent.error(img)
    }

    await waitFor(() => {
      expect(screen.getByLabelText("Publisher logo")).toBeInTheDocument()
    })
  })

  it("applies correct size classes for sm", () => {
    render(<PublisherLogo publisherId="123" size="sm" />)
    const container = document.querySelector(".w-8.h-8")
    expect(container).toBeInTheDocument()
  })

  it("applies correct size classes for md (default)", () => {
    render(<PublisherLogo publisherId="123" />)
    const container = document.querySelector(".w-12.h-12")
    expect(container).toBeInTheDocument()
  })

  it("applies correct size classes for lg", () => {
    render(<PublisherLogo publisherId="123" size="lg" />)
    const container = document.querySelector(".w-16.h-16")
    expect(container).toBeInTheDocument()
  })

  it("uses correct API endpoint", () => {
    render(<PublisherLogo publisherId="abc-123" />)
    const img = document.querySelector("img") as HTMLImageElement
    expect(img?.src).toContain("/api/v1/publishers/abc-123/logo")
  })

  it("applies custom className", () => {
    render(<PublisherLogo publisherId="123" className="custom-class" />)
    const container = document.querySelector(".custom-class")
    expect(container).toBeInTheDocument()
  })

  it("uses custom alt text", () => {
    render(<PublisherLogo publisherId="123" alt="My Publisher Logo" />)
    const img = document.querySelector("img")
    expect(img).toHaveAttribute("alt", "My Publisher Logo")
  })

  it("shows fallback with correct icon size for sm", async () => {
    render(<PublisherLogo publisherId="123" size="sm" />)

    // Simulate image error
    const img = document.querySelector("img")
    if (img) {
      fireEvent.error(img)
    }

    await waitFor(() => {
      const fallback = screen.getByLabelText("Publisher logo")
      expect(fallback).toHaveClass("w-8", "h-8")
      const icon = fallback.querySelector("svg")
      expect(icon).toHaveClass("w-4", "h-4")
    })
  })

  it("shows fallback with correct icon size for lg", async () => {
    render(<PublisherLogo publisherId="123" size="lg" />)

    // Simulate image error
    const img = document.querySelector("img")
    if (img) {
      fireEvent.error(img)
    }

    await waitFor(() => {
      const fallback = screen.getByLabelText("Publisher logo")
      expect(fallback).toHaveClass("w-16", "h-16")
      const icon = fallback.querySelector("svg")
      expect(icon).toHaveClass("w-8", "h-8")
    })
  })

  it("hides image while loading", () => {
    render(<PublisherLogo publisherId="123" />)
    const img = document.querySelector("img")
    expect(img).toHaveClass("invisible")
  })

  it("shows image after load", async () => {
    render(<PublisherLogo publisherId="123" />)

    const img = document.querySelector("img")
    if (img) {
      fireEvent.load(img)
    }

    await waitFor(() => {
      const loadedImg = document.querySelector("img")
      expect(loadedImg).not.toHaveClass("invisible")
    })
  })

  it("fallback has proper accessibility attributes", async () => {
    render(<PublisherLogo publisherId="123" alt="Test Publisher" />)

    const img = document.querySelector("img")
    if (img) {
      fireEvent.error(img)
    }

    await waitFor(() => {
      const fallback = screen.getByLabelText("Test Publisher")
      expect(fallback).toHaveAttribute("role", "img")
      expect(fallback).toHaveAttribute("aria-label", "Test Publisher")
    })
  })
})
