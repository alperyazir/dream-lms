/**
 * AddMaterialButton Component Tests
 * Story 21.3: Upload Materials in Resources Context
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import type { Material } from "@/types/material"
import { AddMaterialButton } from "./AddMaterialButton"

// Mock the UploadMaterialDialog component
vi.mock("@/components/materials/UploadMaterialDialog", () => ({
  UploadMaterialDialog: ({ open, onUploadComplete, context }: any) => (
    <div data-testid="upload-dialog" data-open={open}>
      Upload Dialog
      <button
        onClick={() =>
          onUploadComplete?.({ id: "123", name: "Test Material" } as Material)
        }
      >
        Complete Upload
      </button>
      {context?.bookId && <span data-testid="book-id">{context.bookId}</span>}
      {context?.assignmentId && (
        <span data-testid="assignment-id">{context.assignmentId}</span>
      )}
    </div>
  ),
}))

describe("AddMaterialButton", () => {
  it("renders the button", () => {
    render(<AddMaterialButton />)

    expect(
      screen.getByRole("button", { name: /add material/i }),
    ).toBeInTheDocument()
  })

  it("opens upload dialog on click", () => {
    render(<AddMaterialButton />)

    const button = screen.getByRole("button", { name: /add material/i })
    fireEvent.click(button)

    const dialog = screen.getByTestId("upload-dialog")
    expect(dialog).toHaveAttribute("data-open", "true")
  })

  it("passes context to upload dialog", () => {
    render(
      <AddMaterialButton bookId="book-123" assignmentId="assignment-456" />,
    )

    const button = screen.getByRole("button", { name: /add material/i })
    fireEvent.click(button)

    expect(screen.getByTestId("book-id")).toHaveTextContent("book-123")
    expect(screen.getByTestId("assignment-id")).toHaveTextContent(
      "assignment-456",
    )
  })

  it("calls onUploadComplete when material is uploaded", () => {
    const onUploadComplete = vi.fn()
    render(<AddMaterialButton onUploadComplete={onUploadComplete} />)

    const button = screen.getByRole("button", { name: /add material/i })
    fireEvent.click(button)

    const completeButton = screen.getByRole("button", {
      name: /complete upload/i,
    })
    fireEvent.click(completeButton)

    expect(onUploadComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "123",
        name: "Test Material",
      }),
    )
  })

  it("closes dialog after upload completes", () => {
    render(<AddMaterialButton />)

    const button = screen.getByRole("button", { name: /add material/i })
    fireEvent.click(button)

    expect(screen.getByTestId("upload-dialog")).toHaveAttribute(
      "data-open",
      "true",
    )

    const completeButton = screen.getByRole("button", {
      name: /complete upload/i,
    })
    fireEvent.click(completeButton)

    expect(screen.getByTestId("upload-dialog")).toHaveAttribute(
      "data-open",
      "false",
    )
  })
})
