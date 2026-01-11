/**
 * Unified Activity Generation
 * Story 27.17: Question Generator UI - Task 9
 *
 * Routes generation requests to appropriate API based on activity type
 * and normalizes responses for preview.
 */

import type {
  GeneratedActivity,
  GeneratorFormState,
} from "@/hooks/useGenerationState"
import { generateAIQuiz } from "@/services/aiQuizApi"
import { generateReadingActivity } from "@/services/readingComprehensionApi"
import { generateActivity as generateSentenceBuilder } from "@/services/sentenceBuilderApi"
import { generateQuiz as generateVocabularyQuiz } from "@/services/vocabularyQuizApi"
import { generateActivity as generateWordBuilder } from "@/services/wordBuilderApi"

/**
 * Generate activity based on form state
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
      // Reading comprehension requires a single module (not array)
      // Use the first selected module as the context source for AI passage generation
      if (!moduleIds || moduleIds.length === 0) {
        throw new Error(
          "Reading comprehension requires a module to be selected",
        )
      }
      return await generateReadingActivity({
        book_id: bookId!,
        module_id: moduleIds[0], // Single module ID required for context
        question_count: options.question_count,
        question_types: options.question_types,
        difficulty: options.difficulty,
        passage_length: options.passage_length,
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
