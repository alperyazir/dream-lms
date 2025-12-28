import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import type { AssignmentListItem } from "@/types/assignment"
import { TeacherAssignmentCard } from "./TeacherAssignmentCard"

const mockAssignment: AssignmentListItem = {
  id: "1",
  name: "Test Assignment",
  instructions: "Test instructions",
  due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  time_limit_minutes: 60,
  created_at: new Date().toISOString(),
  book_id: "book-1",
  book_title: "Test Book",
  activity_id: "activity-1",
  activity_title: "Test Activity",
  activity_type: "quiz",
  total_students: 10,
  not_started: 5,
  in_progress: 3,
  completed: 2,
  scheduled_publish_date: null,
  status: "published",
}

describe("TeacherAssignmentCard", () => {
  const mockHandlers = {
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders assignment information", () => {
    render(
      <TeacherAssignmentCard assignment={mockAssignment} {...mockHandlers} />,
    )

    expect(screen.getByText("Test Assignment")).toBeInTheDocument()
    expect(screen.getByText(/10 students/)).toBeInTheDocument()
    expect(screen.getByText(/2\/10/)).toBeInTheDocument()
  })

  it("calls onView when View button is clicked", () => {
    render(
      <TeacherAssignmentCard assignment={mockAssignment} {...mockHandlers} />,
    )

    fireEvent.click(screen.getByText("View"))
    expect(mockHandlers.onView).toHaveBeenCalledTimes(1)
  })

  it("calls onEdit when Edit button is clicked", () => {
    render(
      <TeacherAssignmentCard assignment={mockAssignment} {...mockHandlers} />,
    )

    fireEvent.click(screen.getByText("Edit"))
    expect(mockHandlers.onEdit).toHaveBeenCalledTimes(1)
  })

  it("calls onDelete when Delete button is clicked", () => {
    render(
      <TeacherAssignmentCard assignment={mockAssignment} {...mockHandlers} />,
    )

    const deleteButton = screen
      .getByRole("button", { name: "" })
      .parentElement?.querySelector("button:last-child")
    if (deleteButton) {
      fireEvent.click(deleteButton)
      expect(mockHandlers.onDelete).toHaveBeenCalledTimes(1)
    }
  })

  it("displays No due date when due_date is null", () => {
    const assignmentNoDue = { ...mockAssignment, due_date: null }
    render(
      <TeacherAssignmentCard assignment={assignmentNoDue} {...mockHandlers} />,
    )

    expect(screen.getByText("No due date")).toBeInTheDocument()
  })

  it("displays completion information", () => {
    render(
      <TeacherAssignmentCard assignment={mockAssignment} {...mockHandlers} />,
    )

    // 2 completed out of 10 students
    expect(screen.getByText("2/10")).toBeInTheDocument()
  })
})
