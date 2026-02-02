/**
 * Sound Effects Hook
 * Provides educational sound effects for learning interactions
 *
 * Features:
 * - Web Audio API for generating sounds
 * - Persistent preference storage (localStorage)
 * - Educational sound types: correct, incorrect, click, drag, drop, bookOpen, activityStart
 */

import { useCallback, useEffect, useRef, useState } from "react"

export type SoundType =
  | "correct"
  | "incorrect"
  | "click"
  | "drag"
  | "drop"
  | "bookOpen"
  | "activityStart"
  | "complete"

const SOUND_ENABLED_KEY = "dream-lms-sounds-enabled"
const SOUND_VOLUME_KEY = "dream-lms-sounds-volume"

/**
 * Sound configurations for each type
 * Uses Web Audio API oscillator settings
 */
const soundConfigs: Record<
  SoundType,
  { frequencies: number[]; durations: number[]; type: OscillatorType; gain: number }
> = {
  // Ascending two-tone for correct answers (cheerful)
  correct: {
    frequencies: [523.25, 659.25, 783.99], // C5, E5, G5 - major chord arpeggio
    durations: [0.1, 0.1, 0.15],
    type: "sine",
    gain: 0.3,
  },
  // Descending tone for incorrect (gentle feedback)
  incorrect: {
    frequencies: [349.23, 293.66], // F4, D4
    durations: [0.15, 0.2],
    type: "sine",
    gain: 0.25,
  },
  // Quick click sound
  click: {
    frequencies: [800],
    durations: [0.05],
    type: "sine",
    gain: 0.15,
  },
  // Pickup sound for drag
  drag: {
    frequencies: [440, 550],
    durations: [0.05, 0.05],
    type: "sine",
    gain: 0.15,
  },
  // Drop/place sound
  drop: {
    frequencies: [660, 880],
    durations: [0.05, 0.08],
    type: "sine",
    gain: 0.2,
  },
  // Book opening - whoosh effect
  bookOpen: {
    frequencies: [200, 300, 400, 500],
    durations: [0.1, 0.1, 0.1, 0.15],
    type: "sine",
    gain: 0.2,
  },
  // Activity start - attention grabber
  activityStart: {
    frequencies: [440, 554.37, 659.25], // A4, C#5, E5 - A major
    durations: [0.12, 0.12, 0.2],
    type: "sine",
    gain: 0.25,
  },
  // Completion celebration
  complete: {
    frequencies: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6
    durations: [0.1, 0.1, 0.1, 0.3],
    type: "sine",
    gain: 0.3,
  },
}

/**
 * Play a sound using Web Audio API
 */
function playSound(
  audioContext: AudioContext,
  config: (typeof soundConfigs)[SoundType],
  volume: number
) {
  let startTime = audioContext.currentTime

  config.frequencies.forEach((freq, index) => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.type = config.type
    oscillator.frequency.setValueAtTime(freq, startTime)

    const duration = config.durations[index]
    const effectiveGain = config.gain * volume

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(effectiveGain, startTime + 0.01)
    gainNode.gain.linearRampToValueAtTime(effectiveGain * 0.7, startTime + duration * 0.7)
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)

    startTime += duration * 0.8 // Slight overlap for smoother transitions
  })
}

/**
 * Custom hook for sound effects
 */
export function useSoundEffects() {
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY)
    return stored === null ? true : stored === "true"
  })

  const [volume, setVolume] = useState(() => {
    const stored = localStorage.getItem(SOUND_VOLUME_KEY)
    return stored === null ? 0.7 : parseFloat(stored)
  })

  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize AudioContext on first interaction (browser requirement)
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    // Resume if suspended (happens after tab becomes inactive)
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  // Persist settings
  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, String(isEnabled))
  }, [isEnabled])

  useEffect(() => {
    localStorage.setItem(SOUND_VOLUME_KEY, String(volume))
  }, [volume])

  // Play a sound effect
  const play = useCallback(
    (type: SoundType) => {
      if (!isEnabled) return

      try {
        const ctx = initAudioContext()
        const config = soundConfigs[type]
        if (config) {
          playSound(ctx, config, volume)
        }
      } catch (error) {
        console.warn("Failed to play sound:", error)
      }
    },
    [isEnabled, volume, initAudioContext]
  )

  // Toggle sounds on/off
  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => !prev)
  }, [])

  // Update volume (0 to 1)
  const updateVolume = useCallback((newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)))
  }, [])

  return {
    isEnabled,
    volume,
    play,
    toggleEnabled,
    setEnabled: setIsEnabled,
    setVolume: updateVolume,
  }
}

/**
 * Global sound context for sharing across components
 */
import { createContext, useContext } from "react"

interface SoundContextValue {
  isEnabled: boolean
  volume: number
  play: (type: SoundType) => void
  toggleEnabled: () => void
  setEnabled: (enabled: boolean) => void
  setVolume: (volume: number) => void
}

export const SoundContext = createContext<SoundContextValue | null>(null)

export function useSoundContext() {
  const context = useContext(SoundContext)
  if (!context) {
    // Return a no-op fallback if not wrapped in provider
    return {
      isEnabled: false,
      volume: 0.7,
      play: () => {},
      toggleEnabled: () => {},
      setEnabled: () => {},
      setVolume: () => {},
    }
  }
  return context
}
