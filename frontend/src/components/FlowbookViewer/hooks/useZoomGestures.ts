import { useCallback, useEffect, useRef, useState } from "react"
import { MAX_ZOOM, MIN_ZOOM, useFlowbookUIStore, useAnnotationStore } from "../stores"

const ZOOM_SENSITIVITY = 0.002
const PAN_SENSITIVITY = 1
const PAN_MARGIN = 100 // Minimum pixels of page that must remain visible

export function useZoomGestures(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  // Track when the container element becomes available
  const [containerReady, setContainerReady] = useState(false)

  // Check periodically if container ref is attached
  useEffect(() => {
    if (containerRef.current) {
      setContainerReady(true)
      return
    }

    // Poll for container availability (handles async loading)
    const checkInterval = setInterval(() => {
      if (containerRef.current) {
        setContainerReady(true)
        clearInterval(checkInterval)
      }
    }, 100)

    return () => clearInterval(checkInterval)
  }, [containerRef])

  const { setZoomLevel, setPan, resetZoom, setIsPanning } =
    useFlowbookUIStore()

  const lastTouchDistance = useRef<number | null>(null)
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)
  const lastMousePos = useRef<{ x: number; y: number } | null>(null)

  // Clamp pan values to keep page visible
  const clampPan = useCallback(
    (
      panX: number,
      panY: number,
      zoomLevel: number,
      containerRect: DOMRect,
    ): { x: number; y: number } => {
      // Calculate how much the content extends beyond the container when zoomed
      const scaledWidth = containerRect.width * zoomLevel
      const scaledHeight = containerRect.height * zoomLevel

      // Calculate max pan (content can move until only PAN_MARGIN remains visible)
      const maxPanX = (scaledWidth - containerRect.width) / 2 + PAN_MARGIN
      const maxPanY = (scaledHeight - containerRect.height) / 2 + PAN_MARGIN

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, panX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, panY)),
      }
    },
    [],
  )

  // Calculate zoom with point preservation
  const zoomAtPoint = useCallback(
    (
      delta: number,
      pointX: number,
      pointY: number,
      containerRect: DOMRect,
    ) => {
      const currentZoom = useFlowbookUIStore.getState().zoomLevel
      const currentPanX = useFlowbookUIStore.getState().panX
      const currentPanY = useFlowbookUIStore.getState().panY

      // Calculate new zoom level (MIN_ZOOM is 1, so can't zoom out below original)
      const zoomDelta = delta * ZOOM_SENSITIVITY
      const newZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, currentZoom * (1 - zoomDelta)),
      )

      // If at minimum zoom (1), reset pan and don't allow further zoom out
      if (newZoom <= MIN_ZOOM) {
        setZoomLevel(MIN_ZOOM)
        setPan(0, 0)
        return
      }

      // Calculate point relative to container center
      const containerCenterX = containerRect.width / 2
      const containerCenterY = containerRect.height / 2
      const pointRelX = pointX - containerRect.left - containerCenterX
      const pointRelY = pointY - containerRect.top - containerCenterY

      // Adjust pan to zoom towards the point
      const zoomRatio = newZoom / currentZoom
      const newPanX = pointRelX - (pointRelX - currentPanX) * zoomRatio
      const newPanY = pointRelY - (pointRelY - currentPanY) * zoomRatio

      // Clamp pan to keep page visible
      const clamped = clampPan(newPanX, newPanY, newZoom, containerRect)

      setZoomLevel(newZoom)
      setPan(clamped.x, clamped.y)
    },
    [setZoomLevel, setPan, clampPan],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Mouse wheel zoom (directly on scroll, no modifier key needed)
    const handleWheel = (e: WheelEvent) => {
      // Prevent default browser zoom
      e.preventDefault()

      const rect = container.getBoundingClientRect()
      zoomAtPoint(e.deltaY, e.clientX, e.clientY, rect)
    }

    // Mouse drag for panning (when zoomed in and not in annotation mode)
    const handleMouseDown = (e: MouseEvent) => {
      // Only pan with left click when zoomed in
      if (e.button !== 0) return

      const currentZoom = useFlowbookUIStore.getState().zoomLevel
      if (currentZoom <= 1) return

      // Don't pan if annotation tool is active (drawing/highlighting mode)
      const activeTool = useAnnotationStore.getState().activeTool
      if (activeTool !== null) return

      // Don't pan if clicking on interactive elements
      if (
        e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLInputElement ||
        (e.target as HTMLElement).closest("button, a, input")
      ) {
        return
      }

      // Prevent default to stop image drag and text selection
      e.preventDefault()

      isDragging.current = true
      lastMousePos.current = { x: e.clientX, y: e.clientY }
      setIsPanning(true)
      container.style.cursor = "grabbing"
      container.style.userSelect = "none"
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !lastMousePos.current) return

      const currentZoom = useFlowbookUIStore.getState().zoomLevel
      const currentPanX = useFlowbookUIStore.getState().panX
      const currentPanY = useFlowbookUIStore.getState().panY

      const deltaX = (e.clientX - lastMousePos.current.x) * PAN_SENSITIVITY
      const deltaY = (e.clientY - lastMousePos.current.y) * PAN_SENSITIVITY

      const newPanX = currentPanX + deltaX
      const newPanY = currentPanY + deltaY

      // Clamp pan to keep page visible
      const rect = container.getBoundingClientRect()
      const clamped = clampPan(newPanX, newPanY, currentZoom, rect)

      setPan(clamped.x, clamped.y)
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        lastMousePos.current = null
        setIsPanning(false)
        container.style.cursor = ""
        container.style.userSelect = ""
      }
    }

    // Touch helpers
    const getTouchDistance = (touches: TouchList): number => {
      const [t1, t2] = [touches[0], touches[1]]
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
    }

    const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
      const [t1, t2] = [touches[0], touches[1]]
      return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      }
    }

    // Touch pinch zoom and pan
    const handleTouchStart = (e: TouchEvent) => {
      // Don't pan if annotation tool is active (drawing/highlighting mode)
      const activeTool = useAnnotationStore.getState().activeTool

      if (e.touches.length === 2) {
        // Two-finger gesture: pinch zoom (always allowed, even in annotation mode)
        lastTouchDistance.current = getTouchDistance(e.touches)
        lastTouchCenter.current = getTouchCenter(e.touches)
        setIsPanning(true)
      } else if (e.touches.length === 1) {
        // Single finger: pan (only when zoomed in and not in annotation mode)
        const currentZoom = useFlowbookUIStore.getState().zoomLevel
        if (currentZoom > 1 && activeTool === null) {
          isDragging.current = true
          lastMousePos.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          }
          setIsPanning(true)
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        // Pinch zoom
        e.preventDefault()

        const distance = getTouchDistance(e.touches)
        const center = getTouchCenter(e.touches)
        const scale = distance / lastTouchDistance.current

        const currentZoom = useFlowbookUIStore.getState().zoomLevel
        const currentPanX = useFlowbookUIStore.getState().panX
        const currentPanY = useFlowbookUIStore.getState().panY

        const newZoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, currentZoom * scale),
        )

        // If at minimum zoom, reset pan
        if (newZoom <= MIN_ZOOM) {
          setZoomLevel(MIN_ZOOM)
          setPan(0, 0)
        } else {
          // Also handle pan movement during pinch
          if (lastTouchCenter.current) {
            const panDeltaX = center.x - lastTouchCenter.current.x
            const panDeltaY = center.y - lastTouchCenter.current.y
            const newPanX = currentPanX + panDeltaX
            const newPanY = currentPanY + panDeltaY

            // Clamp pan to keep page visible
            const rect = container.getBoundingClientRect()
            const clamped = clampPan(newPanX, newPanY, newZoom, rect)
            setPan(clamped.x, clamped.y)
          }
          setZoomLevel(newZoom)
        }

        lastTouchDistance.current = distance
        lastTouchCenter.current = center
      } else if (
        e.touches.length === 1 &&
        isDragging.current &&
        lastMousePos.current
      ) {
        // Single finger pan
        e.preventDefault()

        const currentZoom = useFlowbookUIStore.getState().zoomLevel
        const currentPanX = useFlowbookUIStore.getState().panX
        const currentPanY = useFlowbookUIStore.getState().panY

        const deltaX = e.touches[0].clientX - lastMousePos.current.x
        const deltaY = e.touches[0].clientY - lastMousePos.current.y

        const newPanX = currentPanX + deltaX
        const newPanY = currentPanY + deltaY

        // Clamp pan to keep page visible
        const rect = container.getBoundingClientRect()
        const clamped = clampPan(newPanX, newPanY, currentZoom, rect)

        setPan(clamped.x, clamped.y)
        lastMousePos.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastTouchDistance.current = null
        lastTouchCenter.current = null
      }
      if (e.touches.length === 0) {
        isDragging.current = false
        lastMousePos.current = null
        setIsPanning(false)
      }
    }

    // Double-click/tap to toggle zoom
    const handleDoubleClick = (e: MouseEvent) => {
      // Don't toggle zoom if clicking on interactive elements
      if (
        e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLInputElement ||
        (e.target as HTMLElement).closest("button, a, input")
      ) {
        return
      }
      e.preventDefault()

      const currentZoom = useFlowbookUIStore.getState().zoomLevel
      if (currentZoom === 1) {
        // Zoom in to the clicked point
        const rect = container.getBoundingClientRect()
        const containerCenterX = rect.width / 2
        const containerCenterY = rect.height / 2
        const pointRelX = e.clientX - rect.left - containerCenterX
        const pointRelY = e.clientY - rect.top - containerCenterY

        // Zoom to 1.5x centered on click point
        const newZoom = 1.5
        const newPanX = pointRelX * (1 - newZoom)
        const newPanY = pointRelY * (1 - newZoom)

        // Clamp pan to keep page visible
        const clamped = clampPan(newPanX, newPanY, newZoom, rect)

        setZoomLevel(newZoom)
        setPan(clamped.x, clamped.y)
      } else {
        resetZoom() // Reset to 100%
      }
    }

    // Update cursor based on zoom level and annotation mode
    const updateCursor = () => {
      const currentZoom = useFlowbookUIStore.getState().zoomLevel
      const activeTool = useAnnotationStore.getState().activeTool

      // Don't show grab cursor if annotation tool is active
      if (activeTool !== null) {
        container.style.cursor = ""
        return
      }

      if (currentZoom > 1 && !isDragging.current) {
        container.style.cursor = "grab"
      } else if (!isDragging.current) {
        container.style.cursor = ""
      }
    }

    // Initial cursor setup
    updateCursor()

    // Subscribe to zoom and annotation changes for cursor updates
    const unsubscribeUI = useFlowbookUIStore.subscribe((state, prevState) => {
      if (state.zoomLevel !== prevState.zoomLevel) {
        updateCursor()
      }
    })

    const unsubscribeAnnotation = useAnnotationStore.subscribe((state, prevState) => {
      if (state.activeTool !== prevState.activeTool) {
        updateCursor()
      }
    })

    container.addEventListener("wheel", handleWheel, { passive: false })
    container.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    })
    container.addEventListener("touchmove", handleTouchMove, { passive: false })
    container.addEventListener("touchend", handleTouchEnd)
    container.addEventListener("dblclick", handleDoubleClick)

    return () => {
      container.removeEventListener("wheel", handleWheel)
      container.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
      container.removeEventListener("dblclick", handleDoubleClick)
      unsubscribeUI()
      unsubscribeAnnotation()
    }
  }, [
    containerRef,
    containerReady,
    zoomAtPoint,
    clampPan,
    setZoomLevel,
    setPan,
    resetZoom,
    setIsPanning,
  ])
}
