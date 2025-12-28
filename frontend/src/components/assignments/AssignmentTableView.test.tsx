import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import type { AssignmentListItem } from "@/types/assignment"
import { AssignmentTableView } from "./AssignmentTableView"

const mockAssignments: AssignmentListItem[] = [
  {
    id: "1",
    name: "Assignment 1",
    instructions: "Test 1",
    due_date: new Date(Date.now() + 86400000).toISOString(),
    time_limit_minutes: 60,
    created_at: new Date().toISOString(),
    book_id: "book-1",
    book_title: "Book 1",
    activity_id: "activity-1",
    activity_title: "Activity 1",
    activity_type: "quiz",
    total_students: 10,
    not_started: 5,
    in_progress: 3,
    completed: 2,
    scheduled_publish_date: null,
    status: "published",
  },
  {
    id: "2",
    name: "Assignment 2",
    instructions: "Test 2",
    due_date: null,
    time_limit_minutes: null,
    created_at: new Date().toISOString(),
    book_id: "book-2",
    book_title: "Book 2",
    activity_id: "activity-2",
    activity_title: "Activity 2",
    activity_type: "flashcard",
    total_students: 5,
    not_started: 5,
    in_progress: 0,
    completed: 0,
    scheduled_publish_date: null,
    status: "draft",
  },
]

describe("AssignmentTableView", () => {
  const mockHandlers = {
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onSort: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders table with assignments", () => {
    render(
      <AssignmentTableView assignments={mockAssignments} {...mockHandlers} />,
    )

    expect(screen.getByText("Assignment 1")).toBeInTheDocument()
    expect(screen.getByText("Assignment 2")).toBeInTheDocument()
  })

  it("displays empty state when no assignments", () => {
    render(<AssignmentTableView assignments={[]} {...mockHandlers} />)

    expect(screen.getByText("No assignments found")).toBeInTheDocument()
  })

  it("calls onView when view button is clicked", () => {
    render(
      <AssignmentTableView assignments={mockAssignments} {...mockHandlers} />,
    )

    const viewButtons = screen.getAllByRole("button")
    const firstViewButton = viewButtons.find((btn) =>
      btn.querySelector('svg[class*="lucide-eye"]'),
    )
    if (firstViewButton) {
      fireEvent.click(firstViewButton)
      expect(mockHandlers.onView).toHaveBeenCalledWith(mockAssignments[0])
    }
  })

  it("calls onSort when sortable column is clicked", () => {
    render(
      <AssignmentTableView
        assignments={mockAssignments}
        {...mockHandlers}
        sortBy="due_date"
      />,
    )

    const dueDateHeader = screen.getByText(/Due Date/)
    fireEvent.click(dueDateHeader)
    expect(mockHandlers.onSort).toHaveBeenCalledWith("due_date")
  })

  it("displays dash for null due dates", () => {
    render(
      <AssignmentTableView assignments={mockAssignments} {...mockHandlers} />,
    )

    const cells = screen.getAllByRole("cell")
    const hasDash = cells.some((cell) => cell.textContent === "-")
    expect(hasDash).toBe(true)
  })

  it("displays student count correctly", () => {
    render(
      <AssignmentTableView assignments={mockAssignments} {...mockHandlers} />,
    )

    expect(screen.getByText("10 students")).toBeInTheDocument()
    expect(screen.getByText("5 students")).toBeInTheDocument()
  })
})
