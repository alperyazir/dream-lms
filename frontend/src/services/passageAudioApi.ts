/**
 * Passage Audio API Service
 *
 * API client for generating passage narration audio with word-level timestamps
 * via the Edge TTS backend endpoint.
 */

import { createApiClient } from "./apiClient";

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface PassageAudioRequest {
  text: string;
  voice_id?: string;
}

export interface PassageAudioResponse {
  audio_base64: string;
  word_timestamps: WordTimestamp[];
  duration_seconds: number;
}

const apiClient = createApiClient();

export async function generatePassageAudio(
  request: PassageAudioRequest,
): Promise<PassageAudioResponse> {
  const response = await apiClient.post<PassageAudioResponse>(
    "/api/v1/ai/tts/passage-audio",
    request,
  );
  return response.data;
}
