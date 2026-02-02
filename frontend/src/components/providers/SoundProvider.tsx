/**
 * Sound Effects Provider
 * Wraps the application to provide sound effects context
 */

import type { ReactNode } from "react"
import { SoundContext, useSoundEffects } from "@/hooks/useSoundEffects"

interface SoundProviderProps {
  children: ReactNode
}

export function SoundProvider({ children }: SoundProviderProps) {
  const soundEffects = useSoundEffects()

  return <SoundContext.Provider value={soundEffects}>{children}</SoundContext.Provider>
}
