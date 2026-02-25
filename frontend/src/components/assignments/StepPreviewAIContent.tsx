/**
 * Step Preview AI Content Component
 * Unified Assignment Story: AI Content Preview
 *
 * Read-only preview of AI-generated content for assignment creation.
 * Shows content metadata and sample items.
 */

import {
  BookOpen,
  FileText,
  Headphones,
  Loader2,
  Mic,
  Pause,
  PenLine,
  Play,
  RotateCcw,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PassageAudioPlayer } from "@/components/DreamAI/PassageAudioPlayer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { generatePassageAudio } from "@/services/passageAudioApi"
import { useContentLibraryDetail, useBookContentDetail } from "@/hooks/useContentLibrary"
import {
  getActivityTypeColorClasses,
  getActivityTypeConfig,
} from "@/lib/activityTypeConfig"
import type { ContentItem } from "@/types/content-library"

interface StepPreviewAIContentProps {
  content: ContentItem
  /** When provided, fetches detail from DCS book content endpoint instead of library */
  bookId?: number | null
}

export function StepPreviewAIContent({ content, bookId }: StepPreviewAIContentProps) {
  // Fetch detailed content — use DCS book endpoint when bookId is available
  const { data: libraryDetail, isLoading: libraryLoading } = useContentLibraryDetail(
    !bookId ? content.id : "",
  )
  const { data: bookDetail, isLoading: bookLoading } = useBookContentDetail(
    bookId ?? null,
    content.id,
  )

  const detailedContent = bookId
    ? (bookDetail ? { content: bookDetail.content } : undefined)
    : libraryDetail
  const isLoading = bookId ? bookLoading : libraryLoading

  const config = getActivityTypeConfig(content.activity_type)
  const colorClasses = getActivityTypeColorClasses(config.color)
  const IconComponent = config.icon

  // Get items from content
  const getItems = (contentData: Record<string, any>) => {
    return (
      contentData.questions ||
      contentData.items ||
      contentData.sentences ||
      contentData.words ||
      contentData.pairs ||
      []
    )
  }

  // Calculate actual item count from content (fallback if item_count is 0)
  const getActualItemCount = (): number => {
    if (detailedContent?.content) {
      const items = getItems(detailedContent.content)
      if (items.length > 0) return items.length
    }
    return content.item_count
  }

  // Helper to get option text (handles both string and object options)
  const getOptionText = (option: any): string => {
    if (typeof option === "string") return option
    return option?.text || option?.option_text || option?.answer || ""
  }

  // Helper to check if option is correct
  const isOptionCorrect = (option: any, item: any, optIdx: number): boolean => {
    if (typeof option === "string") {
      return option === item.correct_answer || optIdx === item.correct_index
    }
    return option?.is_correct || option?.correct || false
  }

  // Helper to get letters from word - show in correct order for teacher preview
  const getLetters = (item: any): string[] => {
    // For teacher preview, show letters in correct order (spelling order)
    const word = item.correct_word || item.word || ""
    if (word) {
      return word.toUpperCase().split("")
    }
    // Fallback to provided letters if word not available
    if (item.letters && item.letters.length > 0) {
      return item.letters
    }
    return []
  }

  // Helper to get words - show in correct order for teacher preview
  const getCorrectOrderWords = (item: any): string[] => {
    // For teacher preview, show words in correct sentence order
    const sentence = item.correct_sentence || item.sentence || ""
    if (sentence) {
      return sentence.split(" ")
    }
    // Fallback to provided words if sentence not available
    if (item.words && item.words.length > 0) {
      return item.words
    }
    return []
  }

  // Render preview item based on activity type
  const renderPreviewItem = (item: any, index: number, activityTypeOverride?: string) => {
    switch (activityTypeOverride || content.activity_type) {
      case "vocabulary_quiz":
        return (
          <div
            key={item.question_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm mb-3">
                  {item.definition || item.question || item.question_text}
                </p>
                <div className="space-y-1.5">
                  {item.options?.map((option: any, optIdx: number) => (
                    <div
                      key={optIdx}
                      className={`px-3 py-2 rounded text-sm ${
                        isOptionCorrect(option, item, optIdx)
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium"
                          : "bg-muted/50"
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}){" "}
                      {getOptionText(option)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case "ai_quiz":
        return (
          <div
            key={item.question_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm mb-3">
                  {item.question_text || item.question}
                </p>
                <div className="space-y-1.5">
                  {item.options?.map((option: any, optIdx: number) => (
                    <div
                      key={optIdx}
                      className={`px-3 py-2 rounded text-sm ${
                        isOptionCorrect(option, item, optIdx)
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium"
                          : "bg-muted/50"
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}){" "}
                      {getOptionText(option)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case "reading_comprehension":
        return (
          <div
            key={item.question_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm mb-3">
                  {item.question_text || item.question}
                </p>
                {item.options && (
                  <div className="space-y-1.5">
                    {item.options.map((option: any, optIdx: number) => (
                      <div
                        key={optIdx}
                        className={`px-3 py-2 rounded text-sm ${
                          isOptionCorrect(option, item, optIdx)
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium"
                            : "bg-muted/50"
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}){" "}
                        {getOptionText(option)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "sentence_builder": {
        const words = getCorrectOrderWords(item)
        return (
          <div
            key={item.item_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-green-700 dark:text-green-400 mb-2">
                  {item.correct_sentence || item.sentence}
                </p>
                {item.translation && (
                  <p className="text-xs text-muted-foreground mb-3 italic">
                    {item.translation}
                  </p>
                )}
                {words.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {words.map((word: string, wordIdx: number) => (
                      <span
                        key={wordIdx}
                        className="px-3 py-1.5 bg-muted/50 border rounded-md text-sm font-medium"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      case "word_builder": {
        const letters = getLetters(item)
        return (
          <div
            key={item.item_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base text-green-700 dark:text-green-400 mb-1">
                  {item.correct_word || item.word}
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  {item.definition || item.hint}
                </p>
                {letters.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {letters.map((letter: string, letterIdx: number) => (
                      <span
                        key={letterIdx}
                        className="w-9 h-9 flex items-center justify-center bg-muted border-2 rounded-lg text-base font-bold font-mono uppercase"
                      >
                        {letter}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      case "vocabulary_matching":
        return (
          <div
            key={item.pair_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-1">
                  {item.word || item.term}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.definition || item.match}
                </p>
              </div>
            </div>
          </div>
        )

      case "listening_quiz":
        return (
          <div
            key={item.question_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                {item.audio_url && (
                  <div className="mb-3">
                    <InlineAudioPlayer audioUrl={item.audio_url} fallbackUrl={item.audio_url_fallback} fallbackText={item.audio_text} />
                  </div>
                )}
                {!item.audio_url && item.audio_text && (
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground italic">"{item.audio_text}"</span>
                  </div>
                )}
                {!item.audio_url && !item.audio_text && (
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Audio pending</span>
                  </div>
                )}
                <p className="font-medium text-sm mb-3">
                  {item.question_text}
                </p>
                <div className="space-y-1.5">
                  {item.options?.map((option: string, optIdx: number) => {
                    const isCorrect =
                      option === item.correct_answer ||
                      optIdx === item.correct_index ||
                      String.fromCharCode(65 + optIdx) === item.correct_answer
                    return (
                      <div
                        key={optIdx}
                        className={`px-3 py-2 rounded text-sm ${
                          isCorrect
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium"
                            : "bg-muted/50"
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}) {option}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )

      case "listening_fill_blank":
        return (
          <div
            key={item.item_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                {item.audio_url && (
                  <div className="mb-3">
                    <InlineAudioPlayer audioUrl={item.audio_url} fallbackUrl={item.audio_url_fallback} fallbackText={item.full_sentence || item.audio_text} />
                  </div>
                )}
                {!item.audio_url && (
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Audio pending</span>
                  </div>
                )}
                <p className="font-medium text-sm mb-3">
                  {item.display_sentence}
                </p>
                {item.word_bank && item.word_bank.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.word_bank.map((word: string, wordIdx: number) => {
                      const isAnswer = item.missing_words?.includes(word)
                      return (
                        <span
                          key={wordIdx}
                          className={`px-3 py-1.5 border rounded-md text-sm font-medium ${
                            isAnswer
                              ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200"
                              : "bg-muted/50"
                          }`}
                        >
                          {word}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "listening_sentence_builder":
        return (
          <div
            key={item.item_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                {item.audio_url && (
                  <div className="mb-3">
                    <InlineAudioPlayer audioUrl={item.audio_url} fallbackUrl={item.audio_url_fallback} fallbackText={item.correct_sentence} />
                  </div>
                )}
                {!item.audio_url && (
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Audio pending · {item.word_count} words
                    </span>
                  </div>
                )}
                {item.correct_sentence && (
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-3">
                    {item.correct_sentence}
                  </p>
                )}
                {item.words && item.words.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.words.map((word: string, wordIdx: number) => (
                      <span
                        key={wordIdx}
                        className="px-3 py-1.5 bg-muted/50 border rounded-md text-sm font-medium"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "listening_word_builder":
        return (
          <div
            key={item.item_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                {item.audio_url && (
                  <div className="mb-3">
                    <InlineAudioPlayer audioUrl={item.audio_url} fallbackUrl={item.audio_url_fallback} fallbackText={item.correct_word} />
                  </div>
                )}
                {!item.audio_url && (
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Audio pending · {item.letter_count} letters
                    </span>
                  </div>
                )}
                {item.definition && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {item.definition}
                  </p>
                )}
                {item.letters && item.letters.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.letters.map((letter: string, letterIdx: number) => (
                      <span
                        key={letterIdx}
                        className="w-9 h-9 flex items-center justify-center bg-muted border-2 rounded-lg text-base font-bold font-mono uppercase"
                      >
                        {letter}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "writing_fill_blank":
        return (
          <div
            key={item.item_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <PenLine className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Fill in the blank</span>
                </div>
                {item.context && (
                  <p className="text-xs text-muted-foreground mb-2 italic">{item.context}</p>
                )}
                <p className="font-medium text-sm">{item.sentence}</p>
              </div>
            </div>
          </div>
        )

      case "writing_sentence_corrector":
        return (
          <div
            key={item.item_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <PenLine className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">
                    Sentence Correction
                    {item.error_type && ` · ${item.error_type}`}
                  </span>
                </div>
                {item.context && (
                  <p className="text-xs text-muted-foreground mb-2 italic">{item.context}</p>
                )}
                <p className="font-medium text-sm text-red-600 dark:text-red-400 line-through mb-1">
                  {item.incorrect_sentence}
                </p>
                {item.correct_sentence && (
                  <p className="font-medium text-sm text-green-700 dark:text-green-400">
                    {item.correct_sentence}
                  </p>
                )}
              </div>
            </div>
          </div>
        )

      case "writing_free_response":
        return (
          <div
            key={item.item_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <PenLine className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">
                    Free Response · {item.min_words}–{item.max_words} words
                  </span>
                </div>
                {item.context && (
                  <p className="text-xs text-muted-foreground mb-2 italic">{item.context}</p>
                )}
                <p className="font-medium text-sm">{item.prompt}</p>
              </div>
            </div>
          </div>
        )

      case "speaking_open_response":
        return (
          <div
            key={item.item_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">
                    Speaking · {item.max_seconds}s max
                  </span>
                </div>
                {item.context && (
                  <p className="text-xs text-muted-foreground mb-2 italic">{item.context}</p>
                )}
                <p className="font-medium text-sm">{item.prompt}</p>
              </div>
            </div>
          </div>
        )

      default:
        // Generic fallback for any unknown activity types
        return (
          <div
            key={item.item_id || item.question_id || index}
            className="p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {item.question_text || item.prompt || item.sentence || item.word || item.definition || `Item ${index + 1}`}
                </p>
              </div>
            </div>
          </div>
        )
    }
  }

  /** Map mix-mode skill_slug×format_slug to the activity_type used by renderPreviewItem */
  const mixFormatToActivityType = (skill: string, format: string): string => {
    const map: Record<string, Record<string, string>> = {
      vocabulary: {
        multiple_choice: "vocabulary_quiz",
        word_builder: "word_builder",
        matching: "vocabulary_matching",
      },
      grammar: {
        multiple_choice: "ai_quiz",
        fill_blank: "writing_fill_blank",
        sentence_builder: "sentence_builder",
      },
      reading: { comprehension: "reading_comprehension" },
      listening: {
        fill_blank: "listening_fill_blank",
        sentence_builder: "listening_sentence_builder",
        word_builder: "listening_word_builder",
      },
      writing: {
        fill_blank: "writing_fill_blank",
        sentence_corrector: "writing_sentence_corrector",
        free_response: "writing_free_response",
      },
      speaking: { open_response: "speaking_open_response" },
    }
    return map[skill]?.[format] || "unknown"
  }

  const SKILL_LABELS: Record<string, string> = {
    vocabulary: "Vocabulary",
    grammar: "Grammar",
    reading: "Reading",
    listening: "Listening",
    writing: "Writing",
    speaking: "Speaking",
  }

  const SKILL_COLORS: Record<string, string> = {
    vocabulary: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    grammar: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    reading: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    listening: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    writing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    speaking: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  }

  /** Render mix mode content grouped by skill */
  const renderMixModeContent = (contentData: Record<string, any>) => {
    const questions: Array<{ question_id: string; skill_slug: string; format_slug: string; question_data: any }> =
      contentData.questions || []
    if (questions.length === 0) return null

    // Group by skill_slug preserving order
    const groups: Array<{ skill: string; items: typeof questions }> = []
    const seen = new Map<string, number>()
    for (const q of questions) {
      const idx = seen.get(q.skill_slug)
      if (idx !== undefined) {
        groups[idx].items.push(q)
      } else {
        seen.set(q.skill_slug, groups.length)
        groups.push({ skill: q.skill_slug, items: [q] })
      }
    }

    let globalIndex = 0
    return (
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.skill}>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3 ${SKILL_COLORS[group.skill] || "bg-muted text-muted-foreground"}`}>
              {SKILL_LABELS[group.skill] || group.skill}
              <span className="opacity-60">· {group.items.length}</span>
            </div>
            {/* Reading passage — show once at top of group with on-demand audio */}
            {group.skill === "reading" && group.items[0]?.question_data?.passage && (
              <div className="mb-3 space-y-2">
                <OnDemandPassageAudio passageText={group.items[0].question_data.passage} />
                <div className="p-3 rounded-lg border bg-card max-h-[150px] overflow-y-auto">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {group.items[0].question_data.passage}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {group.items.map((q) => {
                const idx = globalIndex++
                const actType = mixFormatToActivityType(q.skill_slug, q.format_slug)
                const data = { ...q.question_data }
                // For listening items, ensure audio_url and fallback via dynamic TTS
                if (group.skill === "listening") {
                  const text = data.full_sentence || data.correct_sentence || data.correct_word || ""
                  const lang = contentData.language || "en"
                  if (text) {
                    const ttsUrl = `/api/v1/ai/tts/audio?text=${encodeURIComponent(text)}&lang=${lang}`
                    if (!data.audio_url) {
                      data.audio_url = ttsUrl
                    }
                    data.audio_url_fallback = ttsUrl
                  }
                }
                return renderPreviewItem(data, idx, actType)
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render audio player for listening content at the top level
  const renderListeningPassageAudio = () => {
    if (!detailedContent?.content) return null
    const actType = content.activity_type
    // Only show top-level audio for types that don't have per-item audio
    if (
      actType !== "listening_quiz" &&
      actType !== "listening_fill_blank" &&
      actType !== "listening_sentence_builder" &&
      actType !== "listening_word_builder"
    )
      return null
    // If there's a shared passage audio (base64), show the PassageAudioPlayer
    if (detailedContent.content.passage_audio) {
      return (
        <div className="mb-4 shrink-0">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Listening Passage
          </p>
          <PassageAudioPlayer
            audioBase64={detailedContent.content.passage_audio.audio_base64}
            wordTimestamps={detailedContent.content.passage_audio.word_timestamps}
            durationSeconds={detailedContent.content.passage_audio.duration_seconds}
          />
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header Row */}
      <div className="flex items-center gap-3 pb-3 mb-3 border-b shrink-0">
        <div className={`rounded-lg p-1.5 ${colorClasses.bg}`}>
          <IconComponent className={`h-4 w-4 ${colorClasses.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{content.title}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{config.label}</span>
            <span>•</span>
            <span>
              {getActualItemCount()}{" "}
              {getActualItemCount() === 1 ? "item" : "items"}
            </span>
            {(content.book_title || content.material_name) && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 truncate">
                  {content.book_title ? (
                    <>
                      <BookOpen className="h-3 w-3" />
                      {content.book_title}
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3" />
                      {content.material_name}
                    </>
                  )}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reading Comprehension Passage */}
      {content.activity_type === "reading_comprehension" &&
        detailedContent?.content &&
        (detailedContent.content.passage ||
          detailedContent.content.passage_text ||
          detailedContent.content.passage_audio) && (
          <div className="mb-4 shrink-0">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Reading Passage
            </p>
            {detailedContent.content.passage_audio ? (
              <PassageAudioPlayer
                audioBase64={detailedContent.content.passage_audio.audio_base64}
                wordTimestamps={detailedContent.content.passage_audio.word_timestamps}
                durationSeconds={detailedContent.content.passage_audio.duration_seconds}
              />
            ) : (
              <div className="p-3 rounded-lg border bg-card max-h-[150px] overflow-y-auto">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {detailedContent.content.passage ||
                    detailedContent.content.passage_text}
                </p>
              </div>
            )}
          </div>
        )}

      {/* Listening Passage Audio */}
      {renderListeningPassageAudio()}

      {/* Questions/Items - Takes remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : detailedContent?.content ? (
            <div className="space-y-3 pr-4">
              {content.activity_type === "mix_mode" ? (
                renderMixModeContent(detailedContent.content)
              ) : (
                getItems(detailedContent.content).map(
                  (item: any, index: number) => renderPreviewItem(item, index),
                )
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                Unable to load preview
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

/**
 * Compact inline audio player for listening activity previews.
 * Plays audio from a URL with play/pause/replay controls.
 */
function InlineAudioPlayer({ audioUrl, fallbackUrl, fallbackText }: { audioUrl: string; fallbackUrl?: string; fallbackText?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [activeSrc, setActiveSrc] = useState(audioUrl)
  const [triedFallback, setTriedFallback] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => {
      setIsPlaying(true)
      setIsLoading(false)
    }
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }
    const onError = () => {
      setIsLoading(false)
      // Try fallback URL before showing error
      if (!triedFallback && fallbackUrl) {
        setTriedFallback(true)
        setActiveSrc(fallbackUrl)
        return
      }
      setError(true)
    }

    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("error", onError)

    return () => {
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("error", onError)
    }
  }, [audioUrl, activeSrc, triedFallback, fallbackUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      setIsLoading(true)
      setError(false)
      audio.play().catch(() => {
        setIsLoading(false)
        setError(true)
      })
    }
  }, [isPlaying])

  const handleReplay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    setIsLoading(true)
    setError(false)
    audio.play().catch(() => {
      setIsLoading(false)
      setError(true)
    })
  }, [])

  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Headphones className="h-3.5 w-3.5" />
        {fallbackText ? (
          <span className="italic">"{fallbackText}"</span>
        ) : (
          <span>Audio unavailable</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
      <audio ref={audioRef} src={activeSrc} preload="metadata" />

      {/* Play/Pause */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all",
          isPlaying
            ? "bg-teal-500 text-white hover:bg-teal-600"
            : "bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-800 dark:text-teal-300",
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3 translate-x-0.5" />
        )}
      </button>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 rounded-full bg-teal-100 dark:bg-teal-800 overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time */}
      <span className="text-xs font-medium tabular-nums text-gray-600 dark:text-gray-400 min-w-[70px] text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Replay */}
      <button
        type="button"
        onClick={handleReplay}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Replay"
      >
        <RotateCcw className="h-3 w-3" />
      </button>
    </div>
  )
}

/**
 * Fetches passage audio on-demand via POST /api/v1/ai/tts/passage-audio
 * and renders PassageAudioPlayer once ready.
 */
function OnDemandPassageAudio({ passageText }: { passageText: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["passage-audio", passageText.slice(0, 100)],
    queryFn: () => generatePassageAudio({ text: passageText }),
    enabled: !!passageText,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Generating passage audio...</span>
      </div>
    )
  }

  if (error || !data) return null

  return (
    <PassageAudioPlayer
      audioBase64={data.audio_base64}
      wordTimestamps={data.word_timestamps}
      durationSeconds={data.duration_seconds}
    />
  )
}
