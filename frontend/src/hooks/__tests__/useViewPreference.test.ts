import { act, renderHook } from "@testing-library/react"
import { useViewPreference } from "../useViewPreference"

describe("useViewPreference", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it("returns default value when no stored preference exists", () => {
    const { result } = renderHook(() =>
      useViewPreference("test-section", "grid"),
    )
    expect(result.current[0]).toBe("grid")
  })

  it("returns stored preference when it exists", () => {
    localStorage.setItem("viewMode_test-section", "table")
    const { result } = renderHook(() =>
      useViewPreference("test-section", "grid"),
    )
    expect(result.current[0]).toBe("table")
  })

  it("saves preference to localStorage when changed", () => {
    const { result } = renderHook(() =>
      useViewPreference("test-section", "grid"),
    )

    act(() => {
      result.current[1]("table")
    })

    expect(localStorage.getItem("viewMode_test-section")).toBe("table")
    expect(result.current[0]).toBe("table")
  })

  it("persists across re-renders", () => {
    const { result, rerender } = renderHook(() =>
      useViewPreference("test-section", "grid"),
    )

    act(() => {
      result.current[1]("table")
    })

    rerender()

    expect(result.current[0]).toBe("table")
  })

  it("uses different keys for different sections", () => {
    const { result: result1 } = renderHook(() =>
      useViewPreference("section-1", "grid"),
    )
    const { result: result2 } = renderHook(() =>
      useViewPreference("section-2", "grid"),
    )

    act(() => {
      result1.current[1]("table")
    })

    expect(result1.current[0]).toBe("table")
    expect(result2.current[0]).toBe("grid")
  })

  it("uses grid as default when no defaultValue provided", () => {
    const { result } = renderHook(() => useViewPreference("test-section"))
    expect(result.current[0]).toBe("grid")
  })

  it("uses table as default when explicitly set", () => {
    const { result } = renderHook(() =>
      useViewPreference("test-section", "table"),
    )
    expect(result.current[0]).toBe("table")
  })
})
