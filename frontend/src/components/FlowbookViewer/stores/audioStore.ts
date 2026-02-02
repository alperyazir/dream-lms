import { create } from "zustand"

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

interface FlowbookAudioState {
  currentSrc: string | null
  isPlaying: boolean
  volume: number
  playbackRate: number
  isMuted: boolean

  play: (src: string) => void
  pause: () => void
  stop: () => void
  toggle: () => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  toggleMute: () => void
  reset: () => void
}

const initialState = {
  currentSrc: null,
  isPlaying: false,
  volume: 1,
  playbackRate: 1,
  isMuted: false,
}

export const useFlowbookAudioStore = create<FlowbookAudioState>((set, get) => ({
  ...initialState,

  play: (src) => set({ currentSrc: src, isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  stop: () => set({ currentSrc: null, isPlaying: false }),

  toggle: () => {
    const { isPlaying } = get()
    set({ isPlaying: !isPlaying })
  },

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  setPlaybackRate: (playbackRate) => {
    const validRate = PLAYBACK_SPEEDS.includes(playbackRate)
      ? playbackRate
      : PLAYBACK_SPEEDS.reduce((prev, curr) =>
          Math.abs(curr - playbackRate) < Math.abs(prev - playbackRate)
            ? curr
            : prev,
        )
    set({ playbackRate: validRate })
  },

  toggleMute: () => {
    const { isMuted } = get()
    set({ isMuted: !isMuted })
  },

  reset: () => set(initialState),
}))

export { PLAYBACK_SPEEDS }
