/**
 * useAutoSave Hook Tests
 * Story 4.8: Activity Progress Persistence (Save & Resume)
 *
 * Tests auto-save hook functionality including:
 * - Auto-save at 30-second intervals
 * - Manual save trigger
 * - Cleanup on unmount
 * - Error handling
 */

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAutoSaveWithData } from "./useAutoSave"

describe("useAutoSaveWithData", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("triggers save callback every 30 seconds", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const answers = { question1: "answer1" }
    const timeSpent = 5

    renderHook(() =>
      useAutoSaveWithData(answers, timeSpent, {
        onSave,
        interval: 30000,
        enabled: true,
      }),
    )

    // Should not call immediately
    expect(onSave).not.toHaveBeenCalled()

    // Advance time by 30 seconds and run timers
    await act(async () => {
      vi.advanceTimersByTime(30000)
      await Promise.resolve() // Allow promises to resolve
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(answers, timeSpent)

    // Advance another 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30000)
      await Promise.resolve()
    })

    expect(onSave).toHaveBeenCalledTimes(2)
  })

  it("triggers manual save immediately", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const answers = { question1: "answer1" }
    const timeSpent = 5

    const { result } = renderHook(() =>
      useAutoSaveWithData(answers, timeSpent, {
        onSave,
        interval: 30000,
        enabled: true,
      }),
    )

    expect(onSave).not.toHaveBeenCalled()

    // Trigger manual save
    await act(async () => {
      await result.current.triggerManualSave()
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(answers, timeSpent)
  })

  it("cleans up interval on unmount", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const answers = { question1: "answer1" }
    const timeSpent = 5

    const { unmount } = renderHook(() =>
      useAutoSaveWithData(answers, timeSpent, {
        onSave,
        interval: 30000,
        enabled: true,
      }),
    )

    // Unmount immediately
    unmount()

    // Advance time by 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })

    // Save should not have been called
    expect(onSave).not.toHaveBeenCalled()
  })

  it("does not trigger save when disabled", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const answers = { question1: "answer1" }
    const timeSpent = 5

    renderHook(() =>
      useAutoSaveWithData(answers, timeSpent, {
        onSave,
        interval: 30000,
        enabled: false, // Disabled
      }),
    )

    // Advance time by 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })

    // Save should not have been called
    expect(onSave).not.toHaveBeenCalled()
  })

  it("handles save errors gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
    const onSave = vi.fn().mockRejectedValue(new Error("Network error"))
    const answers = { question1: "answer1" }
    const timeSpent = 5

    const { result } = renderHook(() =>
      useAutoSaveWithData(answers, timeSpent, {
        onSave,
        interval: 30000,
        enabled: true,
      }),
    )

    // Trigger manual save
    await act(async () => {
      await result.current.triggerManualSave()
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Auto-save failed:",
      expect.any(Error),
    )

    // Should not be saving anymore
    expect(result.current.isSaving).toBe(false)

    consoleErrorSpy.mockRestore()
  })

  it("updates lastSavedAt after successful save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const answers = { question1: "answer1" }
    const timeSpent = 5

    const { result } = renderHook(() =>
      useAutoSaveWithData(answers, timeSpent, {
        onSave,
        interval: 30000,
        enabled: true,
      }),
    )

    expect(result.current.lastSavedAt).toBeNull()

    // Trigger manual save
    await act(async () => {
      await result.current.triggerManualSave()
    })

    expect(result.current.lastSavedAt).toBeInstanceOf(Date)
  })

  it("sets isSaving flag during save operation", async () => {
    let resolveSave: () => void
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve
        }),
    )
    const answers = { question1: "answer1" }
    const timeSpent = 5

    const { result } = renderHook(() =>
      useAutoSaveWithData(answers, timeSpent, {
        onSave,
        interval: 30000,
        enabled: true,
      }),
    )

    expect(result.current.isSaving).toBe(false)

    // Trigger manual save (don't await)
    act(() => {
      result.current.triggerManualSave()
    })

    // Wait a tick for state to update
    await act(async () => {
      await Promise.resolve()
    })

    // Should be saving
    expect(result.current.isSaving).toBe(true)

    // Resolve the save
    await act(async () => {
      resolveSave!()
      await Promise.resolve()
    })

    // Should not be saving anymore
    expect(result.current.isSaving).toBe(false)
  })

  it("prevents concurrent saves", async () => {
    let resolveSave: () => void
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve
        }),
    )
    const answers = { question1: "answer1" }
    const timeSpent = 5

    const { result } = renderHook(() =>
      useAutoSaveWithData(answers, timeSpent, {
        onSave,
        interval: 30000,
        enabled: true,
      }),
    )

    // Trigger first save
    act(() => {
      result.current.triggerManualSave()
    })

    // Wait for state update
    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.isSaving).toBe(true)

    // Trigger second save while first is in progress
    await act(async () => {
      await result.current.triggerManualSave()
    })

    // Should only have called onSave once
    expect(onSave).toHaveBeenCalledTimes(1)

    // Resolve the save
    await act(async () => {
      resolveSave!()
      await Promise.resolve()
    })
  })

  it("uses updated answers and timeSpent on each save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    let answers: Record<string, string> = { question1: "answer1" }
    let timeSpent = 5

    const { result, rerender } = renderHook(
      ({ answers, timeSpent }) =>
        useAutoSaveWithData(answers, timeSpent, {
          onSave,
          interval: 30000,
          enabled: true,
        }),
      {
        initialProps: { answers, timeSpent },
      },
    )

    // First save
    await act(async () => {
      await result.current.triggerManualSave()
    })

    expect(onSave).toHaveBeenCalledWith({ question1: "answer1" }, 5)

    // Update props
    answers = { question1: "answer1", question2: "answer2" }
    timeSpent = 10
    rerender({ answers, timeSpent })

    // Second save with updated values
    await act(async () => {
      await result.current.triggerManualSave()
    })

    expect(onSave).toHaveBeenCalledWith(
      { question1: "answer1", question2: "answer2" },
      10,
    )
  })

  it("uses custom interval when provided", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const answers = { question1: "answer1" }
    const timeSpent = 5

    renderHook(() =>
      useAutoSaveWithData(answers, timeSpent, {
        onSave,
        interval: 10000, // 10 seconds instead of 30
        enabled: true,
      }),
    )

    // Should not call after 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(onSave).not.toHaveBeenCalled()

    // Should call after 10 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
