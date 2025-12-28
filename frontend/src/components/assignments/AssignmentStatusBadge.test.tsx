import { render, screen } from "@testing-library/react"
import { AssignmentStatusBadge } from "./AssignmentStatusBadge"

describe("AssignmentStatusBadge", () => {
  it("renders Draft status", () => {
    render(<AssignmentStatusBadge status="draft" />)
    expect(screen.getByText("Draft")).toBeInTheDocument()
  })

  it("renders Scheduled status", () => {
    render(<AssignmentStatusBadge status="scheduled" />)
    expect(screen.getByText("Scheduled")).toBeInTheDocument()
  })

  it("renders Active status for published", () => {
    render(<AssignmentStatusBadge status="published" />)
    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("renders Archived status", () => {
    render(<AssignmentStatusBadge status="archived" />)
    expect(screen.getByText("Archived")).toBeInTheDocument()
  })

  it("renders Past Due for published assignment with past due date", () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)

    render(
      <AssignmentStatusBadge
        status="published"
        dueDate={pastDate.toISOString()}
      />,
    )
    expect(screen.getByText("Past Due")).toBeInTheDocument()
  })

  it("renders Active for published assignment with future due date", () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)

    render(
      <AssignmentStatusBadge
        status="published"
        dueDate={futureDate.toISOString()}
      />,
    )
    expect(screen.getByText("Active")).toBeInTheDocument()
  })
})
