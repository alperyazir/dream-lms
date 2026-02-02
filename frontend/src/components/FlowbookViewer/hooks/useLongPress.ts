import { useCallback, useRef, useState } from "react"

interface LongPressOptions {
  threshold?: number // Time in ms to trigger long press
  onLongPress: (position: { x: number; y: number }) => void
  onCancel?: () => void
}

interface LongPressHandlers {
  onMouseDown: (e: React.MouseEvent) => void
  onMouseUp: () => void
  onMouseLeave: () => void
  onMouseMove: (e: React.MouseEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: () => void
  onTouchMove: (e: React.TouchEvent) => void
}

interface LongPressResult {
  handlers: LongPressHandlers
  isPressed: boolean
}

const DEFAULT_THRESHOLD = 500 // 500ms for long press
const MOVE_THRESHOLD = 10 // Max pixels of movement allowed

export function useLongPress({
  threshold = DEFAULT_THRESHOLD,
  onLongPress,
  onCancel,
}: LongPressOptions): LongPressResult {
  const [isPressed, setIsPressed] = useState(false)
  const timerRef = useRef<number | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const triggeredRef = useRef(false)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startPosRef.current = null
    setIsPressed(false)
  }, [])

  const cancel = useCallback(() => {
    clear()
    if (!triggeredRef.current) {
      onCancel?.()
    }
    triggeredRef.current = false
  }, [clear, onCancel])

  const start = useCallback(
    (x: number, y: number) => {
      // Don't start if clicking on interactive elements
      const target = document.elementFromPoint(x, y)
      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLInputElement ||
        target?.closest("button, a, input, [data-no-long-press]")
      ) {
        return
      }

      triggeredRef.current = false
      startPosRef.current = { x, y }
      setIsPressed(true)

      timerRef.current = window.setTimeout(() => {
        triggeredRef.current = true
        setIsPressed(false)
        onLongPress({ x, y })
      }, threshold)
    },
    [threshold, onLongPress]
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only respond to left click
      if (e.button !== 0) return
      start(e.clientX, e.clientY)
    },
    [start]
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!startPosRef.current || !timerRef.current) return

      const dx = e.clientX - startPosRef.current.x
      const dy = e.clientY - startPosRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Cancel if moved too far (user is panning, not long pressing)
      if (distance > MOVE_THRESHOLD) {
        cancel()
      }
    },
    [cancel]
  )

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) {
        cancel()
        return
      }
      const touch = e.touches[0]
      start(touch.clientX, touch.clientY)
    },
    [start, cancel]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!startPosRef.current || e.touches.length !== 1) {
        cancel()
        return
      }

      const touch = e.touches[0]
      const dx = touch.clientX - startPosRef.current.x
      const dy = touch.clientY - startPosRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Cancel if moved too far
      if (distance > MOVE_THRESHOLD) {
        cancel()
      }
    },
    [cancel]
  )

  return {
    handlers: {
      onMouseDown,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onMouseMove,
      onTouchStart,
      onTouchEnd: cancel,
      onTouchMove,
    },
    isPressed,
  }
}
