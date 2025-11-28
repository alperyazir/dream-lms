/**
 * Hook to get window size with reactive updates
 * Story 4.7: Used for confetti animation dimensions
 */

import { useEffect, useState } from "react"

export interface WindowSize {
  width: number
  height: number
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  })

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener("resize", handleResize)

    // Call handler right away so state gets updated with initial window size
    handleResize()

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return windowSize
}
