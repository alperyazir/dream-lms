import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TeacherCard } from "../TeacherCard"

describe("TeacherCard", () => {
  const mockTeacher = {
    id: "teacher-1",
    user_full_name: "John Doe",
    user_email: "john@example.com",
    school_name: "Central High School",
    books_assigned: 5,
    classroom_count: 3,
  }

  it("renders teacher name and email", () => {
    render(<TeacherCard teacher={mockTeacher} />)

    expect(screen.getByText("John Doe")).toBeInTheDocument()
    expect(screen.getByText("john@example.com")).toBeInTheDocument()
  })

  it("renders school name", () => {
    render(<TeacherCard teacher={mockTeacher} />)

    expect(screen.getByText("Central High School")).toBeInTheDocument()
  })

  it("renders book and classroom counts", () => {
    render(<TeacherCard teacher={mockTeacher} />)

    expect(screen.getByText("5 books")).toBeInTheDocument()
    expect(screen.getByText("3 classes")).toBeInTheDocument()
  })

  it("renders with default counts when not provided", () => {
    const teacherWithoutCounts = {
      id: "teacher-2",
      user_full_name: "Jane Smith",
      user_email: "jane@example.com",
    }

    render(<TeacherCard teacher={teacherWithoutCounts} />)

    expect(screen.getByText("0 books")).toBeInTheDocument()
    expect(screen.getByText("0 classes")).toBeInTheDocument()
  })

  it("generates correct initials", () => {
    render(<TeacherCard teacher={mockTeacher} />)

    expect(screen.getByText("JD")).toBeInTheDocument()
  })

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn()
    render(<TeacherCard teacher={mockTeacher} onEdit={onEdit} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    editButton.click()

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("calls onViewDetails when view details button is clicked", () => {
    const onViewDetails = vi.fn()
    render(<TeacherCard teacher={mockTeacher} onViewDetails={onViewDetails} />)

    const viewButton = screen.getByRole("button", { name: /view details/i })
    viewButton.click()

    expect(onViewDetails).toHaveBeenCalledTimes(1)
  })
})
