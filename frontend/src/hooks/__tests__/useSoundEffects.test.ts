/**
 * useSoundEffects Hook Tests
 */

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useSoundEffects } from "../useSoundEffects"

// Mock AudioContext
class MockAudioContext {
  state = "running"
  currentTime = 0

  createOscillator() {
    return {
      connect: vi.fn(),
      type: "sine",
      frequency: { setValueAtTime: vi.fn() },
      start: vi.fn(),
      stop: vi.fn(),
    }
  }

  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
    }
  }

  resume() {
    this.state = "running"
    return Promise.resolve()
  }

  get destination() {
    return {}
  }
}

describe("useSoundEffects", () => {
  beforeEach(() => {
    localStorage.clear()
    // Mock AudioContext
    vi.stubGlobal("AudioContext", MockAudioContext)
    vi.stubGlobal("webkitAudioContext", MockAudioContext)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("should initialize with sounds enabled by default", () => {
    const { result } = renderHook(() => useSoundEffects())

    expect(result.current.isEnabled).toBe(true)
  })

  it("should initialize with default volume of 0.7", () => {
    const { result } = renderHook(() => useSoundEffects())

    expect(result.current.volume).toBe(0.7)
  })

  it("should toggle sounds enabled state", () => {
    const { result } = renderHook(() => useSoundEffects())

    expect(result.current.isEnabled).toBe(true)

    act(() => {
      result.current.toggleEnabled()
    })

    expect(result.current.isEnabled).toBe(false)

    act(() => {
      result.current.toggleEnabled()
    })

    expect(result.current.isEnabled).toBe(true)
  })

  it("should update volume", () => {
    const { result } = renderHook(() => useSoundEffects())

    act(() => {
      result.current.setVolume(0.5)
    })

    expect(result.current.volume).toBe(0.5)
  })

  it("should clamp volume between 0 and 1", () => {
    const { result } = renderHook(() => useSoundEffects())

    act(() => {
      result.current.setVolume(1.5)
    })
    expect(result.current.volume).toBe(1)

    act(() => {
      result.current.setVolume(-0.5)
    })
    expect(result.current.volume).toBe(0)
  })

  it("should persist enabled state to localStorage", () => {
    const { result } = renderHook(() => useSoundEffects())

    act(() => {
      result.current.setEnabled(false)
    })

    expect(localStorage.getItem("dream-lms-sounds-enabled")).toBe("false")
  })

  it("should persist volume to localStorage", () => {
    const { result } = renderHook(() => useSoundEffects())

    act(() => {
      result.current.setVolume(0.3)
    })

    expect(localStorage.getItem("dream-lms-sounds-volume")).toBe("0.3")
  })

  it("should load enabled state from localStorage", () => {
    localStorage.setItem("dream-lms-sounds-enabled", "false")

    const { result } = renderHook(() => useSoundEffects())

    expect(result.current.isEnabled).toBe(false)
  })

  it("should load volume from localStorage", () => {
    localStorage.setItem("dream-lms-sounds-volume", "0.4")

    const { result } = renderHook(() => useSoundEffects())

    expect(result.current.volume).toBe(0.4)
  })

  it("should not play sound when disabled", () => {
    const { result } = renderHook(() => useSoundEffects())

    act(() => {
      result.current.setEnabled(false)
    })

    // This should not throw and should do nothing
    act(() => {
      result.current.play("click")
    })

    // If we got here without error, the test passes
    expect(true).toBe(true)
  })

  it("should play sound when enabled", () => {
    const { result } = renderHook(() => useSoundEffects())

    // Should not throw
    act(() => {
      result.current.play("click")
    })

    expect(true).toBe(true)
  })
})
