/**
 * MixModePlayerAdapter - Player for Mix Mode activities
 *
 * Each question delegates to the same standalone adapter used by its
 * activity type, so the experience is identical to standalone play.
 * Only reading/comprehension uses a two-panel layout (passage + question).
 */

import { BookOpen, Loader2, Pause, Play } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import type { ActivityConfig } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import type { QuestionNavigationState } from "@/types/activity-player"

// Import existing adapters
import { AIQuizPlayerAdapter } from "./AIQuizPlayerAdapter"
import { GrammarFillBlankPlayerAdapter } from "./GrammarFillBlankPlayerAdapter"
import { ListeningFillBlankPlayerAdapter } from "./ListeningFillBlankPlayerAdapter"
import { ListeningSentenceBuilderPlayerAdapter } from "./ListeningSentenceBuilderPlayerAdapter"
import { ListeningWordBuilderPlayerAdapter } from "./ListeningWordBuilderPlayerAdapter"
import { SpeakingOpenResponsePlayerAdapter } from "./SpeakingOpenResponsePlayerAdapter"
import { VocabularyMatchingPlayerAdapter } from "./VocabularyMatchingPlayerAdapter"
import { WritingFillBlankPlayerAdapter } from "./WritingFillBlankPlayerAdapter"
import { WritingFreeResponsePlayerAdapter } from "./WritingFreeResponsePlayerAdapter"
import { WritingSentenceCorrectorPlayerAdapter } from "./WritingSentenceCorrectorPlayerAdapter"
import { generatePassageAudio } from "@/services/passageAudioApi"

// ── Types ──────────────────────────────────────────────────────────────

interface MixModeQuestion {
  question_id: string
  skill_slug: string
  format_slug: string
  question_data: Record<string, any>
}

interface MixModeContent {
  activity_id: string
  questions: MixModeQuestion[]
  difficulty?: string
}

interface MixModePlayerAdapterProps {
  activity: ActivityConfig
  onAnswersChange: (answers: Map<string, string>) => void
  showResults: boolean
  correctAnswers: Set<string>
  initialAnswers?: Map<string, string>
  showCorrectAnswers?: boolean
  currentQuestionIndex?: number
  onQuestionIndexChange?: (index: number) => void
  onNavigationStateChange?: (state: QuestionNavigationState) => void
}

// ── Context Extraction ────────────────────────────────────────────────

/** Extract the left-panel context text + label from question_data based on format */
function getContextInfo(question: MixModeQuestion): {
  text: string | null
  label: string
  audioUrl: string | null
  passageAudioUrl: string | null
  wordTimestamps: any[] | null
} {
  const { format_slug, question_data: d, skill_slug } = question

  switch (format_slug) {
    case "comprehension":
      return {
        text: d.passage || null,
        label: "Reading Passage",
        audioUrl: d.audio_url || null,
        passageAudioUrl: d.passage_audio_url || null,
        wordTimestamps: d.word_timestamps || null,
      }
    case "mcq":
    case "multiple_choice":
      return {
        text: d.context || d.passage || null,
        label: skill_slug === "vocabulary" ? "Vocabulary" : "Question",
        audioUrl: d.audio_url || null,
        passageAudioUrl: null,
        wordTimestamps: null,
      }
    case "fill_blank":
      return {
        text: d.context || null,
        label: skill_slug === "listening" ? "Listening" : skill_slug === "grammar" ? "Grammar" : "Writing",
        audioUrl: d.audio_url || null,
        passageAudioUrl: null,
        wordTimestamps: null,
      }
    case "word_builder":
      return {
        text: d.definition || null,
        label: "Definition",
        audioUrl: d.audio_url || null,
        passageAudioUrl: null,
        wordTimestamps: null,
      }
    case "sentence_builder":
      return {
        text: d.context || null,
        label: "Sentence Builder",
        audioUrl: d.audio_url || null,
        passageAudioUrl: null,
        wordTimestamps: null,
      }
    case "matching":
      return {
        text: d.context || null,
        label: "Vocabulary Matching",
        audioUrl: d.audio_url || null,
        passageAudioUrl: null,
        wordTimestamps: null,
      }
    case "sentence_corrector":
      return {
        text: d.context || null,
        label: "Sentence Corrector",
        audioUrl: d.audio_url || null,
        passageAudioUrl: null,
        wordTimestamps: null,
      }
    case "free_response":
      return {
        text: d.context || d.instructions || null,
        label: "Writing",
        audioUrl: null,
        passageAudioUrl: null,
        wordTimestamps: null,
      }
    case "open_response":
      return {
        text: d.context || d.instructions || null,
        label: "Speaking",
        audioUrl: null,
        passageAudioUrl: null,
        wordTimestamps: null,
      }
    default:
      return { text: null, label: "Activity", audioUrl: null, passageAudioUrl: null, wordTimestamps: null }
  }
}

/** Get a human-readable skill + format label */
function getSkillBadge(question: MixModeQuestion): string {
  const skillLabels: Record<string, string> = {
    vocabulary: "Vocabulary",
    grammar: "Grammar",
    reading: "Reading",
    listening: "Listening",
    writing: "Writing",
    speaking: "Speaking",
  }
  const formatLabels: Record<string, string> = {
    mcq: "Multiple Choice",
    multiple_choice: "Multiple Choice",
    comprehension: "Comprehension",
    fill_blank: "Fill in the Blank",
    word_builder: "Word Builder",
    sentence_builder: "Sentence Builder",
    matching: "Matching",
    sentence_corrector: "Sentence Corrector",
    free_response: "Free Response",
    open_response: "Speaking",
  }
  const skill = skillLabels[question.skill_slug] || question.skill_slug
  const format = formatLabels[question.format_slug] || question.format_slug
  return `${skill} · ${format}`
}


// ── Passage Audio Bar (reading comprehension) ────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function PassageAudioBar({
  passage,
  passageAudioUrl,
}: {
  passage: string
  passageAudioUrl?: string | null
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)

  // Preload audio metadata when a pre-generated URL is available
  useEffect(() => {
    if (!passageAudioUrl || audioDataUrl) return
    const audio = new Audio(passageAudioUrl)
    audioRef.current = audio
    audio.onended = () => setIsPlaying(false)
    audio.ontimeupdate = () => setAudioProgress(audio.currentTime)
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration)
      setAudioDataUrl(passageAudioUrl)
    }
    audio.onerror = () => {
      // Pre-generated URL failed — user can still click to fall back to on-demand
      audioRef.current = null
    }
    // Trigger metadata loading
    audio.preload = "metadata"
    audio.load()

    return () => {
      // Only clean up if we haven't started playing
      if (!audio.currentTime) {
        audio.onended = null
        audio.ontimeupdate = null
        audio.onloadedmetadata = null
        audio.onerror = null
      }
    }
  }, [passageAudioUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadAndPlay = useCallback(async () => {
    if (!passage) return
    // If audio is already preloaded, just play
    if (audioRef.current && audioDataUrl) {
      audioRef.current.play()
      setIsPlaying(true)
      return
    }
    setIsLoading(true)
    try {
      let src: string
      if (passageAudioUrl) {
        // Use pre-generated audio from DCS proxy
        src = passageAudioUrl
      } else {
        // Fallback: on-demand TTS generation
        const result = await generatePassageAudio({ text: passage })
        src = `data:audio/mp3;base64,${result.audio_base64}`
      }
      setAudioDataUrl(src)
      const audio = new Audio(src)
      audioRef.current = audio
      audio.onended = () => setIsPlaying(false)
      audio.ontimeupdate = () => setAudioProgress(audio.currentTime)
      audio.onloadedmetadata = () => setAudioDuration(audio.duration)
      audio.play()
      setIsPlaying(true)
    } catch {
      // Silently fail — bar stays available for retry
    } finally {
      setIsLoading(false)
    }
  }, [passage, passageAudioUrl, audioDataUrl])

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audioDataUrl) {
      loadAndPlay()
      return
    }
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }, [audioDataUrl, isPlaying, loadAndPlay])

  const seekAudio = useCallback(
    (value: number[]) => {
      const audio = audioRef.current
      if (audio && audioDataUrl) {
        audio.currentTime = value[0]
        setAudioProgress(value[0])
      }
    },
    [audioDataUrl],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  if (!passage) return null

  // Before audio is loaded and no pre-generated URL, show a compact load button
  if (!audioDataUrl && !isLoading) {
    return (
      <div className="rounded-xl border bg-gray-50 px-3 py-2.5 shadow-sm dark:bg-gray-900">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full bg-teal-600 text-white hover:bg-teal-700 hover:text-white"
            onClick={toggleAudio}
          >
            <Play className="ml-0.5 h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">Listen to passage</span>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-gray-50 px-3 py-2.5 shadow-sm dark:bg-gray-900">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
          </div>
          <span className="text-xs text-muted-foreground">Loading audio...</span>
        </div>
      </div>
    )
  }

  // Full audio bar with seek slider
  return (
    <div className="rounded-xl border bg-gray-50 px-3 py-2.5 shadow-sm dark:bg-gray-900">
      <div className="flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full bg-teal-600 text-white hover:bg-teal-700 hover:text-white"
          onClick={toggleAudio}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5" />
          )}
        </Button>
        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
          {formatTime(audioProgress)}
        </span>
        <Slider
          value={[audioProgress]}
          max={audioDuration || 1}
          step={0.1}
          onValueChange={seekAudio}
          className="min-w-0 flex-1"
        />
        <span className="w-9 shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {formatTime(audioDuration)}
        </span>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Build an on-demand TTS URL for a given text. Used as fallback when audio_url is missing. */
function ttsUrl(text: string, lang = "en"): string | null {
  if (!text) return null
  return `/api/v1/ai/tts/audio?text=${encodeURIComponent(text)}&lang=${lang}`
}

// ── Synthetic Activity Builders ────────────────────────────────────────

function buildSyntheticActivity(
  question: MixModeQuestion,
  activityId: string,
): { activity: ActivityConfig; idKey: string } | null {
  const { format_slug, question_data, question_id } = question
  const data = question_data

  switch (format_slug) {
    case "mcq":
    case "multiple_choice": {
      return {
        activity: {
          type: "ai_quiz",
          content: {
            quiz_id: activityId,
            questions: [
              {
                question_id: question_id,
                question_text: data.question,
                options: data.options || [],
              },
            ],
            total_questions: 1,
          },
        } as ActivityConfig,
        idKey: question_id,
      }
    }

    case "comprehension": {
      // Passage shown in left panel — only question text goes to the adapter
      return {
        activity: {
          type: "ai_quiz",
          content: {
            quiz_id: activityId,
            questions: [
              {
                question_id: question_id,
                question_text: data.question || data.question_text,
                options: data.options || [],
              },
            ],
            total_questions: 1,
          },
        } as ActivityConfig,
        idKey: question_id,
      }
    }

    case "fill_blank": {
      const skill = question.skill_slug

      // Listening fill blank: audio + display_sentence with word bank
      if (skill === "listening") {
        const audioUrl = data.audio_url || ttsUrl(data.full_sentence || data.display_sentence || "")
        return {
          activity: {
            type: "listening_fill_blank",
            content: {
              activity_id: activityId,
              items: [
                {
                  item_id: question_id,
                  display_sentence: data.display_sentence || data.sentence || "",
                  word_bank: data.word_bank || [],
                  audio_url: audioUrl,
                  audio_status: audioUrl ? "ready" : "pending",
                  difficulty: data.difficulty,
                },
              ],
              total_items: 1,
              difficulty: data.difficulty || "medium",
            },
          } as ActivityConfig,
          idKey: question_id,
        }
      }

      // Grammar fill blank: sentence with word bank + grammar hints
      if (skill === "grammar") {
        return {
          activity: {
            type: "grammar_fill_blank",
            content: {
              activity_id: activityId,
              mode: data.word_bank ? "word_bank" : "free_type",
              items: [
                {
                  item_id: question_id,
                  sentence: data.sentence || "",
                  word_bank: data.word_bank || null,
                  grammar_topic: data.grammar_topic || "",
                  grammar_hint: data.grammar_hint || null,
                  difficulty: data.difficulty,
                },
              ],
              total_items: 1,
              difficulty: data.difficulty || "medium",
            },
          } as ActivityConfig,
          idKey: question_id,
        }
      }

      // Writing fill blank (default)
      return {
        activity: {
          type: "writing_fill_blank",
          content: {
            activity_id: activityId,
            items: [
              {
                item_id: question_id,
                sentence: data.sentence || "",
                context: data.context || "",
                difficulty: data.difficulty,
              },
            ],
            total_items: 1,
            difficulty: data.difficulty || "medium",
          },
        } as ActivityConfig,
        idKey: question_id,
      }
    }

    case "word_builder": {
      // Backend uses correct_word (full model), frontend uses word (public model)
      const word = data.word || data.correct_word || ""
      const letters =
        data.letters ||
        data.scrambled_letters ||
        word.split("").sort(() => Math.random() - 0.5)
      return {
        activity: {
          type: "listening_word_builder",
          content: {
            activity_id: activityId,
            words: [
              {
                item_id: question_id,
                word: word,
                letters: letters,
                letter_count: data.letter_count || word.length || letters.length,
                definition: data.definition || "",
                audio_url: null,
                audio_status: "pending",
              },
            ],
            total_items: 1,
            difficulty: data.difficulty || "medium",
          },
        } as ActivityConfig,
        idKey: question_id,
      }
    }

    case "sentence_builder": {
      const words = data.words || data.scrambled_words || []
      const sbAudioUrl = data.audio_url || ttsUrl(data.correct_sentence || "")
      return {
        activity: {
          type: "listening_sentence_builder",
          content: {
            activity_id: activityId,
            sentences: [
              {
                item_id: question_id,
                words: words,
                word_count: data.word_count || words.length,
                correct_sentence: data.correct_sentence || "",
                audio_url: sbAudioUrl,
                audio_status: sbAudioUrl ? "ready" : "pending",
              },
            ],
            total_items: 1,
            difficulty: data.difficulty || "medium",
          },
        } as ActivityConfig,
        idKey: question_id,
      }
    }

    case "matching": {
      return {
        activity: {
          type: "vocabulary_matching",
          content: {
            activity_id: activityId,
            pairs: [
              {
                pair_id: question_id,
                word: data.word || "",
                definition: data.definition || "",
                audio_url: data.audio_url || ttsUrl(data.word || ""),
              },
            ],
            pair_count: 1,
          },
        } as ActivityConfig,
        idKey: question_id,
      }
    }

    case "sentence_corrector": {
      return {
        activity: {
          type: "writing_sentence_corrector",
          content: {
            activity_id: activityId,
            items: [
              {
                item_id: question_id,
                incorrect_sentence: data.incorrect_sentence || "",
                correct_sentence: data.correct_sentence,
                error_type: data.error_type || "mixed",
                context: data.context || "",
              },
            ],
            total_items: 1,
            difficulty: data.difficulty || "medium",
          },
        } as ActivityConfig,
        idKey: question_id,
      }
    }

    case "free_response": {
      return {
        activity: {
          type: "writing_free_response",
          content: {
            activity_id: activityId,
            items: [
              {
                item_id: question_id,
                prompt: data.prompt || "",
                context: data.context || data.instructions || "",
                min_words: data.min_words || 10,
                max_words: data.max_words || 200,
                difficulty: data.difficulty,
              },
            ],
            total_items: 1,
            difficulty: data.difficulty || "medium",
            requires_manual_grading: true,
          },
        } as ActivityConfig,
        idKey: question_id,
      }
    }

    case "open_response": {
      return {
        activity: {
          type: "speaking_open_response",
          content: {
            activity_id: activityId,
            items: [
              {
                item_id: question_id,
                prompt: data.prompt || "",
                context: data.context || data.instructions || "",
                max_seconds: data.max_seconds || 60,
                difficulty: data.difficulty,
              },
            ],
            total_items: 1,
            difficulty: data.difficulty || "medium",
            requires_manual_grading: true,
          },
        } as ActivityConfig,
        idKey: question_id,
      }
    }

    default:
      return null
  }
}

function getAdapterComponent(formatSlug: string, skillSlug: string) {
  switch (formatSlug) {
    case "mcq":
    case "multiple_choice":
    case "comprehension":
      return AIQuizPlayerAdapter
    case "fill_blank":
      if (skillSlug === "listening") return ListeningFillBlankPlayerAdapter
      if (skillSlug === "grammar") return GrammarFillBlankPlayerAdapter
      return WritingFillBlankPlayerAdapter
    case "word_builder":
      return WordBuilderDelegateAdapter
    case "sentence_builder":
      return SentenceBuilderDelegateAdapter
    case "matching":
      return VocabularyMatchingPlayerAdapter
    case "sentence_corrector":
      return WritingSentenceCorrectorPlayerAdapter
    case "free_response":
      return WritingFreeResponsePlayerAdapter
    case "open_response":
      return SpeakingOpenResponsePlayerAdapter
    default:
      return null
  }
}

function WordBuilderDelegateAdapter(props: any) {
  return <ListeningWordBuilderPlayerAdapter {...props} />
}

function SentenceBuilderDelegateAdapter(props: any) {
  return <ListeningSentenceBuilderPlayerAdapter {...props} />
}

// ── Component ──────────────────────────────────────────────────────────

export function MixModePlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers,
  initialAnswers,
  showCorrectAnswers,
  currentQuestionIndex,
  onQuestionIndexChange: _onQuestionIndexChange,
  onNavigationStateChange,
}: MixModePlayerAdapterProps) {
  const content = (activity as any).content as MixModeContent
  const rawQuestions = content?.questions || []

  // Sort questions by skill group then format so they're navigated group-by-group
  const questions = useMemo(() => {
    const skillOrder = ["vocabulary", "grammar", "reading", "listening", "writing", "speaking"]
    return [...rawQuestions].sort((a, b) => {
      const aSkill = skillOrder.indexOf(a.skill_slug)
      const bSkill = skillOrder.indexOf(b.skill_slug)
      const skillDiff = (aSkill === -1 ? 99 : aSkill) - (bSkill === -1 ? 99 : bSkill)
      if (skillDiff !== 0) return skillDiff
      return a.format_slug.localeCompare(b.format_slug)
    })
  }, [rawQuestions])

  const [answers, setAnswers] = useState<Map<string, string>>(
    () => initialAnswers || new Map(),
  )
  const qIndex = currentQuestionIndex ?? 0
  const [internalIndex, setInternalIndex] = useState(qIndex)
  const currentQ = questions[internalIndex]

  // Mobile: toggle passage visibility
  const [showPassage, setShowPassage] = useState(true)

  // Sync external index
  useEffect(() => {
    if (currentQuestionIndex !== undefined) {
      setInternalIndex(currentQuestionIndex)
    }
  }, [currentQuestionIndex])

  // Report navigation state
  useEffect(() => {
    if (!onNavigationStateChange || questions.length === 0) return
    const answeredIds = Array.from(answers.keys())
    const answeredIndices = questions
      .map((q, i) => (answers.has(q.question_id) ? i : -1))
      .filter((i) => i >= 0)
    onNavigationStateChange({
      currentIndex: internalIndex,
      totalItems: questions.length,
      answeredItemIds: answeredIds,
      answeredIndices,
    })
  }, [internalIndex, answers, questions, onNavigationStateChange])

  // Propagate answers up
  const prevAnswersRef = useRef(answers)
  useEffect(() => {
    if (answers !== prevAnswersRef.current) {
      prevAnswersRef.current = answers
      onAnswersChange(answers)
    }
  }, [answers, onAnswersChange])

  const handleChildAnswersChange = useCallback(
    (childAnswers: Map<string, string>) => {
      setAnswers((prev) => {
        const next = new Map(prev)
        childAnswers.forEach((value, key) => {
          next.set(key, value)
        })
        return next
      })
    },
    [],
  )

  // Memoize synthetic activity — only recompute when question changes
  const currentQuestionId = currentQ?.question_id
  const currentFormatSlug = currentQ?.format_slug

  const synthetic = useMemo(() => {
    if (!currentQ) return null
    return buildSyntheticActivity(currentQ, content.activity_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionId, content.activity_id])

  const currentSkillSlug = currentQ?.skill_slug

  const AdapterComponent = useMemo(
    () => (currentFormatSlug && currentSkillSlug ? getAdapterComponent(currentFormatSlug, currentSkillSlug) : null),
    [currentFormatSlug, currentSkillSlug],
  )

  // Memoize per-question initialAnswers — only recompute when question changes
  const childInitialAnswers = useMemo(() => {
    const m = new Map<string, string>()
    if (!currentQuestionId) return m
    const existing = answers.get(currentQuestionId)
    if (existing !== undefined) m.set(currentQuestionId, existing)
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionId])

  // Memoize per-question correctAnswers
  const childCorrectAnswers = useMemo(() => {
    const s = new Set<string>()
    if (currentQuestionId && correctAnswers.has(currentQuestionId)) {
      s.add(currentQuestionId)
    }
    return s
  }, [currentQuestionId, correctAnswers])

  if (!currentQ) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No questions available.
      </div>
    )
  }

  if (!synthetic || !AdapterComponent) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        Unsupported format: {currentQ.format_slug}
      </div>
    )
  }

  // Only reading/comprehension uses the two-panel layout (passage + question).
  // All other formats render full-width, identical to their standalone player.
  const isComprehension = currentQ.format_slug === "comprehension"
  const contextInfo = isComprehension ? getContextInfo(currentQ) : null
  const hasPassage = isComprehension && !!contextInfo?.text

  // Two-panel layout for reading comprehension
  if (hasPassage) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-4">
        <div className="flex w-full max-w-6xl flex-col gap-4 lg:flex-row lg:gap-6">
          {/* Left Panel: Reading Passage */}
          <div
            className={cn(
              "flex flex-1 flex-col gap-3 lg:max-w-[45%]",
              !showPassage && "hidden lg:flex",
            )}
          >
            <Card className="shadow-lg">
              <CardContent className="p-5">
                <div className="mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {getSkillBadge(currentQ)}
                  </Badge>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                    {contextInfo?.text}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Audio bar below the passage card */}
            <PassageAudioBar
              passage={contextInfo?.text || ""}
              passageAudioUrl={contextInfo?.passageAudioUrl}
            />
          </div>

          {/* Right Panel: Question */}
          <div className="flex flex-1 flex-col gap-4">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowPassage(!showPassage)}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              {showPassage ? "Hide Passage" : "Show Passage"}
            </Button>
            <AdapterComponent
              key={currentQ.question_id}
              activity={synthetic.activity}
              onAnswersChange={handleChildAnswersChange}
              showResults={showResults}
              correctAnswers={childCorrectAnswers}
              initialAnswers={childInitialAnswers}
              showCorrectAnswers={showCorrectAnswers}
              currentQuestionIndex={0}
            />
          </div>
        </div>
      </div>
    )
  }

  // Full-width layout for all other question types — render exactly like standalone
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-2">
      {/* Skill badge */}
      <div className="mb-3 flex items-center justify-center">
        <Badge variant="secondary" className="text-xs">
          {getSkillBadge(currentQ)}
        </Badge>
      </div>

      {/* Delegated adapter — renders its own Card / layout */}
      <div className="w-full">
        <AdapterComponent
          key={currentQ.question_id}
          activity={synthetic.activity}
          onAnswersChange={handleChildAnswersChange}
          showResults={showResults}
          correctAnswers={childCorrectAnswers}
          initialAnswers={childInitialAnswers}
          showCorrectAnswers={showCorrectAnswers}
          currentQuestionIndex={0}
        />
      </div>
    </div>
  )
}
