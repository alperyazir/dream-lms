/**
 * Passage Audio API Service
 *
 * API client for generating passage narration audio with word-level timestamps
 * via the Edge TTS backend endpoint.
 */

import axios from "axios"
import { OpenAPI } from "../client"

export interface WordTimestamp {
  word: string
  start: number
  end: number
}

export interface PassageAudioRequest {
  text: string
  voice_id?: string
}

export interface PassageAudioResponse {
  audio_base64: string
  word_timestamps: WordTimestamp[]
  duration_seconds: number
}

const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
})

apiClient.interceptors.request.use(async (config) => {
  if (!config.baseURL) {
    config.baseURL = OpenAPI.BASE
  }

  const token = OpenAPI.TOKEN
  if (token) {
    const tokenValue =
      typeof token === "function"
        ? await token({
            method: (config.method || "POST") as
              | "GET"
              | "POST"
              | "PUT"
              | "DELETE"
              | "OPTIONS"
              | "HEAD"
              | "PATCH",
            url: config.url || "",
          })
        : token
    config.headers.Authorization = `Bearer ${tokenValue}`
  }

  return config
})

export async function generatePassageAudio(
  request: PassageAudioRequest,
): Promise<PassageAudioResponse> {
  const response = await apiClient.post<PassageAudioResponse>(
    "/api/v1/ai/tts/passage-audio",
    request,
  )
  return response.data
}
