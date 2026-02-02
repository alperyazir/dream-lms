import { create } from "zustand"
import type { SidebarPanel, ViewMode } from "@/types/flowbook"

const ZOOM_LEVELS = [1, 1.25, 1.5, 2, 2.5, 3]
const MIN_ZOOM = 1
const MAX_ZOOM = ZOOM_LEVELS[ZOOM_LEVELS.length - 1]

interface FlowbookUIState {
  viewMode: ViewMode
  zoomLevel: number
  panX: number
  panY: number
  isPanning: boolean
  activeActivityId: string | null
  isThumbnailStripOpen: boolean
  sidebarPanel: SidebarPanel

  setViewMode: (mode: ViewMode) => void
  setZoomLevel: (level: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setPan: (x: number, y: number) => void
  resetPan: () => void
  setIsPanning: (isPanning: boolean) => void
  resetView: () => void
  setActiveActivityId: (id: string | null) => void
  openActivity: (id: string) => void
  closeActivity: () => void
  toggleThumbnailStrip: () => void
  setThumbnailStripOpen: (open: boolean) => void
  setSidebarPanel: (panel: SidebarPanel) => void
  reset: () => void
}

const initialState = {
  viewMode: "double" as ViewMode,
  zoomLevel: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  activeActivityId: null,
  isThumbnailStripOpen: false,
  sidebarPanel: "none" as SidebarPanel,
}

export const useFlowbookUIStore = create<FlowbookUIState>()((set, get) => ({
  ...initialState,

  setViewMode: (viewMode) => set({ viewMode }),

  setZoomLevel: (zoomLevel) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel))
    if (clampedZoom <= 1) {
      set({ zoomLevel: clampedZoom, panX: 0, panY: 0 })
    } else {
      set({ zoomLevel: clampedZoom })
    }
  },

  zoomIn: () => {
    const { zoomLevel } = get()
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoomLevel)
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      set({ zoomLevel: ZOOM_LEVELS[currentIndex + 1] })
    } else if (currentIndex === -1) {
      set({ zoomLevel: ZOOM_LEVELS[ZOOM_LEVELS.length - 1] })
    }
  },

  zoomOut: () => {
    const { zoomLevel } = get()
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoomLevel)
    if (currentIndex > 0) {
      const newZoom = ZOOM_LEVELS[currentIndex - 1]
      if (newZoom <= 1) {
        set({ zoomLevel: newZoom, panX: 0, panY: 0 })
      } else {
        set({ zoomLevel: newZoom })
      }
    } else if (currentIndex === 0) {
      set({ zoomLevel: ZOOM_LEVELS[0], panX: 0, panY: 0 })
    }
  },

  resetZoom: () => set({ zoomLevel: 1, panX: 0, panY: 0 }),

  setPan: (panX, panY) => set({ panX, panY }),

  resetPan: () => set({ panX: 0, panY: 0 }),

  setIsPanning: (isPanning) => set({ isPanning }),

  resetView: () => set({ zoomLevel: 1, panX: 0, panY: 0 }),

  setActiveActivityId: (activeActivityId) => set({ activeActivityId }),

  openActivity: (id) => set({ activeActivityId: id }),

  closeActivity: () => set({ activeActivityId: null }),

  toggleThumbnailStrip: () =>
    set((state) => ({ isThumbnailStripOpen: !state.isThumbnailStripOpen })),

  setThumbnailStripOpen: (isThumbnailStripOpen) =>
    set({ isThumbnailStripOpen }),

  setSidebarPanel: (sidebarPanel) => set({ sidebarPanel }),

  reset: () => set(initialState),
}))

export { ZOOM_LEVELS, MIN_ZOOM, MAX_ZOOM }
