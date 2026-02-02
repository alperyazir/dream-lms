import { create } from "zustand"
import type { BookConfig } from "@/types/flowbook"

interface FlowbookBookState {
  config: BookConfig | null
  isLoading: boolean
  error: string | null
  currentPageIndex: number
  currentModuleIndex: number

  setConfig: (config: BookConfig) => void
  clearConfig: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  goToPage: (pageIndex: number) => void
  goToModule: (moduleIndex: number) => void
  nextPage: () => void
  prevPage: () => void
  totalPages: () => number
  getModuleForPage: (pageIndex: number) => number
}

export const useFlowbookBookStore = create<FlowbookBookState>((set, get) => ({
  config: null,
  isLoading: false,
  error: null,
  currentPageIndex: 0,
  currentModuleIndex: 0,

  setConfig: (config) =>
    set({
      config,
      isLoading: false,
      error: null,
      currentPageIndex: 0,
      currentModuleIndex: 0,
    }),

  clearConfig: () =>
    set({
      config: null,
      isLoading: false,
      error: null,
      currentPageIndex: 0,
      currentModuleIndex: 0,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  goToPage: (pageIndex) => {
    const { config, getModuleForPage } = get()
    if (!config) return
    const clampedIndex = Math.max(
      0,
      Math.min(pageIndex, config.pages.length - 1),
    )
    const moduleIndex = getModuleForPage(clampedIndex)
    set({ currentPageIndex: clampedIndex, currentModuleIndex: moduleIndex })
  },

  goToModule: (moduleIndex) => {
    const { config } = get()
    if (!config) return
    const module = config.modules[moduleIndex]
    if (module) {
      set({
        currentModuleIndex: moduleIndex,
        currentPageIndex: module.startPage,
      })
    }
  },

  nextPage: () => {
    const { currentPageIndex, config, getModuleForPage } = get()
    if (!config) return
    if (currentPageIndex < config.pages.length - 1) {
      const newPageIndex = currentPageIndex + 1
      const moduleIndex = getModuleForPage(newPageIndex)
      set({ currentPageIndex: newPageIndex, currentModuleIndex: moduleIndex })
    }
  },

  prevPage: () => {
    const { currentPageIndex, getModuleForPage } = get()
    if (currentPageIndex > 0) {
      const newPageIndex = currentPageIndex - 1
      const moduleIndex = getModuleForPage(newPageIndex)
      set({ currentPageIndex: newPageIndex, currentModuleIndex: moduleIndex })
    }
  },

  totalPages: () => {
    const { config } = get()
    return config?.pages.length ?? 0
  },

  getModuleForPage: (pageIndex) => {
    const { config } = get()
    if (!config) return 0
    const moduleIdx = config.modules.findIndex(
      (m) =>
        pageIndex >= m.startPage && pageIndex <= (m.endPage ?? m.startPage),
    )
    return moduleIdx >= 0 ? moduleIdx : 0
  },
}))
