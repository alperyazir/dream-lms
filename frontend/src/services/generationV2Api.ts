/**
 * V2 Generation API Service (Epic 30 - Story 30.10)
 *
 * Calls the skill-first generation endpoint POST /api/v1/ai/generate-v2.
 */

import { OpenAPI } from "@/client/core/OpenAPI"

export interface GenerationRequestV2 {
  source_type?: "book_module" | "teacher_material"
  book_id: number
  module_ids: number[]
  skill_slug: string
  format_slug: string | null
  difficulty?: string
  count?: number
  language?: string | null
  include_audio?: boolean
  extra_config?: Record<string, any> | null
}

export interface GenerationResponseV2 {
  content_id: string
  activity_type: string
  content: Record<string, any>
  skill_id: string
  skill_slug: string
  skill_name: string
  format_id: string
  format_slug: string
  format_name: string
  source_type: string
  book_id: number | null
  difficulty: string
  item_count: number
  created_at: string
}

const BASE_URL = OpenAPI.BASE || ""

export async function generateContentV2(
  request: GenerationRequestV2,
): Promise<GenerationResponseV2> {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({} as any)
      : OpenAPI.TOKEN
  const response = await fetch(`${BASE_URL}/api/v1/ai/generate-v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const detail = errorData?.detail || response.statusText
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail))
  }
  return response.json()
}

/**
 * Stream reading comprehension passages via SSE.
 * Calls the streaming endpoint and invokes onPassage for each passage as it arrives.
 */
export async function generateContentV2Stream(
  request: GenerationRequestV2,
  callbacks: {
    onPassage: (passage: any) => void
    onComplete: (data: any) => void
    onError: (error: string) => void
  },
): Promise<void> {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({} as any)
      : OpenAPI.TOKEN

  const response = await fetch(`${BASE_URL}/api/v1/ai/generate-v2/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const detail = errorData?.detail || response.statusText
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail))
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Parse SSE events from buffer
    const lines = buffer.split("\n")
    buffer = lines.pop() || "" // Keep incomplete line in buffer

    let eventType = ""
    let dataLines: string[] = []

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim()
      } else if (line.startsWith("data: ")) {
        dataLines.push(line.slice(6))
      } else if (line === "" && eventType && dataLines.length > 0) {
        // Empty line = end of event
        const data = JSON.parse(dataLines.join("\n"))
        if (eventType === "passage") {
          callbacks.onPassage(data)
        } else if (eventType === "complete") {
          callbacks.onComplete(data)
        } else if (eventType === "error") {
          callbacks.onError(data.error)
        }
        eventType = ""
        dataLines = []
      }
    }
  }
}
