/**
 * ContentPreviewModal - Preview and edit saved content with full details
 * Story 27.21: Content Library UI - Task 7
 *
 * Displays full content details including all questions/items,
 * source information, and actions (use, edit, delete).
 * All content is visible without collapsing.
 */

import {
  AlertCircle,
  BookOpen,
  Check,
  FileText,
  Headphones,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  useContentLibraryDetail,
  useUpdateContent,
} from "@/hooks/useContentLibrary"
import {
  getActivityTypeColorClasses,
  getActivityTypeConfig,
} from "@/lib/activityTypeConfig"
import { cn } from "@/lib/utils"
import type { ContentItem } from "@/types/content-library"
import { generatePassageAudio } from "@/services/passageAudioApi"
import { PassageAudioPlayer } from "./PassageAudioPlayer"

interface ContentPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: ContentItem | null
  onUse: (content: ContentItem) => void
  onDelete: (content: ContentItem) => void
}

export function ContentPreviewModal({
  open,
  onOpenChange,
  content,
  onUse,
  onDelete,
}: ContentPreviewModalProps) {
  const { toast } = useToast()
  const {
    data: detailedContent,
    isLoading,
    error,
  } = useContentLibraryDetail(content?.id || "")
  const updateMutation = useUpdateContent()

  // Editable state
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [editedContent, setEditedContent] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isRegeneratingAudio, setIsRegeneratingAudio] = useState(false)
  const [generatingLFBAudioIdx, setGeneratingLFBAudioIdx] = useState<number | null>(null)
  const [editingLFBItemIdx, setEditingLFBItemIdx] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom helper
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 100)
  }

  // Reset state when content changes
  useEffect(() => {
    if (detailedContent) {
      setEditedTitle(detailedContent.title)
      setEditedContent(structuredClone(detailedContent.content))
      setHasChanges(false)
      setIsEditing(false)
    }
  }, [detailedContent])

  if (!content) return null

  const config = getActivityTypeConfig(content.activity_type)
  const colorClasses = getActivityTypeColorClasses(config.color)
  const IconComponent = config.icon

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get source display
  const getSourceDisplay = () => {
    if (content.source_type === "book" && content.book_title) {
      return (
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span>{content.book_title}</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span>{content.material_name || "My Material"}</span>
      </div>
    )
  }

  const markChanged = () => setHasChanges(true)

  const handleSave = async () => {
    if (!content || !hasChanges) return
    try {
      await updateMutation.mutateAsync({
        contentId: content.id,
        data: { title: editedTitle, content: editedContent },
      })
      toast({
        title: "Content saved",
        description: "Your changes have been saved successfully.",
      })
      setHasChanges(false)
      setIsEditing(false)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err.response?.data?.detail || "Failed to save changes.",
      })
    }
  }

  // =========================================================================
  // Word Builder handlers
  // =========================================================================
  const updateWord = (idx: number, field: string, value: string) => {
    const words = [...(editedContent.words || [])]
    words[idx] = { ...words[idx], [field]: value }
    // Update letters array when correct_word changes
    if (field === "correct_word") {
      words[idx].letters = value.split("").sort(() => Math.random() - 0.5)
    }
    setEditedContent({ ...editedContent, words })
    markChanged()
  }

  const removeWord = (idx: number) => {
    const words = editedContent.words.filter((_: any, i: number) => i !== idx)
    setEditedContent({ ...editedContent, words })
    markChanged()
  }

  const addWord = () => {
    const words = [
      ...(editedContent.words || []),
      {
        item_id: `word_${Date.now()}`,
        correct_word: "",
        letters: [],
        definition: "",
        audio_url: null,
        vocabulary_id: "",
        cefr_level: "A1",
      },
    ]
    setEditedContent({ ...editedContent, words })
    markChanged()
    scrollToBottom()
  }

  // =========================================================================
  // Sentence Builder handlers
  // =========================================================================
  const updateSentence = (idx: number, field: string, value: string) => {
    const sentences = [...(editedContent.sentences || [])]
    sentences[idx] = { ...sentences[idx], [field]: value }
    setEditedContent({ ...editedContent, sentences })
    markChanged()
  }

  const removeSentence = (idx: number) => {
    const sentences = editedContent.sentences.filter(
      (_: any, i: number) => i !== idx,
    )
    setEditedContent({ ...editedContent, sentences })
    markChanged()
  }

  const addSentence = () => {
    const sentences = [
      ...(editedContent.sentences || []),
      { correct_sentence: "", hint: "" },
    ]
    setEditedContent({ ...editedContent, sentences })
    markChanged()
    scrollToBottom()
  }

  // =========================================================================
  // AI Quiz handlers (uses question_text, options as string[], correct_index)
  // =========================================================================
  const updateAIQuizQuestion = (idx: number, field: string, value: string) => {
    const questions = [...(editedContent.questions || [])]
    questions[idx] = { ...questions[idx], [field]: value }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const updateAIQuizOption = (qIdx: number, optIdx: number, value: string) => {
    const questions = [...(editedContent.questions || [])]
    const options = [...questions[qIdx].options]
    options[optIdx] = value
    const updatedQuestion = { ...questions[qIdx], options }
    // Update correct_answer if this was the correct option
    if (questions[qIdx].correct_index === optIdx) {
      updatedQuestion.correct_answer = value
    }
    questions[qIdx] = updatedQuestion
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const setAIQuizCorrectIndex = (qIdx: number, correctIdx: number) => {
    const questions = [...(editedContent.questions || [])]
    questions[qIdx] = {
      ...questions[qIdx],
      correct_index: correctIdx,
      correct_answer: questions[qIdx].options[correctIdx],
    }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const removeAIQuizQuestion = (idx: number) => {
    const questions = editedContent.questions.filter(
      (_: any, i: number) => i !== idx,
    )
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const addAIQuizQuestion = () => {
    const questions = [...(editedContent.questions || [])]
    questions.push({
      question_id: `q_${Date.now()}`,
      question_text: "",
      options: ["", "", "", ""],
      correct_answer: "",
      correct_index: 0,
      explanation: "",
      source_module_id: 0,
      source_page: null,
      difficulty: "medium",
    })
    setEditedContent({ ...editedContent, questions })
    markChanged()
    scrollToBottom()
  }

  // =========================================================================
  // Vocabulary Quiz handlers
  // =========================================================================
  const updateVocabQuestion = (idx: number, field: string, value: string) => {
    const questions = [...(editedContent.questions || [])]
    questions[idx] = { ...questions[idx], [field]: value }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const updateVocabOption = (qIdx: number, optIdx: number, value: string) => {
    const questions = [...(editedContent.questions || [])]
    const oldValue = questions[qIdx].options[optIdx]
    const options = [...questions[qIdx].options]
    options[optIdx] = value
    const updatedQuestion = { ...questions[qIdx], options }
    if (questions[qIdx].correct_answer === oldValue) {
      updatedQuestion.correct_answer = value
    }
    questions[qIdx] = updatedQuestion
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const setVocabCorrectAnswer = (qIdx: number, optIdx: number) => {
    const questions = [...(editedContent.questions || [])]
    questions[qIdx] = {
      ...questions[qIdx],
      correct_answer: questions[qIdx].options[optIdx],
    }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const removeVocabQuestion = (idx: number) => {
    const questions = editedContent.questions.filter(
      (_: any, i: number) => i !== idx,
    )
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const addVocabQuestion = () => {
    const questions = [...(editedContent.questions || [])]
    questions.push({
      question_id: `q_${Date.now()}`,
      definition: "",
      correct_answer: "",
      options: ["", "", "", ""],
      cefr_level: "A1",
    })
    setEditedContent({ ...editedContent, questions })
    markChanged()
    scrollToBottom()
  }

  // Regenerate passage audio with a different voice
  const handleRegenerateAudio = async (voiceId: string) => {
    const passageText = editedContent.passage || ""
    if (!passageText) return

    try {
      setIsRegeneratingAudio(true)
      const audioResult = await generatePassageAudio({
        text: passageText,
        voice_id: voiceId,
      })
      setEditedContent({
        ...editedContent,
        passage_audio: {
          audio_base64: audioResult.audio_base64,
          word_timestamps: audioResult.word_timestamps,
          duration_seconds: audioResult.duration_seconds,
        },
      })
      markChanged()
    } catch (err: any) {
      toast({
        title: "Audio regeneration failed",
        description: err.response?.data?.detail || err.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsRegeneratingAudio(false)
    }
  }

  // =========================================================================
  // Reading Comprehension handlers (different structure from AI Quiz)
  // Uses: question_text, options (string[]), correct_index, correct_answer
  // =========================================================================
  const updateReadingQuestion = (idx: number, field: string, value: string) => {
    const questions = [...(editedContent.questions || [])]
    questions[idx] = { ...questions[idx], [field]: value }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const updateReadingOption = (qIdx: number, optIdx: number, value: string) => {
    const questions = [...(editedContent.questions || [])]
    const options = [...questions[qIdx].options]
    options[optIdx] = value
    const updatedQuestion = { ...questions[qIdx], options }
    // Update correct_answer if this was the correct option
    if (questions[qIdx].correct_index === optIdx) {
      updatedQuestion.correct_answer = value
    }
    questions[qIdx] = updatedQuestion
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const setReadingCorrectIndex = (qIdx: number, correctIdx: number) => {
    const questions = [...(editedContent.questions || [])]
    questions[qIdx] = {
      ...questions[qIdx],
      correct_index: correctIdx,
      correct_answer: questions[qIdx].options[correctIdx],
    }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const removeReadingQuestion = (idx: number) => {
    const questions = editedContent.questions.filter(
      (_: any, i: number) => i !== idx,
    )
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const addReadingQuestion = () => {
    const questions = [...(editedContent.questions || [])]
    questions.push({
      question_id: `q_${Date.now()}`,
      question_type: "mcq",
      question_text: "",
      options: ["", "", "", ""],
      correct_answer: "",
      correct_index: 0,
      explanation: "",
      passage_reference: "",
    })
    setEditedContent({ ...editedContent, questions })
    markChanged()
    scrollToBottom()
  }

  // =========================================================================
  // Listening Fill-Blank handlers (items with multi-blank + word bank)
  // =========================================================================
  /** Update a single listening fill-blank item with all derived fields */
  const updateLFBItemFull = (idx: number, updatedItem: any) => {
    const items = [...(editedContent.items || [])]
    if (updatedItem.full_sentence && updatedItem.full_sentence !== items[idx]?.full_sentence) {
      const lang = editedContent.language || "en"
      updatedItem.audio_url = `/api/v1/ai/tts/audio?text=${encodeURIComponent(updatedItem.full_sentence)}&lang=${lang}`
      updatedItem.audio_status = "ready"
      updatedItem.audio_data = undefined
    }
    items[idx] = { ...items[idx], ...updatedItem }
    setEditedContent({ ...editedContent, items })
    markChanged()
  }

  /** Generate TTS audio for a specific listening fill-blank item */
  const generateLFBAudio = async (idx: number) => {
    const item = (editedContent.items || [])[idx]
    if (!item?.full_sentence) return
    try {
      setGeneratingLFBAudioIdx(idx)
      const audioResult = await generatePassageAudio({ text: item.full_sentence })
      const items = [...(editedContent.items || [])]
      items[idx] = {
        ...items[idx],
        audio_data: {
          audio_base64: audioResult.audio_base64,
          word_timestamps: audioResult.word_timestamps,
          duration_seconds: audioResult.duration_seconds,
        },
        audio_status: "ready",
      }
      setEditedContent({ ...editedContent, items })
      markChanged()
    } catch {
      // Silently handle - user can retry
    } finally {
      setGeneratingLFBAudioIdx(null)
    }
  }

  const removeLFBItem = (idx: number) => {
    const items = (editedContent.items || []).filter((_: any, i: number) => i !== idx)
    setEditedContent({ ...editedContent, items, total_items: items.length })
    markChanged()
  }

  const addLFBItem = () => {
    const items = [
      ...(editedContent.items || []),
      {
        item_id: `item_${Date.now()}`,
        full_sentence: "",
        display_sentence: "",
        missing_words: [],
        acceptable_answers: [],
        word_bank: [],
        audio_url: null,
        audio_status: "pending",
        difficulty: "A2",
      },
    ]
    setEditedContent({ ...editedContent, items, total_items: items.length })
    markChanged()
    scrollToBottom()
  }

  // Render content based on activity type
  const renderContent = () => {
    if (!detailedContent?.content) return null

    // Listening Sentence Builder - audio + shuffled words
    if (content.activity_type === "listening_sentence_builder") {
      const sentences = editedContent.sentences || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground">
              Sentences ({sentences.length})
            </h4>
          </div>
          {sentences.map((sentence: any, idx: number) => (
            <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {idx + 1}
                </span>
                {isEditing ? (
                  <Input
                    value={sentence.correct_sentence || ""}
                    onChange={(e) => {
                      const newSentences = [...sentences]
                      const text = e.target.value
                      const words = text.split(/\s+/).filter(Boolean)
                      const shuffled = [...words].sort(() => Math.random() - 0.5)
                      if (JSON.stringify(shuffled) === JSON.stringify(words) && words.length >= 2) {
                        [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]]
                      }
                      const lang = editedContent.language || "en"
                      newSentences[idx] = {
                        ...sentence,
                        correct_sentence: text,
                        words: shuffled,
                        word_count: words.length,
                        audio_url: text ? `/api/v1/ai/tts/audio?text=${encodeURIComponent(text)}&lang=${lang}` : null,
                        audio_status: text ? "ready" : "pending",
                      }
                      setEditedContent({ ...editedContent, sentences: newSentences })
                      markChanged()
                    }}
                    placeholder="Enter sentence..."
                    className="h-8 text-sm flex-1"
                  />
                ) : (
                  <span className="font-medium">{sentence.correct_sentence}</span>
                )}
                <Badge variant="outline" className="text-xs">{sentence.word_count || (sentence.words || []).length} words</Badge>
              </div>

              {/* Shuffled word cards */}
              {sentence.words && sentence.words.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Shuffled Words</label>
                  <div className="flex flex-wrap gap-1.5">
                    {sentence.words.map((word: string, wIdx: number) => (
                      <span key={wIdx} className="px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    // Listening Word Builder - audio + scrambled letters
    if (content.activity_type === "listening_word_builder") {
      const words = editedContent.words || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground">
              Words ({words.length})
            </h4>
          </div>
          {words.map((word: any, idx: number) => (
            <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {idx + 1}
                </span>
                {isEditing ? (
                  <Input
                    value={word.correct_word || ""}
                    onChange={(e) => {
                      const newWords = [...words]
                      const text = e.target.value.toLowerCase().trim()
                      const letters = text.split("")
                      const scrambled = [...letters].sort(() => Math.random() - 0.5)
                      if (JSON.stringify(scrambled) === JSON.stringify(letters) && letters.length >= 2) {
                        [scrambled[0], scrambled[1]] = [scrambled[1], scrambled[0]]
                      }
                      const lang = editedContent.language || "en"
                      newWords[idx] = {
                        ...word,
                        correct_word: text,
                        letters: scrambled,
                        letter_count: letters.length,
                        audio_url: text ? `/api/v1/ai/tts/audio?text=${encodeURIComponent(text)}&lang=${lang}` : null,
                        audio_status: text ? "ready" : "pending",
                      }
                      setEditedContent({ ...editedContent, words: newWords })
                      markChanged()
                    }}
                    placeholder="Enter word..."
                    className="h-8 text-sm font-medium w-48"
                  />
                ) : (
                  <span className="font-medium text-lg">{word.correct_word}</span>
                )}
                <Badge variant="outline" className="text-xs">{word.letter_count || (word.letters || []).length} letters</Badge>
              </div>

              {/* Scrambled letter cards */}
              {word.letters && word.letters.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Scrambled Letters</label>
                  <div className="flex flex-wrap gap-1.5">
                    {word.letters.map((letter: string, lIdx: number) => (
                      <div key={lIdx} className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-primary/30 bg-primary/5 text-lg font-bold text-primary uppercase">
                        {letter}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Definition */}
              {isEditing ? (
                <Input
                  value={word.definition || ""}
                  onChange={(e) => {
                    const newWords = [...words]
                    newWords[idx] = { ...word, definition: e.target.value }
                    setEditedContent({ ...editedContent, words: newWords })
                    markChanged()
                  }}
                  placeholder="Definition..."
                  className="h-8 text-sm"
                />
              ) : (
                word.definition && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Definition:</span> {word.definition}
                  </p>
                )
              )}
            </div>
          ))}
        </div>
      )
    }

    // Word Builder - show word with letters in cards
    if (content.activity_type === "word_builder") {
      const words = editedContent.words || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground">
              Words ({words.length})
            </h4>
            {isEditing && (
              <Button size="sm" variant="outline" onClick={addWord}>
                <Plus className="mr-1 h-3 w-3" />
                Add Word
              </Button>
            )}
          </div>
          {words.map((word: any, idx: number) => (
            <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {idx + 1}
                  </span>
                  {isEditing ? (
                    <Input
                      value={word.correct_word || ""}
                      onChange={(e) =>
                        updateWord(idx, "correct_word", e.target.value)
                      }
                      placeholder="Enter word..."
                      className="h-8 text-sm font-medium w-48"
                    />
                  ) : (
                    <span className="font-medium text-lg">
                      {word.correct_word}
                    </span>
                  )}
                  {word.cefr_level && (
                    <Badge variant="outline" className="text-xs">
                      {word.cefr_level}
                    </Badge>
                  )}
                </div>
                {isEditing && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeWord(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Letter cards - show correct_word letters */}
              {word.correct_word && (
                <div className="flex flex-wrap gap-1.5">
                  {word.correct_word
                    .split("")
                    .map((letter: string, letterIdx: number) => (
                      <div
                        key={letterIdx}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-primary/30 bg-primary/5 text-lg font-bold text-primary uppercase"
                      >
                        {letter}
                      </div>
                    ))}
                </div>
              )}

              {/* Definition */}
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={word.definition || ""}
                    onChange={(e) =>
                      updateWord(idx, "definition", e.target.value)
                    }
                    placeholder="Definition..."
                    className="h-8 text-sm"
                  />
                </div>
              ) : (
                word.definition && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Definition:</span>{" "}
                    {word.definition}
                  </p>
                )
              )}
            </div>
          ))}
        </div>
      )
    }

    // Sentence Builder - show words in cards
    if (content.activity_type === "sentence_builder") {
      const sentences = editedContent.sentences || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground">
              Sentences ({sentences.length})
            </h4>
            {isEditing && (
              <Button size="sm" variant="outline" onClick={addSentence}>
                <Plus className="mr-1 h-3 w-3" />
                Add Sentence
              </Button>
            )}
          </div>
          {sentences.map((sentence: any, idx: number) => (
            <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {idx + 1}
                  </span>
                  {isEditing ? (
                    <Input
                      value={sentence.correct_sentence || ""}
                      onChange={(e) =>
                        updateSentence(idx, "correct_sentence", e.target.value)
                      }
                      placeholder="Enter sentence..."
                      className="h-8 text-sm flex-1"
                    />
                  ) : (
                    <span className="font-medium">
                      {sentence.correct_sentence}
                    </span>
                  )}
                </div>
                {isEditing && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeSentence(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Word cards */}
              {sentence.correct_sentence && (
                <div className="flex flex-wrap gap-2">
                  {sentence.correct_sentence
                    .split(/\s+/)
                    .map((word: string, wordIdx: number) => (
                      <div
                        key={wordIdx}
                        className="px-3 py-1.5 rounded-lg border-2 border-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 dark:border-cyan-700 text-sm font-medium"
                      >
                        {word}
                      </div>
                    ))}
                </div>
              )}

              {/* Hint */}
              {isEditing ? (
                <Input
                  value={sentence.hint || ""}
                  onChange={(e) => updateSentence(idx, "hint", e.target.value)}
                  placeholder="Hint (optional)..."
                  className="h-8 text-sm"
                />
              ) : (
                sentence.hint && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Hint:</span> {sentence.hint}
                  </p>
                )
              )}
            </div>
          ))}
        </div>
      )
    }

    // AI Quiz - show all questions and options expanded
    // Uses: question_text, options (string[]), correct_index, correct_answer
    if (content.activity_type === "ai_quiz") {
      const questions = editedContent.questions || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground">
              Questions ({questions.length})
            </h4>
            {isEditing && (
              <Button size="sm" variant="outline" onClick={addAIQuizQuestion}>
                <Plus className="mr-1 h-3 w-3" />
                Add Question
              </Button>
            )}
          </div>
          {questions.map((q: any, qIdx: number) => (
            <div key={qIdx} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary mt-1">
                  {qIdx + 1}
                </span>
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                      <Textarea
                        value={q.question_text || ""}
                        onChange={(e) =>
                          updateAIQuizQuestion(
                            qIdx,
                            "question_text",
                            e.target.value,
                          )
                        }
                        placeholder="Enter question..."
                        rows={2}
                        className="resize-none text-sm flex-1"
                      />
                    ) : (
                      <p className="font-medium text-sm flex-1">
                        {q.question_text}
                      </p>
                    )}
                    {q.difficulty && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {q.difficulty}
                      </Badge>
                    )}
                  </div>

                  {/* Options - array of strings */}
                  <RadioGroup
                    value={String(q.correct_index ?? -1)}
                    onValueChange={(val) =>
                      isEditing &&
                      setAIQuizCorrectIndex(qIdx, parseInt(val, 10))
                    }
                    disabled={!isEditing}
                  >
                    {(q.options || []).map((opt: string, optIdx: number) => {
                      const isCorrect = optIdx === q.correct_index
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                            isCorrect
                              ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isEditing && (
                            <RadioGroupItem
                              value={String(optIdx)}
                              id={`q${qIdx}-opt${optIdx}`}
                            />
                          )}
                          <span className="font-medium w-5">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          {isEditing ? (
                            <Input
                              value={opt || ""}
                              onChange={(e) =>
                                updateAIQuizOption(qIdx, optIdx, e.target.value)
                              }
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 h-7 text-sm"
                            />
                          ) : (
                            <span className="flex-1">{opt}</span>
                          )}
                          {!isEditing && isCorrect && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      )
                    })}
                  </RadioGroup>

                  {/* Explanation */}
                  {!isEditing && q.explanation && (
                    <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                      <span className="font-medium">Explanation:</span>{" "}
                      {q.explanation}
                    </div>
                  )}
                </div>
                {isEditing && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeAIQuizQuestion(qIdx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Vocabulary Quiz - show all questions and options expanded
    if (content.activity_type === "vocabulary_quiz") {
      const questions = editedContent.questions || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground">
              Questions ({questions.length})
            </h4>
            {isEditing && (
              <Button size="sm" variant="outline" onClick={addVocabQuestion}>
                <Plus className="mr-1 h-3 w-3" />
                Add Question
              </Button>
            )}
          </div>
          {questions.map((q: any, qIdx: number) => {
            const correctIdx = (q.options || []).findIndex(
              (opt: string) => opt === q.correct_answer,
            )
            return (
              <div
                key={qIdx}
                className="rounded-lg border bg-card p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary mt-1">
                    {qIdx + 1}
                  </span>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      {isEditing ? (
                        <Textarea
                          value={q.definition || ""}
                          onChange={(e) =>
                            updateVocabQuestion(
                              qIdx,
                              "definition",
                              e.target.value,
                            )
                          }
                          placeholder="Enter definition..."
                          rows={2}
                          className="resize-none text-sm flex-1"
                        />
                      ) : (
                        <p className="font-medium text-sm flex-1">
                          {q.definition}
                        </p>
                      )}
                      {q.cefr_level && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {q.cefr_level}
                        </Badge>
                      )}
                    </div>

                    {/* Options */}
                    <RadioGroup
                      value={String(correctIdx)}
                      onValueChange={(val) =>
                        isEditing &&
                        setVocabCorrectAnswer(qIdx, parseInt(val, 10))
                      }
                      disabled={!isEditing}
                    >
                      {(q.options || []).map((opt: string, optIdx: number) => {
                        const isCorrect = opt === q.correct_answer
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                              isCorrect
                                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isEditing && (
                              <RadioGroupItem
                                value={String(optIdx)}
                                id={`vq${qIdx}-opt${optIdx}`}
                              />
                            )}
                            <span className="font-medium w-5">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            {isEditing ? (
                              <Input
                                value={opt || ""}
                                onChange={(e) =>
                                  updateVocabOption(
                                    qIdx,
                                    optIdx,
                                    e.target.value,
                                  )
                                }
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                className="flex-1 h-7 text-sm"
                              />
                            ) : (
                              <span className="flex-1">{opt}</span>
                            )}
                            {!isEditing && isCorrect && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        )
                      })}
                    </RadioGroup>
                  </div>
                  {isEditing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeVocabQuestion(qIdx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    // Reading Comprehension - show passage and all questions expanded
    // Uses: question_text, options (string[]), correct_index
    if (content.activity_type === "reading_comprehension") {
      const passage = editedContent.passage || ""
      const questions = editedContent.questions || []
      return (
        <div className="space-y-4">
          {/* Passage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground">
                Passage
              </h4>
              {!isEditing && editedContent.passage_audio && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit text
                </button>
              )}
            </div>
            {isEditing ? (
              <>
                <Textarea
                  value={passage}
                  onChange={(e) => {
                    if (editedContent.passage_audio) {
                      // Remove stale audio when text changes
                      const { passage_audio: _, ...rest } = editedContent
                      setEditedContent({ ...rest, passage: e.target.value })
                    } else {
                      setEditedContent({ ...editedContent, passage: e.target.value })
                    }
                    markChanged()
                  }}
                  rows={6}
                  placeholder="Enter the reading passage..."
                  className="resize-none"
                />
                {!editedContent.passage_audio && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Audio removed — regenerate after saving your edits.
                  </div>
                )}
              </>
            ) : editedContent.passage_audio ? (
              <PassageAudioPlayer
                audioBase64={editedContent.passage_audio.audio_base64}
                wordTimestamps={editedContent.passage_audio.word_timestamps}
                durationSeconds={editedContent.passage_audio.duration_seconds}
                onRegenerateAudio={handleRegenerateAudio}
                isRegenerating={isRegeneratingAudio}
              />
            ) : (
              <div className="rounded-lg border bg-card p-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {passage}
                </p>
              </div>
            )}
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground">
                Questions ({questions.length})
              </h4>
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addReadingQuestion}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Question
                </Button>
              )}
            </div>
            {questions.map((q: any, qIdx: number) => (
              <div
                key={qIdx}
                className="rounded-lg border bg-card p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary mt-1">
                    {qIdx + 1}
                  </span>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      {isEditing ? (
                        <Textarea
                          value={q.question_text || ""}
                          onChange={(e) =>
                            updateReadingQuestion(
                              qIdx,
                              "question_text",
                              e.target.value,
                            )
                          }
                          placeholder="Enter question..."
                          rows={2}
                          className="resize-none text-sm flex-1"
                        />
                      ) : (
                        <p className="font-medium text-sm flex-1">
                          {q.question_text}
                        </p>
                      )}
                      {q.question_type && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {q.question_type}
                        </Badge>
                      )}
                    </div>

                    {/* Options - array of strings */}
                    {q.options && q.options.length > 0 && (
                      <RadioGroup
                        value={String(q.correct_index ?? -1)}
                        onValueChange={(val) =>
                          isEditing &&
                          setReadingCorrectIndex(qIdx, parseInt(val, 10))
                        }
                        disabled={!isEditing}
                      >
                        {q.options.map((opt: string, optIdx: number) => {
                          const isCorrect = optIdx === q.correct_index
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                                isCorrect
                                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {isEditing && (
                                <RadioGroupItem
                                  value={String(optIdx)}
                                  id={`rc${qIdx}-opt${optIdx}`}
                                />
                              )}
                              <span className="font-medium w-5">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              {isEditing ? (
                                <Input
                                  value={opt || ""}
                                  onChange={(e) =>
                                    updateReadingOption(
                                      qIdx,
                                      optIdx,
                                      e.target.value,
                                    )
                                  }
                                  placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                  className="flex-1 h-7 text-sm"
                                />
                              ) : (
                                <span className="flex-1">{opt}</span>
                              )}
                              {!isEditing && isCorrect && (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          )
                        })}
                      </RadioGroup>
                    )}

                    {/* Explanation */}
                    {!isEditing && q.explanation && (
                      <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                        <span className="font-medium">Explanation:</span>{" "}
                        {q.explanation}
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeReadingQuestion(qIdx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Listening Fill-Blank — multi-blank items with word bank
    if (content.activity_type === "listening_fill_blank") {
      const items = editedContent.items || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground">
              Items ({items.length})
            </h4>
            {isEditing && (
              <Button size="sm" variant="outline" onClick={() => { addLFBItem(); setEditingLFBItemIdx(items.length) }}>
                <Plus className="mr-1 h-3 w-3" />
                Add Item
              </Button>
            )}
          </div>
          {items.map((item: any, idx: number) => {
            const fullSentence: string = item.full_sentence || ""
            const missingWords: string[] = item.missing_words || []
            const missingSet = new Set(missingWords.map((w: string) => w.toLowerCase()))
            const blankCount = missingWords.length
            const isEditingThis = isEditing && editingLFBItemIdx === idx

            // ---- READ-ONLY CARD ----
            if (!isEditingThis) {
              return (
                <div key={item.item_id || idx} className="space-y-2 p-4 rounded-lg border bg-card group">
                  {/* Header: #N | N blanks + edit/delete */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {blankCount} blank{blankCount !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {isEditing && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLFBItemIdx(idx)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeLFBItem(idx)}
                          disabled={items.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Audio section — full_sentence */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Audio (full sentence spoken to student)
                    </label>
                    {generatingLFBAudioIdx === idx ? (
                      <div className="flex items-center gap-3 p-4 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10">
                        <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                        <p className="text-sm text-teal-700 dark:text-teal-300">
                          Generating audio...
                        </p>
                      </div>
                    ) : item.audio_data ? (
                      <PassageAudioPlayer
                        audioBase64={item.audio_data.audio_base64}
                        wordTimestamps={item.audio_data.word_timestamps}
                        durationSeconds={item.audio_data.duration_seconds}
                        onRegenerateAudio={(_v) => generateLFBAudio(idx)}
                        isRegenerating={generatingLFBAudioIdx === idx}
                      />
                    ) : (
                      <>
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <p className="text-sm leading-relaxed">
                            {fullSentence}
                          </p>
                        </div>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateLFBAudio(idx)}
                            disabled={generatingLFBAudioIdx !== null}
                            className="text-teal-600 border-teal-300 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-700 dark:hover:bg-teal-900/20"
                          >
                            <Headphones className="h-4 w-4 mr-1.5" />
                            Generate Audio
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Display sentence with blanks highlighted */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Student sees
                    </label>
                    <p className="text-sm font-medium leading-relaxed">
                      {(item.display_sentence || fullSentence || "").split("_______").map((part: string, pIdx: number, arr: string[]) => (
                        <span key={pIdx}>
                          {part}
                          {pIdx < arr.length - 1 && (
                            <span className="inline-block mx-1 px-3 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 text-xs font-semibold">
                              blank {pIdx + 1}
                            </span>
                          )}
                        </span>
                      ))}
                    </p>
                  </div>

                  {/* Word bank chips */}
                  {item.word_bank && item.word_bank.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Word Bank
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {item.word_bank.map((word: string, wIdx: number) => {
                          const isCorrect = missingSet.has(word.toLowerCase())
                          return (
                            <span
                              key={wIdx}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-xs font-medium border",
                                isCorrect
                                  ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600"
                              )}
                            >
                              {word}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Answers — per-blank */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Answers:</span>
                    {missingWords.map((word: string, wIdx: number) => (
                      <Badge key={wIdx} variant="outline" className="text-green-600 border-green-300">
                        {wIdx + 1}. {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            }

            // ---- EDIT MODE ----
            const tokens: string[] = fullSentence.match(/[\w'-]+|[^\w\s]|\s+/g) || []
            const rebuildFromSelection = (newFull: string, newMissing: string[]) => {
              const newMissingLower = new Set(newMissing.map(w => w.toLowerCase()))
              let display = newFull
              for (const word of newMissing) {
                if (!word) continue
                const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
                display = display.replace(regex, '_______')
              }
              const oldCorrect = new Set((item.missing_words || []).map((w: string) => w.toLowerCase()))
              const distractors = (item.word_bank || []).filter(
                (w: string) => !oldCorrect.has(w.toLowerCase()) && !newMissingLower.has(w.toLowerCase())
              )
              updateLFBItemFull(idx, {
                full_sentence: newFull, missing_words: newMissing, display_sentence: display,
                word_bank: [...newMissing, ...distractors], acceptable_answers: newMissing.map((w: string) => [w]),
              })
            }
            const toggleWord = (word: string) => {
              const currentMissing: string[] = item.missing_words || []
              const isSelected = currentMissing.some(w => w.toLowerCase() === word.toLowerCase())
              rebuildFromSelection(fullSentence, isSelected
                ? currentMissing.filter(w => w.toLowerCase() !== word.toLowerCase())
                : [...currentMissing, word])
            }
            const distractors = (item.word_bank || []).filter((w: string) => !missingSet.has(w.toLowerCase()))

            return (
              <div key={item.item_id || idx} className="rounded-lg border p-4 space-y-3">
                {/* Editable sentence */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Sentence</label>
                  <Textarea value={fullSentence} onChange={(e) => {
                    const newFull = e.target.value
                    const kept = (item.missing_words || []).filter((w: string) =>
                      new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(newFull))
                    rebuildFromSelection(newFull, kept)
                  }} rows={2} placeholder="Type the full sentence here..." className="resize-none text-sm" />
                </div>

                {/* Word picker */}
                {fullSentence.trim() && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Tap words to mark as blanks</label>
                    <div className="flex flex-wrap gap-1 p-3 rounded-lg border bg-card min-h-[44px]">
                      {tokens.map((token, tIdx) => {
                        const isWord = /^[\w'-]+$/.test(token)
                        if (!isWord) return <span key={tIdx} className="text-sm">{token}</span>
                        const isBlank = missingSet.has(token.toLowerCase())
                        return (
                          <button key={tIdx} type="button" onClick={() => toggleWord(token)}
                            className={cn(
                              "px-2 py-0.5 rounded text-sm font-medium transition-all border cursor-pointer",
                              isBlank
                                ? "bg-teal-500 text-white border-teal-600 shadow-sm"
                                : "bg-transparent border-transparent hover:bg-muted hover:border-muted-foreground/20"
                            )}>
                            {token}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {blankCount} blank(s) selected
                      {blankCount > 0 && (
                        <> — {missingWords.join(", ")}</>
                      )}
                    </p>
                  </div>
                )}

                {/* Distractors */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    Distractors <span className="font-normal text-muted-foreground">(extra wrong words for word bank, comma-separated)</span>
                  </label>
                  <Input value={distractors.join(", ")} onChange={(e) => {
                    const newD = e.target.value.split(",").map((w: string) => w.trim()).filter(Boolean)
                    updateLFBItemFull(idx, { word_bank: [...(item.missing_words || []), ...newD] })
                  }} placeholder="dog, park, house" />
                </div>

                {/* Word bank preview */}
                {(item.word_bank || []).length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Word Bank Preview</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(item.word_bank || []).map((word: string, wIdx: number) => {
                        const isCorrect = missingSet.has(word.toLowerCase())
                        return (
                          <span
                            key={wIdx}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-xs font-medium border",
                              isCorrect
                                ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-muted-foreground"
                            )}
                          >
                            {word}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Cancel + Save Changes buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingLFBItemIdx(null)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingLFBItemIdx(null)
                      if (fullSentence.trim() && !item.audio_data) generateLFBAudio(idx)
                    }}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Save Changes
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    // Fallback for unknown types
    return (
      <pre className="rounded-lg bg-muted p-4 text-sm overflow-auto">
        {JSON.stringify(editedContent, null, 2)}
      </pre>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${colorClasses.bg}`}>
              <IconComponent className={`h-6 w-6 ${colorClasses.text}`} />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => {
                    setEditedTitle(e.target.value)
                    markChanged()
                  }}
                  className="text-lg font-semibold"
                />
              ) : (
                <DialogTitle>{content.title}</DialogTitle>
              )}
              <DialogDescription className="flex items-center gap-2">
                {config.label}
                {content.is_shared && (
                  <Badge variant="secondary" className="text-xs">
                    Shared
                  </Badge>
                )}
                {hasChanges && (
                  <Badge variant="outline" className="text-xs text-amber-600">
                    Unsaved changes
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator className="shrink-0" />

        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="space-y-4 pr-4">
            {/* Metadata */}
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source:</span>
                {getSourceDisplay()}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span>{content.item_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(content.created_at)}</span>
              </div>
              {content.used_in_assignments > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Used:</span>
                  <Badge variant="outline" className="text-xs">
                    {content.used_in_assignments}x in assignments
                  </Badge>
                </div>
              )}
              {content.is_shared && content.created_by && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created by:</span>
                  <span>{content.created_by.name}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Content */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load content details. Please try again.
                </AlertDescription>
              </Alert>
            )}

            {!isLoading && !error && detailedContent && renderContent()}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 pt-4 border-t shrink-0">
          <Button
            variant="destructive"
            onClick={() => {
              onDelete(content)
              onOpenChange(false)
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>

          <div className="flex-1" />

          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditedTitle(detailedContent?.title || "")
                  setEditedContent(
                    structuredClone(detailedContent?.content || {}),
                  )
                  setHasChanges(false)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  onUse(content)
                  onOpenChange(false)
                }}
              >
                Use in Assignment
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
