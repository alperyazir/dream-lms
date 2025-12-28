import { render, screen, fireEvent } from "@testing-library/react"
import { ViewModeToggle } from "../view-mode-toggle"

describe("ViewModeToggle", () => {
  it("renders grid and table buttons", () => {
    render(<ViewModeToggle value="grid" onChange={() => {}} />)
    expect(screen.getByLabelText("Grid view")).toBeInTheDocument()
    expect(screen.getByLabelText("Table view")).toBeInTheDocument()
  })

  it("calls onChange when toggled to table", () => {
    const onChange = jest.fn()
    render(<ViewModeToggle value="grid" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText("Table view"))
    expect(onChange).toHaveBeenCalledWith("table")
  })

  it("calls onChange when toggled to grid", () => {
    const onChange = jest.fn()
    render(<ViewModeToggle value="table" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText("Grid view"))
    expect(onChange).toHaveBeenCalledWith("grid")
  })

  it("shows correct active state for grid", () => {
    render(<ViewModeToggle value="grid" onChange={() => {}} />)
    expect(screen.getByLabelText("Grid view")).toHaveAttribute("data-state", "on")
    expect(screen.getByLabelText("Table view")).toHaveAttribute("data-state", "off")
  })

  it("shows correct active state for table", () => {
    render(<ViewModeToggle value="table" onChange={() => {}} />)
    expect(screen.getByLabelText("Grid view")).toHaveAttribute("data-state", "off")
    expect(screen.getByLabelText("Table view")).toHaveAttribute("data-state", "on")
  })

  it("applies custom className", () => {
    const { container } = render(
      <ViewModeToggle value="grid" onChange={() => {}} className="custom-class" />
    )
    const toggleGroup = container.querySelector('[role="group"]')
    expect(toggleGroup).toHaveClass("custom-class")
  })
})
