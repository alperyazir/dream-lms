/**
 * GenerationOptions - Dynamic options panel for activity generation
 * Story 27.17: Question Generator UI - Task 4
 *
 * Renders different configuration options based on selected activity type.
 */

import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import type { ActivityType } from "@/hooks/useGenerationState"

interface GenerationOptionsProps {
  activityType: ActivityType
  options: Record<string, any>
  onOptionChange: (key: string, value: any) => void
}

export function GenerationOptions({
  activityType,
  options,
  onOptionChange,
}: GenerationOptionsProps) {
  if (!activityType) {
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Options</Label>
        <p className="text-sm text-muted-foreground">
          Configure activity parameters
        </p>
      </div>

      {/* Common: Difficulty */}
      <DifficultySelector
        value={options.difficulty || "auto"}
        onChange={(value) => onOptionChange("difficulty", value)}
      />

      {/* Activity-specific options */}
      {activityType === "vocabulary_quiz" && (
        <VocabularyQuizOptions options={options} onChange={onOptionChange} />
      )}

      {activityType === "ai_quiz" && (
        <AIQuizOptions options={options} onChange={onOptionChange} />
      )}

      {activityType === "reading_comprehension" && (
        <ReadingComprehensionOptions
          options={options}
          onChange={onOptionChange}
        />
      )}

      {activityType === "sentence_builder" && (
        <SentenceBuilderOptions options={options} onChange={onOptionChange} />
      )}

      {activityType === "word_builder" && (
        <WordBuilderOptions options={options} onChange={onOptionChange} />
      )}
    </div>
  )
}

/**
 * Common difficulty selector
 */
function DifficultySelector({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="difficulty">Difficulty Level</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="difficulty">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Auto (Based on content)</SelectItem>
          <SelectItem value="easy">Easy</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="hard">Hard</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Vocabulary Quiz specific options
 */
function VocabularyQuizOptions({
  options,
  onChange,
}: {
  options: Record<string, any>
  onChange: (key: string, value: any) => void
}) {
  const quizLength = options.quiz_length || 10
  const includeAudio = options.include_audio ?? true
  const quizMode = options.quiz_mode || "mixed"

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="quiz-mode">Quiz Mode</Label>
        <Select
          value={quizMode}
          onValueChange={(v) => onChange("quiz_mode", v)}
        >
          <SelectTrigger id="quiz-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mixed">Mixed (Recommended)</SelectItem>
            <SelectItem value="definition">Definition Only</SelectItem>
            <SelectItem value="synonym">Synonym Only</SelectItem>
            <SelectItem value="antonym">Antonym Only</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {quizMode === "mixed" &&
            "AI generates a variety: definitions, synonyms, and antonyms"}
          {quizMode === "definition" && "Match words to their definitions"}
          {quizMode === "synonym" && "Match words to similar words"}
          {quizMode === "antonym" && "Match words to opposite words"}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="quiz-length">Quiz Length</Label>
          <Badge variant="secondary">{quizLength} questions</Badge>
        </div>
        <Slider
          id="quiz-length"
          min={1}
          max={50}
          step={1}
          value={[quizLength]}
          onValueChange={([value]) => onChange("quiz_length", value)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>25</span>
          <span>50</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="include-audio">Include Audio Pronunciation</Label>
          <p className="text-sm text-muted-foreground">
            Add audio for vocabulary words
          </p>
        </div>
        <Switch
          id="include-audio"
          checked={includeAudio}
          onCheckedChange={(checked) => onChange("include_audio", checked)}
        />
      </div>
    </>
  )
}

/**
 * AI Quiz (MCQ) specific options
 */
function AIQuizOptions({
  options,
  onChange,
}: {
  options: Record<string, any>
  onChange: (key: string, value: any) => void
}) {
  const questionCount = options.question_count || 10
  const includeExplanations = options.include_explanations ?? true

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="question-count">Number of Questions</Label>
          <Badge variant="secondary">{questionCount}</Badge>
        </div>
        <Slider
          id="question-count"
          min={1}
          max={50}
          step={1}
          value={[questionCount]}
          onValueChange={([value]) => onChange("question_count", value)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>25</span>
          <span>50</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="include-explanations">Include Explanations</Label>
          <p className="text-sm text-muted-foreground">
            Add explanations for correct answers
          </p>
        </div>
        <Switch
          id="include-explanations"
          checked={includeExplanations}
          onCheckedChange={(checked) =>
            onChange("include_explanations", checked)
          }
        />
      </div>
    </>
  )
}

/**
 * Reading Comprehension specific options
 */
function ReadingComprehensionOptions({
  options,
  onChange,
}: {
  options: Record<string, any>
  onChange: (key: string, value: any) => void
}) {
  const questionCount = options.question_count || 5

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="rc-question-count">Number of Questions</Label>
          <Badge variant="secondary">{questionCount}</Badge>
        </div>
        <Slider
          id="rc-question-count"
          min={1}
          max={50}
          step={1}
          value={[questionCount]}
          onValueChange={([value]) => onChange("question_count", value)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>25</span>
          <span>50</span>
        </div>
      </div>
    </>
  )
}

/**
 * Sentence Builder specific options
 */
function SentenceBuilderOptions({
  options,
  onChange,
}: {
  options: Record<string, any>
  onChange: (key: string, value: any) => void
}) {
  const sentenceCount = options.sentence_count || 10
  const includeAudio = options.include_audio ?? true

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="sentence-count">Number of Sentences</Label>
          <Badge variant="secondary">{sentenceCount}</Badge>
        </div>
        <Slider
          id="sentence-count"
          min={1}
          max={50}
          step={1}
          value={[sentenceCount]}
          onValueChange={([value]) => onChange("sentence_count", value)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>25</span>
          <span>50</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="sb-include-audio">Include Audio</Label>
          <p className="text-sm text-muted-foreground">
            Add audio for correct sentences
          </p>
        </div>
        <Switch
          id="sb-include-audio"
          checked={includeAudio}
          onCheckedChange={(checked) => onChange("include_audio", checked)}
        />
      </div>
    </>
  )
}

/**
 * Word Builder specific options
 */
function WordBuilderOptions({
  options,
  onChange,
}: {
  options: Record<string, any>
  onChange: (key: string, value: any) => void
}) {
  const wordCount = options.word_count || 10
  const includeAudio = options.include_audio ?? true

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="word-count">Number of Words</Label>
          <Badge variant="secondary">{wordCount}</Badge>
        </div>
        <Slider
          id="word-count"
          min={1}
          max={50}
          step={1}
          value={[wordCount]}
          onValueChange={([value]) => onChange("word_count", value)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>25</span>
          <span>50</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="wb-include-audio">Include Audio</Label>
          <p className="text-sm text-muted-foreground">
            Add audio pronunciation for words
          </p>
        </div>
        <Switch
          id="wb-include-audio"
          checked={includeAudio}
          onCheckedChange={(checked) => onChange("include_audio", checked)}
        />
      </div>
    </>
  )
}
