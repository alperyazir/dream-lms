/**
 * ContentCard Tests
 * Story 27.21: Content Library UI - Task 11
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { ContentItem } from "@/types/content-library"
import { ContentCard } from "./ContentCard"

describe("ContentCard", () => {
  const mockContent: ContentItem = {
    id: "test-id-1",
    activity_type: "ai_quiz",
    title: "Test Quiz",
    source_type: "book",
    book_id: 123,
    book_title: "Test Book",
    material_id: null,
    material_name: null,
    item_count: 10,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: null,
    used_in_assignments: 2,
    is_shared: true,
    created_by: {
      id: "teacher-id",
      name: "John Doe",
    },
  }

  const mockOnPreview = vi.fn()
  const mockOnUse = vi.fn()

  it("renders content card with basic information", () => {
    render(
      <ContentCard
        content={mockContent}
        onPreview={mockOnPreview}
        onUse={mockOnUse}
      />,
    )

    expect(screen.getByText("Test Quiz")).toBeInTheDocument()
    expect(screen.getByText("Quiz")).toBeInTheDocument()
    expect(screen.getByText("Test Book")).toBeInTheDocument()
  })

  it("shows item count correctly", () => {
    render(
      <ContentCard
        content={mockContent}
        onPreview={mockOnPreview}
        onUse={mockOnUse}
      />,
    )

    expect(screen.getByText("10 items")).toBeInTheDocument()
  })

  it("shows usage badge when used in assignments", () => {
    render(
      <ContentCard
        content={mockContent}
        onPreview={mockOnPreview}
        onUse={mockOnUse}
      />,
    )

    expect(screen.getByText("Used 2x")).toBeInTheDocument()
  })

  it("shows shared badge for shared content", () => {
    render(
      <ContentCard
        content={mockContent}
        onPreview={mockOnPreview}
        onUse={mockOnUse}
      />,
    )

    expect(screen.getByText("Shared")).toBeInTheDocument()
  })

  it("shows creator name for shared content", () => {
    render(
      <ContentCard
        content={mockContent}
        onPreview={mockOnPreview}
        onUse={mockOnUse}
      />,
    )

    expect(screen.getByText(/By: John Doe/)).toBeInTheDocument()
  })

  it("calls onPreview when Preview button is clicked", async () => {
    const user = userEvent.setup()

    render(
      <ContentCard
        content={mockContent}
        onPreview={mockOnPreview}
        onUse={mockOnUse}
      />,
    )

    const previewButton = screen.getByRole("button", { name: /preview/i })
    await user.click(previewButton)

    expect(mockOnPreview).toHaveBeenCalledWith(mockContent)
  })

  it("calls onUse when Use button is clicked", async () => {
    const user = userEvent.setup()

    render(
      <ContentCard
        content={mockContent}
        onPreview={mockOnPreview}
        onUse={mockOnUse}
      />,
    )

    const useButton = screen.getByRole("button", { name: /use/i })
    await user.click(useButton)

    expect(mockOnUse).toHaveBeenCalledWith(mockContent)
  })

  it("displays material name for material-based content", () => {
    const materialContent: ContentItem = {
      ...mockContent,
      source_type: "material",
      book_id: null,
      book_title: null,
      material_id: "material-id",
      material_name: "My PDF Material",
      is_shared: false,
    }

    render(
      <ContentCard
        content={materialContent}
        onPreview={mockOnPreview}
        onUse={mockOnUse}
      />,
    )

    expect(screen.getByText("My PDF Material")).toBeInTheDocument()
    expect(screen.queryByText("Shared")).not.toBeInTheDocument()
  })

  it("displays 'My Material' when material name is null", () => {
    const materialContent: ContentItem = {
      ...mockContent,
      source_type: "material",
      book_id: null,
      book_title: null,
      material_id: "material-id",
      material_name: null,
      is_shared: false,
    }

    render(
      <ContentCard
        content={materialContent}
        onPreview={mockOnPreview}
        onUse={mockOnUse}
      />,
    )

    expect(screen.getByText("My Material")).toBeInTheDocument()
  })

  it("shows singular 'item' for count of 1", () => {
    const singleItemContent: ContentItem = {
      ...mockContent,
      item_count: 1,
    }

    render(
      <ContentCard
        content={singleItemContent}
        onPreview={mockOnPreview}
        onUse={mockOnUse}
      />,
    )

    expect(screen.getByText("1 item")).toBeInTheDocument()
  })

  it("does not show usage badge when not used", () => {
    const unusedContent: ContentItem = {
      ...mockContent,
      used_in_assignments: 0,
    }

    render(
      <ContentCard
        content={unusedContent}
        onPreview={mockOnPreview}
        onUse={mockOnUse}
      />,
    )

    expect(screen.queryByText(/Used/)).not.toBeInTheDocument()
  })
})
