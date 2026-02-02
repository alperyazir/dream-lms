import { Canvas, PencilBrush } from "fabric"
import { useCallback, useEffect, useRef } from "react"
import { useAnnotationStore, useFlowbookBookStore } from "../stores"

interface AnnotationCanvasProps {
  pageIndex: number
  width: number
  height: number
  isInteractive: boolean
}

export function AnnotationCanvas({
  pageIndex,
  width,
  height,
  isInteractive,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitializedRef = useRef(false)

  const { currentPageIndex } = useFlowbookBookStore()

  const {
    getPageAnnotations,
    setCanvas,
    registerPageCanvas,
    unregisterPageCanvas,
    activeTool,
    penColor,
    penWidth,
    highlightColor,
    highlightOpacity,
    savePageAnnotations,
    pushToHistory,
    showAnnotations,
  } = useAnnotationStore()

  // Check if this is the active page (for multi-page views)
  const isActivePage = pageIndex === currentPageIndex

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return

    // Track if component is still mounted
    let isMounted = true

    // Create Fabric canvas
    const canvas = new Canvas(canvasRef.current, {
      selection: false,
      renderOnAddRemove: true,
      preserveObjectStacking: true,
      width,
      height,
    })

    fabricRef.current = canvas

    // Register this canvas with the store for clearing in double mode
    registerPageCanvas(pageIndex, canvas)

    // Only set as the active canvas if this is the current page
    if (isActivePage) {
      setCanvas(canvas)
    }

    // Load existing annotations for this page
    const annotations = getPageAnnotations(pageIndex)

    const initializeHistory = () => {
      if (!isMounted || !fabricRef.current) return
      // Push initial state to history AFTER annotations are loaded
      pushToHistory(pageIndex)
      isInitializedRef.current = true
    }

    // Wait for canvas to be fully ready before loading annotations
    requestAnimationFrame(() => {
      if (!isMounted || !fabricRef.current) return

      if (annotations) {
        try {
          const parsed =
            typeof annotations === "string" ? JSON.parse(annotations) : annotations
          canvas
            .loadFromJSON(parsed)
            .then(() => {
              if (isMounted && fabricRef.current) {
                canvas.renderAll()
                initializeHistory()
              }
            })
            .catch((e) => {
              console.error("Failed to load annotations:", e)
              initializeHistory()
            })
        } catch (e) {
          console.error("Failed to parse annotations:", e)
          initializeHistory()
        }
      } else {
        initializeHistory()
      }
    })

    return () => {
      isMounted = false
      isInitializedRef.current = false
      // Save before disposing
      if (fabricRef.current) {
        savePageAnnotations(pageIndex)
      }
      // Unregister this canvas from the store
      unregisterPageCanvas(pageIndex)
      canvas.dispose()
      fabricRef.current = null
      // Only clear the canvas reference if this was the active canvas
      if (isActivePage) {
        setCanvas(null)
      }
    }
  }, [pageIndex, isActivePage])

  // Update canvas reference when this becomes the active page
  useEffect(() => {
    if (isActivePage && fabricRef.current) {
      setCanvas(fabricRef.current)
    }
  }, [isActivePage, setCanvas])

  // Handle dimension changes
  useEffect(() => {
    if (!fabricRef.current) return

    fabricRef.current.setDimensions({ width, height })
    fabricRef.current.renderAll()
  }, [width, height])

  // Handle interaction mode changes
  useEffect(() => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current

    if (isInteractive) {
      canvas.selection = activeTool === "select"
      canvas.defaultCursor =
        activeTool === "pen" || activeTool === "highlight"
          ? "crosshair"
          : "default"
      canvas.hoverCursor =
        activeTool === "pen" || activeTool === "highlight" ? "crosshair" : "move"
    } else {
      canvas.selection = false
      canvas.defaultCursor = "default"
      canvas.isDrawingMode = false
    }
  }, [isInteractive, activeTool])

  // Configure drawing tool based on active tool
  useEffect(() => {
    if (!fabricRef.current || !isInteractive) return
    const canvas = fabricRef.current

    if (activeTool === "pen") {
      canvas.isDrawingMode = true
      const brush = new PencilBrush(canvas)
      brush.color = penColor
      brush.width = penWidth
      canvas.freeDrawingBrush = brush
    } else if (activeTool === "highlight") {
      canvas.isDrawingMode = true
      const brush = new PencilBrush(canvas)
      // Convert hex to rgba for highlight with opacity
      const r = parseInt(highlightColor.slice(1, 3), 16)
      const g = parseInt(highlightColor.slice(3, 5), 16)
      const b = parseInt(highlightColor.slice(5, 7), 16)
      brush.color = `rgba(${r}, ${g}, ${b}, ${highlightOpacity})`
      brush.width = 20 // Wider for highlighting
      canvas.freeDrawingBrush = brush
    } else {
      canvas.isDrawingMode = false
    }
  }, [activeTool, penColor, penWidth, highlightColor, highlightOpacity, isInteractive])

  // Handle path creation for saving
  const handlePathCreated = useCallback(() => {
    if (!isInitializedRef.current) return
    savePageAnnotations(pageIndex)
    pushToHistory(pageIndex)
  }, [pageIndex, savePageAnnotations, pushToHistory])

  useEffect(() => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current

    canvas.on("path:created", handlePathCreated)

    return () => {
      canvas.off("path:created", handlePathCreated)
    }
  }, [handlePathCreated])

  // Handle visibility
  useEffect(() => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current

    canvas.getObjects().forEach((obj) => {
      obj.visible = showAnnotations
    })
    canvas.renderAll()
  }, [showAnnotations])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        pointerEvents: isInteractive ? "auto" : "none",
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
