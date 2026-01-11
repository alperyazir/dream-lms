/**
 * MaterialLibrary Component Tests
 * Story 27.15: Teacher Materials Processing
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TeacherMaterial } from "@/types/teacher-material"
import { MaterialLibrary } from "./MaterialLibrary"

// Mock materials data
const mockMaterials: TeacherMaterial[] = [
  {
    id: "material-1",
    teacher_id: "teacher-uuid",
    name: "Test PDF Document",
    description: "A sample PDF for testing",
    type: "document",
    source_type: "pdf",
    original_filename: "test.pdf",
    file_size: 1024,
    mime_type: "application/pdf",
    extracted_text: "Sample extracted text from PDF",
    word_count: 100,
    language: "en",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    download_url: null,
    is_processable: true,
  },
  {
    id: "material-2",
    teacher_id: "teacher-uuid",
    name: "Text Note Material",
    description: null,
    type: "text_note",
    source_type: "text",
    original_filename: null,
    file_size: null,
    mime_type: null,
    extracted_text: "Pasted text content",
    word_count: 50,
    language: "tr",
    created_at: "2024-01-16T10:00:00Z",
    updated_at: "2024-01-16T10:00:00Z",
    download_url: null,
    is_processable: true,
  },
]

describe("MaterialLibrary", () => {
  describe("Loading State", () => {
    it("shows loading indicator when isLoading is true", () => {
      render(<MaterialLibrary materials={[]} isLoading={true} />)

      // Should show a loading spinner
      expect(document.querySelector(".animate-spin")).toBeInTheDocument()
    })
  })

  describe("Error State", () => {
    it("displays error message when error is provided", () => {
      render(
        <MaterialLibrary materials={[]} error="Failed to load materials" />,
      )

      expect(screen.getByText("Failed to load materials")).toBeInTheDocument()
    })
  })

  describe("Empty State", () => {
    it("shows empty state message when no materials", () => {
      render(<MaterialLibrary materials={[]} />)

      expect(screen.getByText(/no materials yet/i)).toBeInTheDocument()
    })
  })

  describe("Materials Display", () => {
    it("renders all materials", () => {
      render(<MaterialLibrary materials={mockMaterials} />)

      expect(screen.getByText("Test PDF Document")).toBeInTheDocument()
      expect(screen.getByText("Text Note Material")).toBeInTheDocument()
    })

    it("shows word count for each material", () => {
      render(<MaterialLibrary materials={mockMaterials} />)

      expect(screen.getByText("100 words")).toBeInTheDocument()
      expect(screen.getByText("50 words")).toBeInTheDocument()
    })

    it("shows language for materials that have it", () => {
      render(<MaterialLibrary materials={mockMaterials} />)

      expect(screen.getByText("English")).toBeInTheDocument()
      expect(screen.getByText("Turkish")).toBeInTheDocument()
    })

    it("shows PDF badge for PDF materials", () => {
      render(<MaterialLibrary materials={mockMaterials} />)

      expect(screen.getByText("PDF")).toBeInTheDocument()
    })

    it("shows description when available", () => {
      render(<MaterialLibrary materials={mockMaterials} />)

      expect(screen.getByText("A sample PDF for testing")).toBeInTheDocument()
    })
  })

  describe("Selection Mode", () => {
    const onSelect = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it("calls onSelect when material is clicked in selection mode", async () => {
      const user = userEvent.setup()
      render(
        <MaterialLibrary
          materials={mockMaterials}
          onSelect={onSelect}
          selectionMode={true}
        />,
      )

      await user.click(
        screen.getByText("Test PDF Document").closest("div")!.parentElement!,
      )

      expect(onSelect).toHaveBeenCalledWith(mockMaterials[0])
    })

    it("shows selection indicator for selected material", () => {
      render(
        <MaterialLibrary
          materials={mockMaterials}
          selectionMode={true}
          selectedMaterialId="material-1"
        />,
      )

      // The selected card should have a different style
      const selectedCard = screen
        .getByText("Test PDF Document")
        .closest(".border-teal-500")
      expect(selectedCard).toBeInTheDocument()
    })
  })

  describe("Delete Action", () => {
    const onDelete = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
      onDelete.mockResolvedValue(undefined)
    })

    it("shows delete option in menu when onDelete is provided", async () => {
      const user = userEvent.setup()
      render(<MaterialLibrary materials={mockMaterials} onDelete={onDelete} />)

      // Click the action menu button
      const menuButtons = screen.getAllByRole("button", { name: /actions/i })
      await user.click(menuButtons[0])

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument()
      })
    })

    it("opens delete confirmation dialog when delete is clicked", async () => {
      const user = userEvent.setup()
      render(<MaterialLibrary materials={mockMaterials} onDelete={onDelete} />)

      // Click the action menu button
      const menuButtons = screen.getAllByRole("button", { name: /actions/i })
      await user.click(menuButtons[0])

      // Click delete
      await user.click(screen.getByText("Delete"))

      await waitFor(() => {
        expect(
          screen.getByText(/are you sure you want to delete/i),
        ).toBeInTheDocument()
      })
    })

    it("calls onDelete when delete is confirmed", async () => {
      const user = userEvent.setup()
      render(<MaterialLibrary materials={mockMaterials} onDelete={onDelete} />)

      // Open menu and click delete
      const menuButtons = screen.getAllByRole("button", { name: /actions/i })
      await user.click(menuButtons[0])
      await user.click(screen.getByText("Delete"))

      // Confirm deletion
      await user.click(screen.getByRole("button", { name: /^delete$/i }))

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith("material-1")
      })
    })
  })

  describe("Preview Action", () => {
    it("opens preview dialog when preview is clicked", async () => {
      const user = userEvent.setup()
      render(<MaterialLibrary materials={mockMaterials} />)

      // Click the action menu button
      const menuButtons = screen.getAllByRole("button", { name: /actions/i })
      await user.click(menuButtons[0])

      // Click preview
      await user.click(screen.getByText(/preview text/i))

      await waitFor(() => {
        expect(
          screen.getByText("Sample extracted text from PDF"),
        ).toBeInTheDocument()
      })
    })
  })
})
