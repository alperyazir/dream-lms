/**
 * AttachMaterialDialog Component Tests
 * Story 21.3: Upload Materials in Resources Context
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { vi } from "vitest"
import { assignmentsApi } from "@/services/assignmentsApi"
import type { Material, MaterialType } from "@/types/material"
import { AttachMaterialDialog } from "./AttachMaterialDialog"

// Mock the assignments API
vi.mock("@/services/assignmentsApi", () => ({
  assignmentsApi: {
    attachMaterial: vi.fn(),
  },
}))

// Mock the custom toast hook
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

const mockMaterial: Material = {
  id: "material-123",
  name: "Test Material",
  type: "document" as MaterialType,
  teacher_id: "teacher-1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function renderWithClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  )
}

describe("AttachMaterialDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the dialog when open", () => {
    renderWithClient(
      <AttachMaterialDialog
        material={mockMaterial}
        assignmentId="assignment-123"
        open={true}
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByText("Attach to Assignment?")).toBeInTheDocument()
    expect(screen.getByText(/Test Material/)).toBeInTheDocument()
  })

  it("does not render when closed", () => {
    renderWithClient(
      <AttachMaterialDialog
        material={mockMaterial}
        assignmentId="assignment-123"
        open={false}
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.queryByText("Attach to Assignment?")).not.toBeInTheDocument()
  })

  it("calls attachMaterial API when Attach button is clicked", async () => {
    const mockAttach = vi.mocked(assignmentsApi.attachMaterial)
    mockAttach.mockResolvedValue({ status: "attached" })

    const onOpenChange = vi.fn()

    renderWithClient(
      <AttachMaterialDialog
        material={mockMaterial}
        assignmentId="assignment-123"
        open={true}
        onOpenChange={onOpenChange}
      />,
    )

    const attachButton = screen.getByRole("button", { name: /^attach$/i })
    fireEvent.click(attachButton)

    await waitFor(() => {
      expect(mockAttach).toHaveBeenCalledWith("assignment-123", "material-123")
    })
  })

  it("closes dialog on Not Now button click", () => {
    const onOpenChange = vi.fn()

    renderWithClient(
      <AttachMaterialDialog
        material={mockMaterial}
        assignmentId="assignment-123"
        open={true}
        onOpenChange={onOpenChange}
      />,
    )

    const cancelButton = screen.getByRole("button", { name: /not now/i })
    fireEvent.click(cancelButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("shows loading state while attaching", async () => {
    const mockAttach = vi.mocked(assignmentsApi.attachMaterial)
    mockAttach.mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithClient(
      <AttachMaterialDialog
        material={mockMaterial}
        assignmentId="assignment-123"
        open={true}
        onOpenChange={vi.fn()}
      />,
    )

    const attachButton = screen.getByRole("button", { name: /^attach$/i })
    fireEvent.click(attachButton)

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /attaching/i }),
      ).toBeInTheDocument()
    })
  })

  it("closes dialog after successful attachment", async () => {
    const mockAttach = vi.mocked(assignmentsApi.attachMaterial)
    mockAttach.mockResolvedValue({ status: "attached" })

    const onOpenChange = vi.fn()

    renderWithClient(
      <AttachMaterialDialog
        material={mockMaterial}
        assignmentId="assignment-123"
        open={true}
        onOpenChange={onOpenChange}
      />,
    )

    const attachButton = screen.getByRole("button", { name: /^attach$/i })
    fireEvent.click(attachButton)

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
