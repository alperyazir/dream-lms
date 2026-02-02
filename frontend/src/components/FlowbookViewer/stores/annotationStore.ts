import type { Canvas } from "fabric"
import { create } from "zustand"

export type AnnotationTool = "select" | "pen" | "highlight" | null

// Persistence helper
const STORAGE_KEY_PREFIX = "flowbook_annotations_"

function loadAnnotations(bookId: string): Record<number, string> {
  try {
    const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${bookId}`)
    if (data) {
      const parsed = JSON.parse(data)
      return parsed.pages || {}
    }
  } catch (e) {
    console.error("Failed to load annotations:", e)
  }
  return {}
}

function saveAnnotations(bookId: string, pages: Record<number, string>) {
  try {
    const data = {
      version: 1,
      bookId,
      pages,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${bookId}`, JSON.stringify(data))
  } catch (e) {
    console.error("Failed to save annotations:", e)
  }
}

interface AnnotationState {
  // Canvas reference
  canvas: Canvas | null

  // Canvas references per page (for clearing in double mode)
  pageCanvases: Record<number, Canvas>

  // Book ID for persistence
  bookId: string | null

  // Tool state
  activeTool: AnnotationTool
  isDrawingMode: boolean

  // Pen settings
  penColor: string
  penWidth: number

  // Highlight settings
  highlightColor: string
  highlightOpacity: number

  // Annotations per page
  pageAnnotations: Record<number, string> // Page number -> JSON

  // Visibility
  showAnnotations: boolean

  // Undo/Redo history
  history: Record<number, string[]> // Page number -> history stack
  historyIndex: Record<number, number> // Page number -> current index

  // Pie menu state
  isPieMenuOpen: boolean
  pieMenuPosition: { x: number; y: number }

  // Actions
  setCanvas: (canvas: Canvas | null) => void
  registerPageCanvas: (page: number, canvas: Canvas) => void
  unregisterPageCanvas: (page: number) => void
  initializeBook: (bookId: string) => void
  setActiveTool: (tool: AnnotationTool) => void
  setPenColor: (color: string) => void
  setPenWidth: (width: number) => void
  setHighlightColor: (color: string) => void
  getPageAnnotations: (page: number) => string | undefined
  savePageAnnotations: (page: number) => void
  toggleAnnotations: () => void
  clearAnnotations: (page: number) => void

  // Pie menu
  openPieMenu: (position: { x: number; y: number }) => void
  closePieMenu: () => void

  // Undo/Redo
  undo: (page: number) => void
  redo: (page: number) => void
  canUndo: (page: number) => boolean
  canRedo: (page: number) => boolean
  pushToHistory: (page: number) => void

  // Reset
  reset: () => void
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  canvas: null,
  pageCanvases: {},
  bookId: null,
  activeTool: null,
  isDrawingMode: false,
  penColor: "#000000",
  penWidth: 4,
  highlightColor: "#FACC15",
  highlightOpacity: 0.4,
  pageAnnotations: {},
  showAnnotations: true, // Keep annotations visible by default
  history: {},
  historyIndex: {},
  isPieMenuOpen: false,
  pieMenuPosition: { x: 0, y: 0 },

  setCanvas: (canvas) => set({ canvas }),

  registerPageCanvas: (page, canvas) => {
    const { pageCanvases } = get()
    set({ pageCanvases: { ...pageCanvases, [page]: canvas } })
  },

  unregisterPageCanvas: (page) => {
    const { pageCanvases } = get()
    const newCanvases = { ...pageCanvases }
    delete newCanvases[page]
    set({ pageCanvases: newCanvases })
  },

  initializeBook: (bookId) => {
    const annotations = loadAnnotations(bookId)
    set({
      bookId,
      pageAnnotations: annotations,
    })
  },

  setActiveTool: (tool) => {
    const { canvas } = get()
    if (canvas) {
      canvas.isDrawingMode = tool === "pen" || tool === "highlight"
    }
    set({
      activeTool: tool,
      isDrawingMode: tool === "pen" || tool === "highlight",
    })
  },

  setPenColor: (color) => {
    const { canvas } = get()
    if (canvas?.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color
    }
    set({ penColor: color })
  },

  setPenWidth: (width) => {
    const { canvas } = get()
    if (canvas?.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = width
    }
    set({ penWidth: width })
  },

  setHighlightColor: (color) => {
    set({ highlightColor: color })
  },

  getPageAnnotations: (page) => get().pageAnnotations[page],

  savePageAnnotations: (page) => {
    const { pageCanvases, pageAnnotations, bookId } = get()

    // Use the page-specific canvas
    const pageCanvas = pageCanvases[page]
    if (!pageCanvas) return

    const json = JSON.stringify(pageCanvas.toJSON())
    const updated = { ...pageAnnotations, [page]: json }
    set({ pageAnnotations: updated })

    // Persist to localStorage only if we have a bookId
    if (bookId) {
      saveAnnotations(bookId, updated)
    }
  },

  toggleAnnotations: () =>
    set((state) => ({ showAnnotations: !state.showAnnotations })),

  clearAnnotations: (page) => {
    const { pageCanvases, pageAnnotations, history, historyIndex, bookId } = get()

    // Clear the canvas for this specific page if it exists
    const pageCanvas = pageCanvases[page]
    if (pageCanvas) {
      try {
        // Get all objects and remove them one by one
        const objects = [...pageCanvas.getObjects()]
        for (const obj of objects) {
          pageCanvas.remove(obj)
        }
        pageCanvas.requestRenderAll()
      } catch (e) {
        console.error("Error clearing canvas for page", page, e)
      }
    }

    const newAnnotations = { ...pageAnnotations }
    delete newAnnotations[page]
    set({
      pageAnnotations: newAnnotations,
      history: { ...history, [page]: [] },
      historyIndex: { ...historyIndex, [page]: -1 },
    })

    // Persist to storage
    if (bookId) {
      saveAnnotations(bookId, newAnnotations)
    }
  },

  // Pie menu
  openPieMenu: (position) =>
    set({ isPieMenuOpen: true, pieMenuPosition: position }),
  closePieMenu: () => set({ isPieMenuOpen: false }),

  // Undo/Redo implementation
  pushToHistory: (page) => {
    const { pageCanvases, history, historyIndex } = get()
    const pageCanvas = pageCanvases[page]
    if (!pageCanvas) return

    const currentIndex = historyIndex[page] ?? -1
    const pageHistory = history[page] ?? []

    // Truncate any redo states
    const newHistory = pageHistory.slice(0, currentIndex + 1)
    const json = JSON.stringify(pageCanvas.toJSON())
    newHistory.push(json)

    // Limit history size
    const maxHistory = 50
    if (newHistory.length > maxHistory) {
      newHistory.shift()
    }

    set({
      history: { ...history, [page]: newHistory },
      historyIndex: { ...historyIndex, [page]: newHistory.length - 1 },
    })
  },

  undo: (page) => {
    const { pageCanvases, history, historyIndex, pageAnnotations } = get()
    const pageCanvas = pageCanvases[page]
    if (!pageCanvas) {
      console.warn("Undo: No canvas available for page", page)
      return
    }

    const currentIndex = historyIndex[page] ?? -1
    const pageHistory = history[page] ?? []

    if (currentIndex <= 0) {
      return
    }

    const newIndex = currentIndex - 1
    const json = pageHistory[newIndex]

    if (json) {
      const parsed = typeof json === "string" ? JSON.parse(json) : json
      pageCanvas
        .loadFromJSON(parsed)
        .then(() => {
          pageCanvas.renderAll()
          set({
            historyIndex: { ...historyIndex, [page]: newIndex },
            pageAnnotations: { ...pageAnnotations, [page]: json },
          })
        })
        .catch((err) => {
          console.error("Undo: Failed to load from JSON", err)
        })
    }
  },

  redo: (page) => {
    const { pageCanvases, history, historyIndex, pageAnnotations } = get()
    const pageCanvas = pageCanvases[page]
    if (!pageCanvas) {
      console.warn("Redo: No canvas available for page", page)
      return
    }

    const currentIndex = historyIndex[page] ?? -1
    const pageHistory = history[page] ?? []

    if (currentIndex >= pageHistory.length - 1) {
      return
    }

    const newIndex = currentIndex + 1
    const json = pageHistory[newIndex]

    if (json) {
      const parsed = typeof json === "string" ? JSON.parse(json) : json
      pageCanvas
        .loadFromJSON(parsed)
        .then(() => {
          pageCanvas.renderAll()
          set({
            historyIndex: { ...historyIndex, [page]: newIndex },
            pageAnnotations: { ...pageAnnotations, [page]: json },
          })
        })
        .catch((err) => {
          console.error("Redo: Failed to load from JSON", err)
        })
    }
  },

  canUndo: (page) => {
    const { historyIndex } = get()
    const currentIndex = historyIndex[page] ?? -1
    return currentIndex > 0
  },

  canRedo: (page) => {
    const { history, historyIndex } = get()
    const currentIndex = historyIndex[page] ?? -1
    const pageHistory = history[page] ?? []
    return currentIndex < pageHistory.length - 1
  },

  reset: () =>
    set({
      canvas: null,
      pageCanvases: {},
      bookId: null,
      activeTool: null,
      isDrawingMode: false,
      pageAnnotations: {},
      showAnnotations: true, // Keep annotations visible by default
      history: {},
      historyIndex: {},
      isPieMenuOpen: false,
    }),
}))
