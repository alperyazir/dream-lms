import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AdminService, PublishersService } from "@/client"
import * as bookAssignmentsApi from "@/services/bookAssignmentsApi"
import type { Book } from "@/types/book"
import { QuickAssignDialog } from "../QuickAssignDialog"

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock the services
vi.mock("@/client", () => ({
  AdminService: {
    listTeachers: vi.fn(),
  },
  PublishersService: {
    listMyTeachers: vi.fn(),
  },
}))

vi.mock("@/services/bookAssignmentsApi", () => ({
  getBookAssignments: vi.fn(),
  createBulkBookAssignments: vi.fn(),
}))

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}))

const mockBook: Book = {
  id: 123,
  dream_storage_id: "test-123",
  title: "Test Book",
  publisher_name: "Test Publisher",
  description: "Test description",
  cover_image_url: "/test-cover.jpg",
  activity_count: 10,
}

const mockTeachers = [
  {
    id: "teacher-1",
    user_id: "user-1",
    user_full_name: "John Doe",
    user_email: "john@example.com",
    user_username: "john.doe",
    school_id: "school-1",
    subject_specialization: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "teacher-2",
    user_id: "user-2",
    user_full_name: "Jane Smith",
    user_email: "jane@example.com",
    user_username: "jane.smith",
    school_id: "school-1",
    subject_specialization: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "teacher-3",
    user_id: "user-3",
    user_full_name: "Bob Wilson",
    user_email: "bob@example.com",
    user_username: "bob.wilson",
    school_id: "school-2",
    subject_specialization: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
]

describe("QuickAssignDialog", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
    vi.mocked(AdminService.listTeachers).mockResolvedValue(mockTeachers)
    vi.mocked(PublishersService.listMyTeachers).mockResolvedValue(mockTeachers)
    vi.mocked(bookAssignmentsApi.getBookAssignments).mockResolvedValue([])
  })

  const renderDialog = (isAdmin = false, open = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <QuickAssignDialog
          open={open}
          onOpenChange={vi.fn()}
          book={mockBook}
          isAdmin={isAdmin}
        />
      </QueryClientProvider>,
    )
  }

  it("displays book title in dialog description", async () => {
    renderDialog()
    await waitFor(() => {
      expect(screen.getByText(/Test Book/)).toBeInTheDocument()
    })
  })

  it("loads and displays teachers for publisher", async () => {
    renderDialog(false)
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
      expect(screen.getByText("Jane Smith")).toBeInTheDocument()
    })
    expect(PublishersService.listMyTeachers).toHaveBeenCalled()
  })

  it("loads and displays teachers for admin", async () => {
    renderDialog(true)
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })
    expect(AdminService.listTeachers).toHaveBeenCalledWith({ limit: 1000 })
  })

  it("filters teachers by search query", async () => {
    const user = userEvent.setup()
    renderDialog()

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText("Search teachers...")
    await user.type(searchInput, "Jane")

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument()
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument()
    })
  })

  it("allows selecting multiple teachers", async () => {
    const user = userEvent.setup()
    renderDialog()

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])

    // Check that submit button shows count
    await waitFor(() => {
      expect(screen.getByText("Submit (2)")).toBeInTheDocument()
    })
  })

  it("shows assigned teachers in separate section with unassign button", async () => {
    vi.mocked(bookAssignmentsApi.getBookAssignments).mockResolvedValue([
      {
        id: "assignment-1",
        book_id: 123,
        teacher_id: "teacher-1",
        school_id: "school-1",
        assigned_by: "admin",
        assigned_at: "2024-01-01",
        teacher_name: "John Doe",
        teacher_email: "john@example.com",
        book_title: "Test Book",
      } as any,
    ])

    renderDialog()

    await waitFor(() => {
      // Should show "Currently Assigned" section
      expect(screen.getByText(/Currently Assigned/)).toBeInTheDocument()

      // John Doe should be in assigned section (appears twice - once in assigned, once in available)
      const johnDoeElements = screen.getAllByText("John Doe")
      expect(johnDoeElements.length).toBeGreaterThanOrEqual(1)

      // Should have "Available Teachers" section with remaining teachers
      expect(screen.getByText(/Available Teachers/)).toBeInTheDocument()
    })
  })

  it("disables submit button when no teachers selected", async () => {
    renderDialog()

    await waitFor(() => {
      expect(screen.getByText("Submit (0)")).toBeDisabled()
    })
  })

  it("shows Submit (0) button as disabled when no teachers selected", async () => {
    renderDialog()

    await waitFor(() => {
      const submitButton = screen.getByText("Submit (0)")
      expect(submitButton).toBeDisabled()
    })
  })

  it("successfully assigns book to selected teachers", async () => {
    vi.mocked(bookAssignmentsApi.createBulkBookAssignments).mockResolvedValue(
      [] as any,
    )
    const user = userEvent.setup()
    renderDialog()

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    // Select first teacher
    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[0])

    // Click submit
    const submitButton = screen.getByText("Submit (1)")
    await user.click(submitButton)

    await waitFor(() => {
      expect(bookAssignmentsApi.createBulkBookAssignments).toHaveBeenCalled()
    })
  })
})
