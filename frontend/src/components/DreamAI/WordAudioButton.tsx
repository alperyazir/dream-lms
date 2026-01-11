/**
 * Word Audio Button Component
 * Story 27.18: Vocabulary Explorer with Audio Player
 *
 * Plays audio pronunciation for vocabulary words using the backend streaming proxy.
 */

import axios from "axios"
import { Loader2, Volume2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { OpenAPI } from "@/client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export interface WordAudioButtonProps {
  bookId: number
  wordId: string // Word ID for API (e.g., "word_1")
  word: string // Word text for display
  language?: string
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg" | "icon"
}

/**
 * Audio button for vocabulary word pronunciation
 *
 * Fetches audio with authentication and plays it using blob URL.
 */
export function WordAudioButton({
  bookId,
  wordId,
  word,
  language = "en",
  variant = "ghost",
  size = "sm",
}: WordAudioButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const { toast } = useToast()

  // Cleanup audio and blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

  const handlePlay = async () => {
    // If already playing, stop
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    setIsLoading(true)

    try {
      // Get auth token
      const token = OpenAPI.TOKEN
      const tokenValue =
        typeof token === "function"
          ? await token({ method: "GET", url: "" })
          : token

      // Fetch audio with authentication
      // Use wordId (e.g., "word_1") for the API, not the word text
      const encodedWordId = encodeURIComponent(wordId)
      const audioUrl = `${OpenAPI.BASE}/api/v1/ai/audio/vocabulary/${bookId}/${language}/${encodedWordId}`

      const response = await axios.get(audioUrl, {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${tokenValue}`,
        },
      })

      // Revoke previous blob URL if exists
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }

      // Create blob URL for audio playback
      const blob = new Blob([response.data], { type: "audio/mpeg" })
      const blobUrl = URL.createObjectURL(blob)
      blobUrlRef.current = blobUrl

      // Create and play audio
      const audio = new Audio(blobUrl)
      audioRef.current = audio

      // Set up event handlers
      audio.onended = () => {
        setIsPlaying(false)
      }

      audio.onerror = () => {
        setIsPlaying(false)
        setIsLoading(false)
        toast({
          variant: "destructive",
          title: "Audio Error",
          description: "Failed to play audio.",
        })
      }

      // Play audio
      await audio.play()
      setIsPlaying(true)
      setIsLoading(false)
    } catch (error: any) {
      console.error("Failed to load audio:", error)
      const message =
        error?.response?.status === 404
          ? "Audio not available for this word."
          : "Could not load audio for this word."
      toast({
        variant: "destructive",
        title: "Audio Unavailable",
        description: message,
      })
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePlay}
      disabled={isLoading}
      aria-label={`Play pronunciation of ${word}`}
      className="hover:text-emerald-600"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2
          className={`h-4 w-4 ${isPlaying ? "animate-pulse text-emerald-600" : ""}`}
        />
      )}
    </Button>
  )
}
