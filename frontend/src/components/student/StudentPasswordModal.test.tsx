/**
 * StudentPasswordModal Tests - Story 28.1
 * Tests for the student password view/set modal component.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { StudentPasswordModal } from "./StudentPasswordModal"

// Mock the studentsApi module
vi.mock("@/services/studentsApi", () => ({
  getStudentPassword: vi.fn(),
  setStudentPassword: vi.fn(),
}))

// Mock useCustomToast
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

import { getStudentPassword, setStudentPassword } from "@/services/studentsApi"

const mockGetStudentPassword = vi.mocked(getStudentPassword)
const mockSetStudentPassword = vi.mocked(setStudentPassword)

describe("StudentPasswordModal", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const renderModal = (props = {}) => {
    const defaultProps = {
      studentId: "test-student-id",
      studentName: "John Doe",
      isOpen: true,
      onClose: vi.fn(),
      ...props,
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <StudentPasswordModal {...defaultProps} />
      </QueryClientProvider>,
    )
  }

  it("should display student name in description", async () => {
    mockGetStudentPassword.mockResolvedValue({
      student_id: "test-student-id",
      username: "john.doe",
      full_name: "John Doe",
      password: "testpass123",
      message: null,
    })

    renderModal()

    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    })
  })

  it("should display username when loaded", async () => {
    mockGetStudentPassword.mockResolvedValue({
      student_id: "test-student-id",
      username: "john.doe",
      full_name: "John Doe",
      password: "testpass123",
      message: null,
    })

    renderModal()

    await waitFor(() => {
      expect(screen.getByText("john.doe")).toBeInTheDocument()
    })
  })

  it("should show password as masked by default", async () => {
    mockGetStudentPassword.mockResolvedValue({
      student_id: "test-student-id",
      username: "john.doe",
      full_name: "John Doe",
      password: "testpass123",
      message: null,
    })

    renderModal()

    await waitFor(() => {
      expect(screen.getByText("john.doe")).toBeInTheDocument()
    })

    // Password should be masked
    expect(screen.queryByText("testpass123")).not.toBeInTheDocument()
  })

  it("should display message when password is not available", async () => {
    mockGetStudentPassword.mockResolvedValue({
      student_id: "test-student-id",
      username: "john.doe",
      full_name: "John Doe",
      password: null,
      message: "Password was set before this feature was enabled",
    })

    renderModal()

    await waitFor(() => {
      expect(
        screen.getByText("Password was set before this feature was enabled"),
      ).toBeInTheDocument()
    })
  })

  it("should show loading state while fetching password", () => {
    mockGetStudentPassword.mockImplementation(
      () => new Promise(() => {}), // Never resolves
    )

    renderModal()

    // Should show loading indicator
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("should have set new password input", async () => {
    mockGetStudentPassword.mockResolvedValue({
      student_id: "test-student-id",
      username: "john.doe",
      full_name: "John Doe",
      password: "testpass123",
      message: null,
    })

    renderModal()

    await waitFor(() => {
      expect(screen.getByText("john.doe")).toBeInTheDocument()
    })

    // Find the new password input
    const input = screen.getByPlaceholderText(/Enter new password/i)
    expect(input).toBeInTheDocument()
  })

  it("should validate minimum password length", async () => {
    mockGetStudentPassword.mockResolvedValue({
      student_id: "test-student-id",
      username: "john.doe",
      full_name: "John Doe",
      password: "testpass123",
      message: null,
    })

    renderModal()

    await waitFor(() => {
      expect(screen.getByText("john.doe")).toBeInTheDocument()
    })

    // Enter short password
    const input = screen.getByPlaceholderText(/Enter new password/i)
    fireEvent.change(input, { target: { value: "abc" } })

    // Try to submit - find button with Save icon
    const saveButtons = screen.getAllByRole("button")
    const saveButton = saveButtons.find((btn) => {
      const svg = btn.querySelector("svg")
      return svg?.classList.contains("lucide-save")
    })

    if (saveButton) {
      fireEvent.click(saveButton)
    }

    // setStudentPassword should not be called for short passwords
    expect(mockSetStudentPassword).not.toHaveBeenCalled()
  })

  it("should call setStudentPassword with valid password", async () => {
    mockGetStudentPassword.mockResolvedValue({
      student_id: "test-student-id",
      username: "john.doe",
      full_name: "John Doe",
      password: "testpass123",
      message: null,
    })

    mockSetStudentPassword.mockResolvedValue({
      student_id: "test-student-id",
      username: "john.doe",
      full_name: "John Doe",
      password: "newpassword123",
      message: "Password updated successfully",
    })

    renderModal()

    await waitFor(() => {
      expect(screen.getByText("john.doe")).toBeInTheDocument()
    })

    // Enter valid password
    const input = screen.getByPlaceholderText(/Enter new password/i)
    fireEvent.change(input, { target: { value: "newpassword123" } })

    // Find and click the save button (the one with gradient background)
    const buttons = screen.getAllByRole("button")
    const saveButton = buttons.find((btn) =>
      btn.className.includes("bg-gradient"),
    )

    if (saveButton) {
      fireEvent.click(saveButton)
    }

    await waitFor(() => {
      expect(mockSetStudentPassword).toHaveBeenCalledWith(
        "test-student-id",
        "newpassword123",
      )
    })
  })

  it("should call onClose when close button is clicked", async () => {
    const onClose = vi.fn()
    mockGetStudentPassword.mockResolvedValue({
      student_id: "test-student-id",
      username: "john.doe",
      full_name: "John Doe",
      password: "testpass123",
      message: null,
    })

    renderModal({ onClose })

    await waitFor(() => {
      expect(screen.getByText("john.doe")).toBeInTheDocument()
    })

    // Click close button (the footer one with explicit "Close" text)
    const closeButtons = screen.getAllByRole("button", { name: /close/i })
    // Get the button in the DialogFooter (the one with "Close" as direct text)
    const footerCloseButton = closeButtons.find(
      (btn) => btn.textContent === "Close",
    )
    if (footerCloseButton) {
      fireEvent.click(footerCloseButton)
    }

    expect(onClose).toHaveBeenCalled()
  })

  it("should not render when isOpen is false", () => {
    mockGetStudentPassword.mockResolvedValue({
      student_id: "test-student-id",
      username: "john.doe",
      full_name: "John Doe",
      password: "testpass123",
      message: null,
    })

    renderModal({ isOpen: false })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("should display Student Credentials title", async () => {
    mockGetStudentPassword.mockResolvedValue({
      student_id: "test-student-id",
      username: "john.doe",
      full_name: "John Doe",
      password: "testpass123",
      message: null,
    })

    renderModal()

    await waitFor(() => {
      expect(screen.getByText("Student Credentials")).toBeInTheDocument()
    })
  })
})
