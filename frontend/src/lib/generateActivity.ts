/**
 * Unified Activity Generation
 * Story 27.17: Question Generator UI - Task 9
 * Story 30.10: V2 skill-first generation support
 *
 * Routes generation requests to appropriate API based on activity type
 * and normalizes responses for preview.
 */

import type {
  GeneratedActivity,
  GeneratorFormState,
} from "@/hooks/useGenerationState"
import { generateAIQuiz } from "@/services/aiQuizApi"
import {
  generateContentV2,
  generateContentV2Stream,
  type GenerationResponseV2,
} from "@/services/generationV2Api"
import { generateReadingActivity } from "@/services/readingComprehensionApi"
import { generateActivity as generateSentenceBuilder } from "@/services/sentenceBuilderApi"
import { generateQuiz as generateVocabularyQuiz } from "@/services/vocabularyQuizApi"
import { generateActivity as generateWordBuilder } from "@/services/wordBuilderApi"

/**
 * Generate activity using V2 skill-first endpoint.
 * Returns the V2 response which wraps the generated content with skill metadata.
 */
export async function generateActivityV2(
  state: GeneratorFormState,
): Promise<GenerationResponseV2> {
  const { bookId, moduleIds, skillSlug, formatSlug, options } = state

  if (!bookId) {
    throw new Error("Book is required for generation")
  }
  if (!skillSlug) {
    throw new Error("Skill is required for V2 generation")
  }

  const extraConfig: Record<string, any> = {}
  if (options.grammar_mode) {
    extraConfig.mode = options.grammar_mode
  }
  if (options.audio_speed) {
    extraConfig.audio_speed = options.audio_speed
  }
  if (options.passage_count && options.passage_count > 1) {
    extraConfig.passage_count = options.passage_count
  }

  return await generateContentV2({
    source_type: "book_module",
    book_id: bookId,
    module_ids: moduleIds,
    skill_slug: skillSlug,
    format_slug: formatSlug,
    difficulty: options.difficulty || "auto",
    count: options.count || 10,
    include_audio: options.include_audio !== false,
    extra_config: Object.keys(extraConfig).length > 0 ? extraConfig : null,
  })
}

/**
 * Generate reading comprehension with SSE streaming.
 * Calls onPassage for each passage as it arrives from the server.
 */
export async function generateActivityV2Stream(
  state: GeneratorFormState,
  callbacks: {
    onPassage: (passage: any) => void
    onComplete: (data: any) => void
    onError: (error: string) => void
  },
): Promise<void> {
  const { bookId, moduleIds, skillSlug, formatSlug, options } = state

  if (!bookId) throw new Error("Book is required for generation")
  if (!skillSlug) throw new Error("Skill is required for V2 generation")

  const extraConfig: Record<string, any> = {}
  if (options.passage_count && options.passage_count > 1) {
    extraConfig.passage_count = options.passage_count
  }

  return await generateContentV2Stream(
    {
      source_type: "book_module",
      book_id: bookId,
      module_ids: moduleIds,
      skill_slug: skillSlug,
      format_slug: formatSlug,
      difficulty: options.difficulty || "auto",
      count: options.count || 10,
      include_audio: options.include_audio !== false,
      extra_config: Object.keys(extraConfig).length > 0 ? extraConfig : null,
    },
    callbacks,
  )
}

/**
 * Generate activity based on form state (legacy V1 path)
 *
 * Routes to the appropriate API endpoint and normalizes the response.
 */
export async function generateActivity(
  state: GeneratorFormState,
): Promise<GeneratedActivity> {
  const { activityType, bookId, moduleIds, options } = state

  if (!activityType) {
    throw new Error("Activity type is required")
  }

  if (!bookId) {
    throw new Error("Book is required for generation")
  }

  // Route to appropriate API based on activity type
  switch (activityType) {
    case "vocabulary_quiz":
      // Note: VocabularyQuizGenerationRequest doesn't support difficulty
      return await generateVocabularyQuiz({
        book_id: bookId!,
        module_ids: moduleIds,
        quiz_length: options.quiz_length,
        quiz_mode: options.quiz_mode || "mixed",
        include_audio: options.include_audio,
      })

    case "ai_quiz":
      return await generateAIQuiz({
        book_id: bookId!,
        module_ids: moduleIds,
        question_count: options.question_count,
        difficulty: options.difficulty,
        include_explanations: options.include_explanations,
      })

    case "reading_comprehension":
      if (!moduleIds || moduleIds.length === 0) {
        throw new Error(
          "Reading comprehension requires a module to be selected",
        )
      }
      return await generateReadingActivity({
        book_id: bookId!,
        module_id: moduleIds[0],
        module_ids: moduleIds,
        question_count: options.question_count,
        question_types: options.question_types,
        difficulty: options.difficulty,
      })

    case "sentence_builder": {
      // Sentence builder only accepts easy/medium/hard, not "auto"
      const sentenceDifficulty =
        options.difficulty === "auto" ? "medium" : options.difficulty
      return await generateSentenceBuilder({
        book_id: bookId!,
        module_ids: moduleIds,
        sentence_count: options.sentence_count,
        difficulty: sentenceDifficulty,
        include_audio: options.include_audio,
      })
    }

    case "word_builder":
      // Note: WordBuilderRequest doesn't support difficulty
      return await generateWordBuilder({
        book_id: bookId!,
        module_ids: moduleIds,
        word_count: options.word_count,
        hint_type: options.hint_type,
        cefr_levels: options.cefr_levels,
      })

    default:
      throw new Error(`Unknown activity type: ${activityType}`)
  }
}
