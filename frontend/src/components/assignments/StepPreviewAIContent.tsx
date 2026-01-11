/**
 * Step Preview AI Content Component
 * Unified Assignment Story: AI Content Preview
 *
 * Read-only preview of AI-generated content for assignment creation.
 * Shows content metadata and sample items.
 */

import { BookOpen, FileText } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useContentLibraryDetail } from "@/hooks/useContentLibrary"
import {
  getActivityTypeColorClasses,
  getActivityTypeConfig,
} from "@/lib/activityTypeConfig"
import type { ContentItem } from "@/types/content-library"

interface StepPreviewAIContentProps {
  content: ContentItem
}

export function StepPreviewAIContent({ content }: StepPreviewAIContentProps) {
  // Fetch detailed content to get the actual questions/items
  const { data: detailedContent, isLoading } = useContentLibraryDetail(
    content.id,
  )

  const config = getActivityTypeConfig(content.activity_type)
  const colorClasses = getActivityTypeColorClasses(config.color)
  const IconComponent = config.icon

  // Get items from content
  const getItems = (contentData: Record<string, any>) => {
    return (
      contentData.questions ||
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
  const renderPreviewItem = (item: any, index: number) => {
    switch (content.activity_type) {
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

      default:
        return null
    }
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
              {getActualItemCount()} {getActualItemCount() === 1 ? "item" : "items"}
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
          detailedContent.content.passage_text) && (
          <div className="mb-4 shrink-0">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Reading Passage
            </p>
            <div className="p-3 rounded-lg border bg-card max-h-[150px] overflow-y-auto">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {detailedContent.content.passage ||
                  detailedContent.content.passage_text}
              </p>
            </div>
          </div>
        )}

      {/* Questions/Items - Takes remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : detailedContent?.content ? (
            <div className="space-y-3 pr-4">
              {getItems(detailedContent.content).map(
                (item: any, index: number) => renderPreviewItem(item, index),
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
