/**
 * MaterialUpload Component Tests
 * Story 27.15: Teacher Materials Processing
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TeacherMaterialUploadResponse } from "@/types/teacher-material"
import { MaterialUpload } from "./MaterialUpload"

// Mock response data
const mockUploadResponse: TeacherMaterialUploadResponse = {
  material: {
    id: "test-uuid",
    teacher_id: "teacher-uuid",
    name: "Test Material",
    description: null,
    type: "document",
    source_type: "pdf",
    original_filename: "test.pdf",
    file_size: 1024,
    mime_type: "application/pdf",
    extracted_text: "Sample extracted text from PDF",
    word_count: 5,
    language: "en",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    download_url: null,
    is_processable: true,
  },
  extraction: {
    extracted_text: "Sample extracted text from PDF",
    word_count: 5,
    language: "en",
    source_type: "pdf",
  },
}

describe("MaterialUpload", () => {
  const mockOnUploadPdf = vi.fn()
  const mockOnCreateTextMaterial = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnUploadPdf.mockResolvedValue(mockUploadResponse)
    mockOnCreateTextMaterial.mockResolvedValue(mockUploadResponse)
  })

  describe("Tab Navigation", () => {
    it("renders both PDF and Text tabs", () => {
      render(
        <MaterialUpload
          onUploadPdf={mockOnUploadPdf}
          onCreateTextMaterial={mockOnCreateTextMaterial}
        />,
      )

      expect(
        screen.getByRole("tab", { name: /upload pdf/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("tab", { name: /paste text/i }),
      ).toBeInTheDocument()
    })

    it("shows PDF upload by default", () => {
      render(
        <MaterialUpload
          onUploadPdf={mockOnUploadPdf}
          onCreateTextMaterial={mockOnCreateTextMaterial}
        />,
      )

      expect(screen.getByText(/drag and drop pdf here/i)).toBeInTheDocument()
    })

    it("switches to text input when clicking Text tab", async () => {
      const user = userEvent.setup()
      render(
        <MaterialUpload
          onUploadPdf={mockOnUploadPdf}
          onCreateTextMaterial={mockOnCreateTextMaterial}
        />,
      )

      await user.click(screen.getByRole("tab", { name: /paste text/i }))

      expect(screen.getByLabelText(/text content/i)).toBeInTheDocument()
    })
  })

  describe("PDF Upload", () => {
    it("shows file info after selecting a PDF", async () => {
      const user = userEvent.setup()
      render(
        <MaterialUpload
          onUploadPdf={mockOnUploadPdf}
          onCreateTextMaterial={mockOnCreateTextMaterial}
        />,
      )

      const file = new File(["dummy content"], "test.pdf", {
        type: "application/pdf",
      })
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement

      await user.upload(input, file)

      // Should show the file name (auto-filled from filename)
      await waitFor(() => {
        expect(screen.getByDisplayValue("test")).toBeInTheDocument()
      })
    })

    it("rejects non-PDF files", async () => {
      const user = userEvent.setup()
      render(
        <MaterialUpload
          onUploadPdf={mockOnUploadPdf}
          onCreateTextMaterial={mockOnCreateTextMaterial}
        />,
      )

      const file = new File(["dummy content"], "test.txt", {
        type: "text/plain",
      })
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement

      await user.upload(input, file)

      await waitFor(() => {
        expect(
          screen.getByText(/only pdf files are supported/i),
        ).toBeInTheDocument()
      })
    })

    it("calls onUploadPdf when upload button is clicked", async () => {
      const user = userEvent.setup()
      render(
        <MaterialUpload
          onUploadPdf={mockOnUploadPdf}
          onCreateTextMaterial={mockOnCreateTextMaterial}
        />,
      )

      // Upload a file
      const file = new File(["dummy content"], "test.pdf", {
        type: "application/pdf",
      })
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement
      await user.upload(input, file)

      // Wait for name input and click upload
      await waitFor(() => {
        expect(screen.getByDisplayValue("test")).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole("button", {
        name: /upload and extract text/i,
      })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(mockOnUploadPdf).toHaveBeenCalledWith(
          expect.any(File),
          "test",
          undefined,
          expect.any(Function),
        )
      })
    })
  })

  describe("Text Material Creation", () => {
    it("shows text input fields", async () => {
      const user = userEvent.setup()
      render(
        <MaterialUpload
          onUploadPdf={mockOnUploadPdf}
          onCreateTextMaterial={mockOnCreateTextMaterial}
        />,
      )

      await user.click(screen.getByRole("tab", { name: /paste text/i }))

      expect(screen.getByLabelText(/material name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/text content/i)).toBeInTheDocument()
    })

    it("calls onCreateTextMaterial when form is submitted", async () => {
      const user = userEvent.setup()
      render(
        <MaterialUpload
          onUploadPdf={mockOnUploadPdf}
          onCreateTextMaterial={mockOnCreateTextMaterial}
        />,
      )

      await user.click(screen.getByRole("tab", { name: /paste text/i }))

      await user.type(
        screen.getByLabelText(/material name/i),
        "My Text Material",
      )
      await user.type(
        screen.getByLabelText(/text content/i),
        "This is sample text content for AI processing.",
      )

      const submitButton = screen.getByRole("button", {
        name: /create text material/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnCreateTextMaterial).toHaveBeenCalledWith(
          "My Text Material",
          "This is sample text content for AI processing.",
          undefined,
        )
      })
    })

    it("shows word count for entered text", async () => {
      const user = userEvent.setup()
      render(
        <MaterialUpload
          onUploadPdf={mockOnUploadPdf}
          onCreateTextMaterial={mockOnCreateTextMaterial}
        />,
      )

      await user.click(screen.getByRole("tab", { name: /paste text/i }))
      await user.type(
        screen.getByLabelText(/text content/i),
        "one two three four five",
      )

      await waitFor(() => {
        expect(screen.getByText(/5 words/i)).toBeInTheDocument()
      })
    })
  })

  describe("Disabled State", () => {
    it("disables all inputs when disabled prop is true", async () => {
      const user = userEvent.setup()
      render(
        <MaterialUpload
          onUploadPdf={mockOnUploadPdf}
          onCreateTextMaterial={mockOnCreateTextMaterial}
          disabled
        />,
      )

      await user.click(screen.getByRole("tab", { name: /paste text/i }))

      const nameInput = screen.getByLabelText(/material name/i)
      const textInput = screen.getByLabelText(/text content/i)

      expect(nameInput).toBeDisabled()
      expect(textInput).toBeDisabled()
    })
  })
})
