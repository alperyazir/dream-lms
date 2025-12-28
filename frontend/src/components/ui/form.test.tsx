import { render, screen } from "@testing-library/react"
import { useForm, FormProvider } from "react-hook-form"
import { describe, expect, it } from "vitest"
import { FormField, FormItem, FormLabel } from "./form"

// Test wrapper that provides required React Hook Form context
function TestWrapper({ children }: { children: React.ReactNode }) {
  const form = useForm({
    defaultValues: { testField: "" },
  })

  return (
    <FormProvider {...form}>
      <FormField
        control={form.control}
        name="testField"
        render={() => <FormItem>{children}</FormItem>}
      />
    </FormProvider>
  )
}

describe("FormLabel", () => {
  it("renders asterisk when required={true}", () => {
    render(
      <TestWrapper>
        <FormLabel required>Email Address</FormLabel>
      </TestWrapper>
    )

    expect(screen.getByText("Email Address")).toBeInTheDocument()
    expect(screen.getByText("*")).toBeInTheDocument()
  })

  it("does not render asterisk when required={false}", () => {
    render(
      <TestWrapper>
        <FormLabel required={false}>Email Address</FormLabel>
      </TestWrapper>
    )

    expect(screen.getByText("Email Address")).toBeInTheDocument()
    expect(screen.queryByText("*")).not.toBeInTheDocument()
  })

  it("does not render asterisk when required is undefined", () => {
    render(
      <TestWrapper>
        <FormLabel>Email Address</FormLabel>
      </TestWrapper>
    )

    expect(screen.getByText("Email Address")).toBeInTheDocument()
    expect(screen.queryByText("*")).not.toBeInTheDocument()
  })

  it("asterisk has correct styling classes", () => {
    render(
      <TestWrapper>
        <FormLabel required>Email Address</FormLabel>
      </TestWrapper>
    )

    const asterisk = screen.getByText("*")
    expect(asterisk).toHaveClass("text-destructive")
    expect(asterisk).toHaveClass("ml-1")
  })

  it("asterisk has aria-hidden attribute for accessibility", () => {
    render(
      <TestWrapper>
        <FormLabel required>Email Address</FormLabel>
      </TestWrapper>
    )

    const asterisk = screen.getByText("*")
    expect(asterisk).toHaveAttribute("aria-hidden", "true")
  })

  it("renders children correctly", () => {
    render(
      <TestWrapper>
        <FormLabel required>
          <span data-testid="custom-child">Custom Label</span>
        </FormLabel>
      </TestWrapper>
    )

    expect(screen.getByTestId("custom-child")).toBeInTheDocument()
    expect(screen.getByText("Custom Label")).toBeInTheDocument()
    expect(screen.getByText("*")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    render(
      <TestWrapper>
        <FormLabel className="custom-class">Email Address</FormLabel>
      </TestWrapper>
    )

    const label = screen.getByText("Email Address").closest("label")
    expect(label).toHaveClass("custom-class")
  })
})
