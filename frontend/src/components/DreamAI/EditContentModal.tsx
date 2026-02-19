/**
 * EditContentModal - Edit saved content including questions and options
 * Story 27.21: Content Library UI
 *
 * Allows editing content title and individual questions/items.
 */

import { AlertCircle, Check, Eye, Headphones, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

interface EditContentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: ContentItem | null
  onSaved?: () => void
}

export function EditContentModal({
  open,
  onOpenChange,
  content,
  onSaved,
}: EditContentModalProps) {
  const { toast } = useToast()
  const {
    data: detailedContent,
    isLoading,
    error,
  } = useContentLibraryDetail(content?.id || "")
  const updateMutation = useUpdateContent()

  // Local state for editing
  const [title, setTitle] = useState("")
  const [editedContent, setEditedContent] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isRegeneratingAudio, setIsRegeneratingAudio] = useState(false)
  // Track which passage is in text-edit mode (index for multi, "single" for single, null = none)
  const [editingPassage, setEditingPassage] = useState<number | "single" | null>(null)
  // Track which listening question's audio text is being edited
  const [editingAudioTextIdx, setEditingAudioTextIdx] = useState<number | null>(null)
  // Track which LFB item audio is generating
  const [generatingLFBAudioIdx, setGeneratingLFBAudioIdx] = useState<number | null>(null)
  // Track which item is in edit mode per type (null = all read-only)
  const [editingLFBItemIdx, setEditingLFBItemIdx] = useState<number | null>(null)
  const [editingLSBIdx, setEditingLSBIdx] = useState<number | null>(null)
  const [editingLWBIdx, setEditingLWBIdx] = useState<number | null>(null)
  const [generatingLSBAudioIdx, setGeneratingLSBAudioIdx] = useState<number | null>(null)
  const [generatingLWBAudioIdx, setGeneratingLWBAudioIdx] = useState<number | null>(null)

  // Reset state when content changes
  useEffect(() => {
    if (detailedContent) {
      setTitle(detailedContent.title)
      setEditedContent(structuredClone(detailedContent.content))
      setHasChanges(false)
      setEditingPassage(null)
      setEditingAudioTextIdx(null)
      setEditingLSBIdx(null)
      setEditingLWBIdx(null)
    }
  }, [detailedContent])

  if (!content) return null

  const config = getActivityTypeConfig(content.activity_type)
  const colorClasses = getActivityTypeColorClasses(config.color)
  const IconComponent = config.icon

  const handleSave = async () => {
    if (!content || !hasChanges) return

    try {
      await updateMutation.mutateAsync({
        contentId: content.id,
        data: {
          title,
          content: editedContent,
        },
      })
      toast({
        title: "Content saved",
        description: "Your changes have been saved successfully.",
      })
      onSaved?.()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description:
          err.response?.data?.detail ||
          "Failed to save changes. Please try again.",
      })
    }
  }

  const markChanged = () => {
    setHasChanges(true)
  }

  // =============================================================================
  // Vocabulary Quiz handlers (uses definition, options as strings, correct_answer)
  // =============================================================================
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
    // If this option was the correct answer, update correct_answer too
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
    const correctAnswer = questions[qIdx].options[optIdx]
    questions[qIdx] = { ...questions[qIdx], correct_answer: correctAnswer }
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

  // =============================================================================
  // AI Quiz handlers (uses question, options with is_correct, explanation)
  // =============================================================================
  const updateAIQuestion = (idx: number, field: string, value: string) => {
    const questions = [...(editedContent.questions || [])]
    questions[idx] = { ...questions[idx], [field]: value }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const updateAIOption = (qIdx: number, optIdx: number, text: string) => {
    const questions = [...(editedContent.questions || [])]
    const options = [...questions[qIdx].options]
    options[optIdx] = { ...options[optIdx], text }
    questions[qIdx] = { ...questions[qIdx], options }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const setAICorrectOption = (qIdx: number, correctIdx: number) => {
    const questions = [...(editedContent.questions || [])]
    const options = questions[qIdx].options.map((opt: any, idx: number) => ({
      ...opt,
      is_correct: idx === correctIdx,
    }))
    questions[qIdx] = { ...questions[qIdx], options }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const addAIOption = (qIdx: number) => {
    const questions = [...(editedContent.questions || [])]
    const options = [
      ...questions[qIdx].options,
      { text: "", is_correct: false },
    ]
    questions[qIdx] = { ...questions[qIdx], options }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const removeAIOption = (qIdx: number, optIdx: number) => {
    const questions = [...(editedContent.questions || [])]
    const options = questions[qIdx].options.filter(
      (_: any, idx: number) => idx !== optIdx,
    )
    questions[qIdx] = { ...questions[qIdx], options }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const addAIQuestion = () => {
    const questions = [...(editedContent.questions || [])]
    questions.push({
      question: "",
      options: [
        { text: "", is_correct: true },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
      explanation: "",
    })
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const removeAIQuestion = (idx: number) => {
    const questions = editedContent.questions.filter(
      (_: any, i: number) => i !== idx,
    )
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  // =============================================================================
  // Sentence handlers
  // =============================================================================
  const updateSentence = (idx: number, field: string, value: string) => {
    const sentences = [...(editedContent.sentences || [])]
    sentences[idx] = { ...sentences[idx], [field]: value }
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
  }

  const removeSentence = (idx: number) => {
    const sentences = editedContent.sentences.filter(
      (_: any, i: number) => i !== idx,
    )
    setEditedContent({ ...editedContent, sentences })
    markChanged()
  }

  // =============================================================================
  // Word handlers
  // =============================================================================
  const updateWord = (idx: number, field: string, value: string) => {
    const words = [...(editedContent.words || [])]
    words[idx] = { ...words[idx], [field]: value }
    setEditedContent({ ...editedContent, words })
    markChanged()
  }

  const addWord = () => {
    const words = [
      ...(editedContent.words || []),
      { word: "", hint: "", definition: "" },
    ]
    setEditedContent({ ...editedContent, words })
    markChanged()
  }

  const removeWord = (idx: number) => {
    const words = editedContent.words.filter((_: any, i: number) => i !== idx)
    setEditedContent({ ...editedContent, words })
    markChanged()
  }

  // =============================================================================
  // Reading comprehension handlers (uses question_text, plain string options, correct_index)
  // =============================================================================
  const updatePassage = (value: string, passageIdx?: number) => {
    if (passageIdx !== undefined && editedContent.passages) {
      const passages = [...editedContent.passages]
      const { passage_audio: _, ...rest } = passages[passageIdx]
      passages[passageIdx] = { ...rest, passage: value }
      setEditedContent({ ...editedContent, passages })
    } else {
      const { passage_audio: _, ...rest } = editedContent
      setEditedContent({ ...rest, passage: value })
    }
    markChanged()
  }

  const handleRegenerateAudio = async (voiceId: string, passageIdx?: number) => {
    const text = passageIdx !== undefined
      ? editedContent.passages?.[passageIdx]?.passage
      : editedContent.passage
    if (!text) return

    try {
      setIsRegeneratingAudio(true)
      const audioResult = await generatePassageAudio({ text, voice_id: voiceId })
      const audioData = {
        audio_base64: audioResult.audio_base64,
        word_timestamps: audioResult.word_timestamps,
        duration_seconds: audioResult.duration_seconds,
      }

      if (passageIdx !== undefined && editedContent.passages) {
        const passages = [...editedContent.passages]
        passages[passageIdx] = { ...passages[passageIdx], passage_audio: audioData }
        setEditedContent({ ...editedContent, passages })
      } else {
        setEditedContent({ ...editedContent, passage_audio: audioData })
      }
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

  const updateRCQuestion = (qIdx: number, field: string, value: string, passageIdx?: number) => {
    if (passageIdx !== undefined && editedContent.passages) {
      const passages = [...editedContent.passages]
      const questions = [...(passages[passageIdx].questions || [])]
      questions[qIdx] = { ...questions[qIdx], [field]: value }
      passages[passageIdx] = { ...passages[passageIdx], questions }
      setEditedContent({ ...editedContent, passages })
    } else {
      const questions = [...(editedContent.questions || [])]
      questions[qIdx] = { ...questions[qIdx], [field]: value }
      setEditedContent({ ...editedContent, questions })
    }
    markChanged()
  }

  const updateRCOption = (qIdx: number, optIdx: number, text: string, passageIdx?: number) => {
    if (passageIdx !== undefined && editedContent.passages) {
      const passages = [...editedContent.passages]
      const questions = [...(passages[passageIdx].questions || [])]
      const options = [...(questions[qIdx].options || [])]
      options[optIdx] = text
      questions[qIdx] = { ...questions[qIdx], options }
      passages[passageIdx] = { ...passages[passageIdx], questions }
      setEditedContent({ ...editedContent, passages })
    } else {
      const questions = [...(editedContent.questions || [])]
      const options = [...(questions[qIdx].options || [])]
      options[optIdx] = text
      questions[qIdx] = { ...questions[qIdx], options }
      setEditedContent({ ...editedContent, questions })
    }
    markChanged()
  }

  const setRCCorrectOption = (qIdx: number, correctIdx: number, passageIdx?: number) => {
    if (passageIdx !== undefined && editedContent.passages) {
      const passages = [...editedContent.passages]
      const questions = [...(passages[passageIdx].questions || [])]
      questions[qIdx] = {
        ...questions[qIdx],
        correct_index: correctIdx,
        correct_answer: (questions[qIdx].options || [])[correctIdx] || "",
      }
      passages[passageIdx] = { ...passages[passageIdx], questions }
      setEditedContent({ ...editedContent, passages })
    } else {
      const questions = [...(editedContent.questions || [])]
      questions[qIdx] = {
        ...questions[qIdx],
        correct_index: correctIdx,
        correct_answer: (questions[qIdx].options || [])[correctIdx] || "",
      }
      setEditedContent({ ...editedContent, questions })
    }
    markChanged()
  }

  const removeRCQuestion = (qIdx: number, passageIdx?: number) => {
    if (passageIdx !== undefined && editedContent.passages) {
      const passages = [...editedContent.passages]
      const questions = (passages[passageIdx].questions || []).filter(
        (_: any, i: number) => i !== qIdx,
      )
      passages[passageIdx] = { ...passages[passageIdx], questions }
      setEditedContent({ ...editedContent, passages })
    } else {
      const questions = (editedContent.questions || []).filter(
        (_: any, i: number) => i !== qIdx,
      )
      setEditedContent({ ...editedContent, questions })
    }
    markChanged()
  }

  const addRCQuestion = (passageIdx?: number) => {
    const newQ = {
      question_id: crypto.randomUUID(),
      question_type: "mcq",
      question_text: "",
      options: ["", "", "", ""],
      correct_answer: "",
      correct_index: 0,
      explanation: "",
      passage_reference: "",
    }
    if (passageIdx !== undefined && editedContent.passages) {
      const passages = [...editedContent.passages]
      const questions = [...(passages[passageIdx].questions || []), newQ]
      passages[passageIdx] = { ...passages[passageIdx], questions }
      setEditedContent({ ...editedContent, passages })
    } else {
      const questions = [...(editedContent.questions || []), newQ]
      setEditedContent({ ...editedContent, questions })
    }
    markChanged()
  }

  // =============================================================================
  // Listening Quiz handlers
  // =============================================================================
  const updateListeningQuestion = (qIdx: number, field: string, value: any) => {
    const questions = [...(editedContent.questions || [])]
    questions[qIdx] = { ...questions[qIdx], [field]: value }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const updateListeningOption = (qIdx: number, optIdx: number, text: string) => {
    const questions = [...(editedContent.questions || [])]
    const options = [...(questions[qIdx].options || [])]
    options[optIdx] = text
    // Also update correct_answer if this was the correct option
    const updated: any = { ...questions[qIdx], options }
    if (questions[qIdx].correct_index === optIdx) {
      updated.correct_answer = text
    }
    questions[qIdx] = updated
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const setListeningCorrectOption = (qIdx: number, correctIdx: number) => {
    const questions = [...(editedContent.questions || [])]
    questions[qIdx] = {
      ...questions[qIdx],
      correct_index: correctIdx,
      correct_answer: (questions[qIdx].options || [])[correctIdx] || "",
    }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const toggleListeningHint = (qIdx: number) => {
    const questions = [...(editedContent.questions || [])]
    questions[qIdx] = { ...questions[qIdx], hint_enabled: !questions[qIdx].hint_enabled }
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const removeListeningQuestion = (qIdx: number) => {
    const questions = (editedContent.questions || []).filter(
      (_: any, i: number) => i !== qIdx,
    )
    setEditedContent({ ...editedContent, questions })
    markChanged()
  }

  const addListeningQuestion = () => {
    const questions = [
      ...(editedContent.questions || []),
      {
        question_id: crypto.randomUUID(),
        audio_text: "",
        audio_url: null,
        audio_status: "pending",
        question_text: "",
        options: ["", "", "", ""],
        correct_answer: "",
        correct_index: 0,
        explanation: "",
        hint_enabled: false,
        sub_skill: "detail",
        difficulty: "A2",
      },
    ]
    setEditedContent({ ...editedContent, questions, total_questions: questions.length })
    markChanged()
  }

  const handleRegenerateQuestionAudio = async (qIdx: number, voiceId?: string) => {
    const question = editedContent.questions?.[qIdx]
    if (!question?.audio_text) return

    try {
      setIsRegeneratingAudio(true)
      const audioResult = await generatePassageAudio({
        text: question.audio_text,
        voice_id: voiceId || "en-US-JennyNeural",
      })
      const audioData = {
        audio_base64: audioResult.audio_base64,
        word_timestamps: audioResult.word_timestamps,
        duration_seconds: audioResult.duration_seconds,
      }
      const questions = [...(editedContent.questions || [])]
      questions[qIdx] = { ...questions[qIdx], audio_data: audioData, audio_status: "ready" }
      setEditedContent({ ...editedContent, questions })
      markChanged()
    } catch (err: any) {
      toast({
        title: "Audio generation failed",
        description: err.response?.data?.detail || err.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsRegeneratingAudio(false)
    }
  }

  // =============================================================================
  // Listening Fill-Blank handlers (items with multi-blank + word bank)
  // =============================================================================
  /** Update a single listening fill-blank item with all derived fields */
  const updateListeningFBItemFull = (idx: number, updatedItem: any) => {
    const items = [...(editedContent.items || [])]
    // Auto-rebuild audio_url and clear audio_data when full_sentence changes
    if (updatedItem.full_sentence && updatedItem.full_sentence !== items[idx]?.full_sentence) {
      const lang = editedContent.language || "en"
      updatedItem.audio_url = `/api/v1/ai/tts/audio?text=${encodeURIComponent(updatedItem.full_sentence)}&lang=${lang}`
      updatedItem.audio_status = "ready"
      updatedItem.audio_data = undefined // Clear cached audio so user regenerates
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
    } catch (err: any) {
      toast({
        title: "Audio generation failed",
        description: err.response?.data?.detail || err.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setGeneratingLFBAudioIdx(null)
    }
  }

  const removeListeningFBItem = (idx: number) => {
    const items = (editedContent.items || []).filter((_: any, i: number) => i !== idx)
    setEditedContent({ ...editedContent, items, total_items: items.length })
    markChanged()
  }

  const addListeningFBItem = () => {
    const items = [
      ...(editedContent.items || []),
      {
        item_id: crypto.randomUUID(),
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
  }

  const generateLSBAudio = async (idx: number) => {
    const sentence = (editedContent.sentences || [])[idx]
    if (!sentence?.correct_sentence) return
    try {
      setGeneratingLSBAudioIdx(idx)
      const audioResult = await generatePassageAudio({ text: sentence.correct_sentence })
      const sentences = [...(editedContent.sentences || [])]
      sentences[idx] = {
        ...sentences[idx],
        audio_data: {
          audio_base64: audioResult.audio_base64,
          word_timestamps: audioResult.word_timestamps,
          duration_seconds: audioResult.duration_seconds,
        },
        audio_status: "ready",
      }
      setEditedContent({ ...editedContent, sentences })
      markChanged()
    } catch (err: any) {
      toast({
        title: "Audio generation failed",
        description: err.response?.data?.detail || err.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setGeneratingLSBAudioIdx(null)
    }
  }

  const generateLWBAudio = async (idx: number) => {
    const word = (editedContent.words || [])[idx]
    if (!word?.correct_word) return
    try {
      setGeneratingLWBAudioIdx(idx)
      const audioResult = await generatePassageAudio({ text: word.correct_word })
      const words = [...(editedContent.words || [])]
      words[idx] = {
        ...words[idx],
        audio_data: {
          audio_base64: audioResult.audio_base64,
          word_timestamps: audioResult.word_timestamps,
          duration_seconds: audioResult.duration_seconds,
        },
        audio_status: "ready",
      }
      setEditedContent({ ...editedContent, words })
      markChanged()
    } catch (err: any) {
      toast({
        title: "Audio generation failed",
        description: err.response?.data?.detail || err.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setGeneratingLWBAudioIdx(null)
    }
  }

  // =============================================================================
  // Render content editor based on activity type
  // =============================================================================
  const renderContentEditor = () => {
    if (!detailedContent?.content) return null

    // Vocabulary Quiz - uses definition, options as strings, correct_answer
    if (content.activity_type === "vocabulary_quiz") {
      const questions = editedContent.questions || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Questions ({questions.length})
            </Label>
          </div>

          {questions.map((q: any, qIdx: number) => {
            // Find the index of the correct answer in options
            const correctIdx = (q.options || []).findIndex(
              (opt: string) => opt === q.correct_answer,
            )
            return (
              <div
                key={q.question_id || qIdx}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary mt-1">
                    {qIdx + 1}
                  </span>
                  <div className="flex-1 space-y-3">
                    {/* Definition (the question prompt) */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Definition
                      </Label>
                      <Textarea
                        value={q.definition || ""}
                        onChange={(e) =>
                          updateVocabQuestion(
                            qIdx,
                            "definition",
                            e.target.value,
                          )
                        }
                        placeholder="Enter the definition..."
                        rows={2}
                        className="resize-none"
                      />
                    </div>

                    {/* Options - select correct answer using index */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Options (select correct answer)
                      </Label>
                      <RadioGroup
                        value={String(correctIdx)}
                        onValueChange={(val) =>
                          setVocabCorrectAnswer(qIdx, parseInt(val, 10))
                        }
                      >
                        {(q.options || []).map(
                          (opt: string, optIdx: number) => (
                            <div
                              key={optIdx}
                              className="flex items-center gap-2"
                            >
                              <RadioGroupItem
                                value={String(optIdx)}
                                id={`vq${qIdx}-opt${optIdx}`}
                              />
                              <Input
                                value={opt}
                                onChange={(e) =>
                                  updateVocabOption(
                                    qIdx,
                                    optIdx,
                                    e.target.value,
                                  )
                                }
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                className="flex-1 h-8 text-sm"
                              />
                            </div>
                          ),
                        )}
                      </RadioGroup>
                    </div>

                    {/* CEFR Level (read-only info) */}
                    {q.cefr_level && (
                      <div className="text-xs text-muted-foreground">
                        CEFR Level:{" "}
                        <Badge variant="outline" className="text-xs">
                          {q.cefr_level}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeVocabQuestion(qIdx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    // AI Quiz - uses question, options with is_correct, explanation
    if (content.activity_type === "ai_quiz") {
      const questions = editedContent.questions || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Questions ({questions.length})
            </Label>
            <Button size="sm" variant="outline" onClick={addAIQuestion}>
              <Plus className="mr-1 h-3 w-3" />
              Add Question
            </Button>
          </div>

          {questions.map((q: any, qIdx: number) => (
            <div key={qIdx} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary mt-1">
                  {qIdx + 1}
                </span>
                <div className="flex-1 space-y-3">
                  <Textarea
                    value={q.question || ""}
                    onChange={(e) =>
                      updateAIQuestion(qIdx, "question", e.target.value)
                    }
                    placeholder="Enter question..."
                    rows={2}
                    className="resize-none"
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Options (select correct answer)
                      </Label>
                      {(q.options || []).length < 6 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() => addAIOption(qIdx)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add
                        </Button>
                      )}
                    </div>

                    <RadioGroup
                      value={String(
                        (q.options || []).findIndex((o: any) => o.is_correct),
                      )}
                      onValueChange={(val) =>
                        setAICorrectOption(qIdx, parseInt(val, 10))
                      }
                    >
                      {(q.options || []).map((opt: any, optIdx: number) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <RadioGroupItem
                            value={String(optIdx)}
                            id={`q${qIdx}-opt${optIdx}`}
                          />
                          <Input
                            value={opt.text || ""}
                            onChange={(e) =>
                              updateAIOption(qIdx, optIdx, e.target.value)
                            }
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            className="flex-1 h-8 text-sm"
                          />
                          {(q.options || []).length > 2 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeAIOption(qIdx, optIdx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Explanation (optional)
                    </Label>
                    <Textarea
                      value={q.explanation || ""}
                      onChange={(e) =>
                        updateAIQuestion(qIdx, "explanation", e.target.value)
                      }
                      placeholder="Explain the correct answer..."
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive"
                  onClick={() => removeAIQuestion(qIdx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Reading Comprehension (supports single and multi-passage)
    if (content.activity_type === "reading_comprehension") {
      const isMultiPassage = editedContent.passages && editedContent.passages.length > 0

      const renderRCQuestions = (questions: any[], passageIdx?: number) => (
        <div className="space-y-3">
          {questions.map((q: any, qIdx: number) => (
            <div key={qIdx} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary mt-1">
                  {qIdx + 1}
                </span>
                <div className="flex-1 space-y-3">
                  <Textarea
                    value={q.question_text || q.question || ""}
                    onChange={(e) =>
                      updateRCQuestion(qIdx, "question_text", e.target.value, passageIdx)
                    }
                    placeholder="Enter question..."
                    rows={2}
                    className="resize-none"
                  />

                  {q.options && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Options (select correct answer)
                      </Label>
                      <RadioGroup
                        value={String(q.correct_index ?? -1)}
                        onValueChange={(val) =>
                          setRCCorrectOption(qIdx, parseInt(val, 10), passageIdx)
                        }
                      >
                        {(q.options || []).map((opt: any, optIdx: number) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <RadioGroupItem
                              value={String(optIdx)}
                              id={`rc-p${passageIdx ?? 0}-q${qIdx}-opt${optIdx}`}
                            />
                            <Input
                              value={typeof opt === "string" ? opt : opt.text || ""}
                              onChange={(e) =>
                                updateRCOption(qIdx, optIdx, e.target.value, passageIdx)
                              }
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 h-8 text-sm"
                            />
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  {q.explanation !== undefined && (
                    <Textarea
                      value={q.explanation || ""}
                      onChange={(e) =>
                        updateRCQuestion(qIdx, "explanation", e.target.value, passageIdx)
                      }
                      placeholder="Explanation..."
                      rows={2}
                      className="resize-none text-sm"
                    />
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive"
                  onClick={() => removeRCQuestion(qIdx, passageIdx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )

      if (isMultiPassage) {
        return (
          <Tabs defaultValue="0" className="space-y-4">
            <TabsList className="w-full justify-start">
              {editedContent.passages.map((_: any, pIdx: number) => (
                <TabsTrigger key={pIdx} value={String(pIdx)}>
                  Passage {pIdx + 1}
                  <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                    {(editedContent.passages[pIdx].questions || []).length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            {editedContent.passages.map((p: any, pIdx: number) => (
              <TabsContent key={pIdx} value={String(pIdx)} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Passage</Label>
                    {editingPassage !== pIdx && (
                      <button
                        type="button"
                        onClick={() => setEditingPassage(pIdx)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit text
                      </button>
                    )}
                  </div>
                  {editingPassage === pIdx ? (
                    <>
                      <Textarea
                        value={p.passage || ""}
                        onChange={(e) => updatePassage(e.target.value, pIdx)}
                        rows={12}
                        placeholder="Enter the reading passage..."
                        className="min-h-[200px]"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          Audio will be regenerated on save.
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPassage(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              setEditingPassage(null)
                              await handleRegenerateAudio("en-US-JennyNeural", pIdx)
                            }}
                            disabled={isRegeneratingAudio}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            {isRegeneratingAudio ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Save &amp; Regenerate Audio
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : isRegeneratingAudio && !p.passage_audio ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10">
                      <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
                          Generating audio narration...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          This may take a few seconds
                        </p>
                      </div>
                    </div>
                  ) : p.passage_audio ? (
                    <PassageAudioPlayer
                      audioBase64={p.passage_audio.audio_base64}
                      wordTimestamps={p.passage_audio.word_timestamps}
                      durationSeconds={p.passage_audio.duration_seconds}
                      onRegenerateAudio={(voiceId) => handleRegenerateAudio(voiceId, pIdx)}
                      isRegenerating={isRegeneratingAudio}
                    />
                  ) : (
                    <div className="rounded-lg border bg-card p-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {p.passage}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Questions ({(p.questions || []).length})
                  </Label>
                  <Button size="sm" variant="outline" onClick={() => addRCQuestion(pIdx)}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Question
                  </Button>
                </div>
                {renderRCQuestions(p.questions || [], pIdx)}
              </TabsContent>
            ))}
          </Tabs>
        )
      }

      // Single passage fallback
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Passage</Label>
              {editingPassage !== "single" && (
                <button
                  type="button"
                  onClick={() => setEditingPassage("single")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit text
                </button>
              )}
            </div>
            {editingPassage === "single" ? (
              <>
                <Textarea
                  value={editedContent.passage || ""}
                  onChange={(e) => updatePassage(e.target.value)}
                  rows={12}
                  placeholder="Enter the reading passage..."
                  className="min-h-[200px]"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Audio will be regenerated on save.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingPassage(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        setEditingPassage(null)
                        await handleRegenerateAudio("en-US-JennyNeural")
                      }}
                      disabled={isRegeneratingAudio}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {isRegeneratingAudio ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Save &amp; Regenerate Audio
                    </Button>
                  </div>
                </div>
              </>
            ) : isRegeneratingAudio && !editedContent.passage_audio ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <div className="text-center">
                  <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
                    Generating audio narration...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This may take a few seconds
                  </p>
                </div>
              </div>
            ) : editedContent.passage_audio ? (
              <PassageAudioPlayer
                audioBase64={editedContent.passage_audio.audio_base64}
                wordTimestamps={editedContent.passage_audio.word_timestamps}
                durationSeconds={editedContent.passage_audio.duration_seconds}
                onRegenerateAudio={(voiceId) => handleRegenerateAudio(voiceId)}
                isRegenerating={isRegeneratingAudio}
              />
            ) : (
              <div className="rounded-lg border bg-card p-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {editedContent.passage}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Questions ({(editedContent.questions || []).length})
              </Label>
              <Button size="sm" variant="outline" onClick={() => addRCQuestion()}>
                <Plus className="mr-1 h-3 w-3" />
                Add Question
              </Button>
            </div>
            {renderRCQuestions(editedContent.questions || [])}
          </div>
        </div>
      )
    }

    // Listening Quiz — audio_text, question_text, MCQ options, hint toggle, audio player
    if (content.activity_type === "listening_quiz") {
      const questions = editedContent.questions || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Questions ({questions.length})
            </Label>
            <Button size="sm" variant="outline" onClick={addListeningQuestion}>
              <Plus className="mr-1 h-3 w-3" />
              Add Question
            </Button>
          </div>

          {questions.map((q: any, qIdx: number) => (
            <div
              key={q.question_id || qIdx}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary mt-1">
                  {qIdx + 1}
                </span>
                <div className="flex-1 space-y-3">
                  {/* Sub-skill badge + hint toggle */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs capitalize",
                        q.sub_skill === "gist" && "border-blue-300 text-blue-700",
                        q.sub_skill === "detail" && "border-amber-300 text-amber-700",
                        q.sub_skill === "discrimination" && "border-purple-300 text-purple-700",
                      )}
                    >
                      {q.sub_skill || "detail"}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => toggleListeningHint(qIdx)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors",
                        q.hint_enabled
                          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          : "border-muted text-muted-foreground hover:border-amber-300 hover:text-amber-600",
                      )}
                      title="When enabled, students can reveal the audio text as a hint"
                    >
                      <Eye className="h-3 w-3" />
                      Hint
                    </button>
                  </div>

                  {/* Audio text — show player OR textarea, not both */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Audio Text (spoken to student)
                      </Label>
                      {editingAudioTextIdx !== qIdx && q.audio_data && (
                        <button
                          type="button"
                          onClick={() => setEditingAudioTextIdx(qIdx)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit text
                        </button>
                      )}
                    </div>

                    {editingAudioTextIdx === qIdx ? (
                      <>
                        <Textarea
                          value={q.audio_text || ""}
                          onChange={(e) => {
                            const questions = [...(editedContent.questions || [])]
                            questions[qIdx] = {
                              ...questions[qIdx],
                              audio_text: e.target.value,
                              audio_data: undefined,
                              audio_status: "pending",
                            }
                            setEditedContent({ ...editedContent, questions })
                            markChanged()
                          }}
                          placeholder="Text that will be spoken to the student..."
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingAudioTextIdx(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              setEditingAudioTextIdx(null)
                              await handleRegenerateQuestionAudio(qIdx)
                            }}
                            disabled={isRegeneratingAudio || !q.audio_text}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            {isRegeneratingAudio ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Save & Generate Audio
                          </Button>
                        </div>
                      </>
                    ) : q.audio_data ? (
                      <PassageAudioPlayer
                        audioBase64={q.audio_data.audio_base64}
                        wordTimestamps={q.audio_data.word_timestamps}
                        durationSeconds={q.audio_data.duration_seconds}
                        onRegenerateAudio={(voiceId) => handleRegenerateQuestionAudio(qIdx, voiceId)}
                        isRegenerating={isRegeneratingAudio}
                      />
                    ) : (
                      <>
                        <Textarea
                          value={q.audio_text || ""}
                          onChange={(e) => {
                            updateListeningQuestion(qIdx, "audio_text", e.target.value)
                          }}
                          placeholder="Text that will be spoken to the student..."
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateQuestionAudio(qIdx)}
                          disabled={isRegeneratingAudio || !q.audio_text}
                          className="text-teal-600 border-teal-300 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-700 dark:hover:bg-teal-900/20"
                        >
                          {isRegeneratingAudio ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : (
                            <Headphones className="h-4 w-4 mr-1.5" />
                          )}
                          Generate Audio
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Question text */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Question
                    </Label>
                    <Input
                      value={q.question_text || ""}
                      onChange={(e) =>
                        updateListeningQuestion(qIdx, "question_text", e.target.value)
                      }
                      placeholder="Question displayed to student..."
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Options with correct answer selection */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Options (select correct answer)
                    </Label>
                    <RadioGroup
                      value={String(q.correct_index ?? 0)}
                      onValueChange={(val) =>
                        setListeningCorrectOption(qIdx, parseInt(val, 10))
                      }
                    >
                      {(q.options || []).map((opt: string, optIdx: number) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <RadioGroupItem
                            value={String(optIdx)}
                            id={`lq-q${qIdx}-opt${optIdx}`}
                          />
                          <Input
                            value={opt}
                            onChange={(e) =>
                              updateListeningOption(qIdx, optIdx, e.target.value)
                            }
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            className="flex-1 h-8 text-sm"
                          />
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Explanation (optional)
                    </Label>
                    <Textarea
                      value={q.explanation || ""}
                      onChange={(e) =>
                        updateListeningQuestion(qIdx, "explanation", e.target.value)
                      }
                      placeholder="Explain the correct answer..."
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive"
                  onClick={() => removeListeningQuestion(qIdx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Listening Fill-Blank — read-only cards with edit toggle per item
    if (content.activity_type === "listening_fill_blank") {
      const items = editedContent.items || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Items ({items.length})
            </Label>
            <Button size="sm" variant="outline" onClick={() => { addListeningFBItem(); setEditingLFBItemIdx(items.length) }}>
              <Plus className="mr-1 h-3 w-3" />
              Add Item
            </Button>
          </div>

          {items.map((item: any, idx: number) => {
            const fullSentence: string = item.full_sentence || ""
            const missingWords: string[] = item.missing_words || []
            const missingSet = new Set(missingWords.map((w: string) => w.toLowerCase()))
            const blankCount = missingWords.length
            const isEditingThis = editingLFBItemIdx === idx

            // ---- READ-ONLY CARD ----
            if (!isEditingThis) {
              return (
                <div
                  key={item.item_id || idx}
                  className="space-y-2 p-4 rounded-lg border bg-card group"
                >
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
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingLFBItemIdx(idx)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeListeningFBItem(idx)}
                        disabled={items.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Audio section — full_sentence */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Audio (full sentence spoken to student)
                    </Label>
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
                        onRegenerateAudio={(_voiceId) => generateLFBAudio(idx)}
                        isRegenerating={generatingLFBAudioIdx === idx}
                      />
                    ) : (
                      <>
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <p className="text-sm leading-relaxed">
                            {fullSentence}
                          </p>
                        </div>
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
                      </>
                    )}
                  </div>

                  {/* Display sentence with blanks highlighted */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Student sees
                    </Label>
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
                      <Label className="text-xs text-muted-foreground">
                        Word Bank
                      </Label>
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
              updateListeningFBItemFull(idx, {
                full_sentence: newFull,
                missing_words: newMissing,
                display_sentence: display,
                word_bank: [...newMissing, ...distractors],
                acceptable_answers: newMissing.map((w: string) => [w]),
              })
            }

            const toggleWord = (word: string) => {
              const currentMissing: string[] = item.missing_words || []
              const isSelected = currentMissing.some(w => w.toLowerCase() === word.toLowerCase())
              if (isSelected) {
                rebuildFromSelection(fullSentence, currentMissing.filter(w => w.toLowerCase() !== word.toLowerCase()))
              } else {
                rebuildFromSelection(fullSentence, [...currentMissing, word])
              }
            }

            const distractors = (item.word_bank || []).filter(
              (w: string) => !missingSet.has(w.toLowerCase())
            )

            return (
              <div
                key={item.item_id || idx}
                className="rounded-lg border p-4 space-y-3"
              >
                {/* Editable sentence */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Sentence</Label>
                  <Textarea
                    value={fullSentence}
                    onChange={(e) => {
                      const newFull = e.target.value
                      const currentMissing: string[] = item.missing_words || []
                      const kept = currentMissing.filter(w =>
                        new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(newFull)
                      )
                      rebuildFromSelection(newFull, kept)
                    }}
                    rows={2}
                    placeholder="Type the full sentence here..."
                    className="resize-none text-sm"
                  />
                </div>

                {/* Word picker */}
                {fullSentence.trim() && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Tap words to mark as blanks
                    </Label>
                    <div className="flex flex-wrap gap-1 p-3 rounded-lg border bg-card min-h-[44px]">
                      {tokens.map((token, tIdx) => {
                        const isWord = /^[\w'-]+$/.test(token)
                        if (!isWord) return <span key={tIdx} className="text-sm">{token}</span>
                        const isBlank = missingSet.has(token.toLowerCase())
                        return (
                          <button
                            key={tIdx}
                            type="button"
                            onClick={() => toggleWord(token)}
                            className={cn(
                              "px-2 py-0.5 rounded text-sm font-medium transition-all border cursor-pointer",
                              isBlank
                                ? "bg-teal-500 text-white border-teal-600 shadow-sm"
                                : "bg-transparent border-transparent hover:bg-muted hover:border-muted-foreground/20"
                            )}
                          >
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

                {/* Distractors — extra wrong words for the word bank */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Distractors <span className="font-normal text-muted-foreground">(extra wrong words for word bank, comma-separated)</span>
                  </Label>
                  <Input
                    value={distractors.join(", ")}
                    onChange={(e) => {
                      const newDistractors = e.target.value
                        .split(",")
                        .map((w: string) => w.trim())
                        .filter(Boolean)
                      const currentMissing: string[] = item.missing_words || []
                      updateListeningFBItemFull(idx, {
                        word_bank: [...currentMissing, ...newDistractors],
                      })
                    }}
                    placeholder="dog, park, house"
                  />
                </div>

                {/* Word bank preview */}
                {(item.word_bank || []).length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Word Bank Preview</Label>
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
                      // Auto-generate audio if sentence exists and no audio
                      if (fullSentence.trim() && !item.audio_data) {
                        generateLFBAudio(idx)
                      }
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

    // Listening Sentence Builder
    if (content.activity_type === "listening_sentence_builder") {
      const sentences = editedContent.sentences || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Sentences ({sentences.length})
            </Label>
            <Button size="sm" variant="outline" onClick={() => {
              const newSentences = [...sentences, {
                item_id: `lsb_new_${Date.now()}`,
                correct_sentence: "",
                words: [],
                word_count: 0,
                audio_url: null,
                audio_status: "pending",
                difficulty: "medium",
              }]
              setEditedContent({ ...editedContent, sentences: newSentences })
              setEditingLSBIdx(newSentences.length - 1)
              markChanged()
            }}>
              <Plus className="mr-1 h-3 w-3" />
              Add Sentence
            </Button>
          </div>

          {sentences.map((sentence: any, idx: number) => {
            const isEditingThis = editingLSBIdx === idx

            if (!isEditingThis) {
              return (
                <div key={sentence.item_id || idx} className="space-y-2 p-4 rounded-lg border bg-card group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground">#{idx + 1}</span>
                      <Badge variant="outline" className="text-xs">{sentence.word_count || 0} words</Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLSBIdx(idx)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={sentences.length <= 1}
                        onClick={() => {
                          const newSentences = sentences.filter((_: any, i: number) => i !== idx)
                          setEditedContent({ ...editedContent, sentences: newSentences })
                          markChanged()
                        }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Audio */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Audio (student hears this)</Label>
                    {generatingLSBAudioIdx === idx ? (
                      <div className="flex items-center gap-3 p-4 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10">
                        <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                        <p className="text-sm text-teal-700 dark:text-teal-300">Generating audio...</p>
                      </div>
                    ) : sentence.audio_data ? (
                      <PassageAudioPlayer
                        audioBase64={sentence.audio_data.audio_base64}
                        wordTimestamps={sentence.audio_data.word_timestamps}
                        durationSeconds={sentence.audio_data.duration_seconds}
                        onRegenerateAudio={() => generateLSBAudio(idx)}
                        isRegenerating={generatingLSBAudioIdx === idx}
                      />
                    ) : (
                      <>
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <p className="text-sm">{sentence.correct_sentence || "—"}</p>
                        </div>
                        {sentence.correct_sentence && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateLSBAudio(idx)}
                            disabled={generatingLSBAudioIdx !== null}
                            className="text-teal-600 border-teal-300 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-700 dark:hover:bg-teal-900/20"
                          >
                            <Headphones className="h-4 w-4 mr-1.5" />
                            Generate Audio
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Shuffled words */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Shuffled Words (student sees)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(sentence.words || []).map((w: string, wIdx: number) => (
                        <span key={wIdx} className="px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">{w}</span>
                      ))}
                    </div>
                  </div>

                  {/* Correct answer */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Correct:</span>
                    <span className="text-green-600 font-medium">{sentence.correct_sentence}</span>
                  </div>
                </div>
              )
            }

            // ---- EDITING CARD ----
            return (
              <div key={sentence.item_id || idx} className="space-y-3 p-4 rounded-lg border-2 border-primary bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">#{idx + 1} — Editing</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditingLSBIdx(null)
                      // Auto-generate audio for the edited sentence
                      if (sentence.correct_sentence) {
                        generateLSBAudio(idx)
                      }
                    }}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Done
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Sentence (spoken via audio)</Label>
                  <Textarea
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
                        audio_data: undefined,
                      }
                      setEditedContent({ ...editedContent, sentences: newSentences })
                      markChanged()
                    }}
                    rows={2}
                    placeholder="The children played in the park after school."
                  />
                </div>
                {sentence.words && sentence.words.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Shuffled Words Preview</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {sentence.words.map((w: string, wIdx: number) => (
                        <span key={wIdx} className="px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    if (content.activity_type === "listening_word_builder") {
      const words = editedContent.words || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Words ({words.length})
            </Label>
            <Button size="sm" variant="outline" onClick={() => {
              const newWords = [...words, {
                item_id: `lwb_new_${Date.now()}`,
                correct_word: "",
                letters: [],
                letter_count: 0,
                definition: "",
                audio_url: null,
                audio_status: "pending",
                difficulty: "medium",
              }]
              setEditedContent({ ...editedContent, words: newWords })
              setEditingLWBIdx(newWords.length - 1)
              markChanged()
            }}>
              <Plus className="mr-1 h-3 w-3" />
              Add Word
            </Button>
          </div>

          {words.map((word: any, idx: number) => {
            const isEditingThis = editingLWBIdx === idx

            if (!isEditingThis) {
              return (
                <div key={word.item_id || idx} className="space-y-2 p-4 rounded-lg border bg-card group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground">#{idx + 1}</span>
                      <Badge variant="outline" className="text-xs">{word.letter_count || 0} letters</Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLWBIdx(idx)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={words.length <= 1}
                        onClick={() => {
                          const newWords = words.filter((_: any, i: number) => i !== idx)
                          setEditedContent({ ...editedContent, words: newWords })
                          markChanged()
                        }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Audio */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Audio (student hears this)</Label>
                    {generatingLWBAudioIdx === idx ? (
                      <div className="flex items-center gap-3 p-4 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10">
                        <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                        <p className="text-sm text-teal-700 dark:text-teal-300">Generating audio...</p>
                      </div>
                    ) : word.audio_data ? (
                      <PassageAudioPlayer
                        audioBase64={word.audio_data.audio_base64}
                        wordTimestamps={word.audio_data.word_timestamps}
                        durationSeconds={word.audio_data.duration_seconds}
                        onRegenerateAudio={() => generateLWBAudio(idx)}
                        isRegenerating={generatingLWBAudioIdx === idx}
                      />
                    ) : (
                      <>
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <p className="text-sm font-medium">{word.correct_word || "—"}</p>
                        </div>
                        {word.correct_word && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateLWBAudio(idx)}
                            disabled={generatingLWBAudioIdx !== null}
                            className="text-teal-600 border-teal-300 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-700 dark:hover:bg-teal-900/20"
                          >
                            <Headphones className="h-4 w-4 mr-1.5" />
                            Generate Audio
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Definition */}
                  {word.definition && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Definition:</span> {word.definition}
                    </div>
                  )}

                  {/* Scrambled letters */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Scrambled Letters (student sees)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(word.letters || []).map((l: string, lIdx: number) => (
                        <span key={lIdx} className="px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 uppercase">{l}</span>
                      ))}
                    </div>
                  </div>

                  {/* Correct answer */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Correct:</span>
                    <span className="text-green-600 font-medium">{word.correct_word}</span>
                  </div>
                </div>
              )
            }

            // ---- EDITING CARD ----
            return (
              <div key={word.item_id || idx} className="space-y-3 p-4 rounded-lg border-2 border-primary bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">#{idx + 1} — Editing</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditingLWBIdx(null)
                      // Auto-generate audio for the edited word
                      if (word.correct_word) {
                        generateLWBAudio(idx)
                      }
                    }}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Done
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Word (spoken via audio)</Label>
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
                        audio_data: undefined,
                      }
                      setEditedContent({ ...editedContent, words: newWords })
                      markChanged()
                    }}
                    placeholder="beautiful"
                    className="font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Definition (optional hint)</Label>
                  <Input
                    value={word.definition || ""}
                    onChange={(e) => {
                      const newWords = [...words]
                      newWords[idx] = { ...word, definition: e.target.value }
                      setEditedContent({ ...editedContent, words: newWords })
                      markChanged()
                    }}
                    placeholder="Very attractive or pleasing"
                  />
                </div>
                {word.letters && word.letters.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Scrambled Letters Preview</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {word.letters.map((l: string, lIdx: number) => (
                        <span key={lIdx} className="px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 uppercase">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    if (content.activity_type === "sentence_builder") {
      const sentences = editedContent.sentences || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Sentences ({sentences.length})
            </Label>
            <Button size="sm" variant="outline" onClick={addSentence}>
              <Plus className="mr-1 h-3 w-3" />
              Add Sentence
            </Button>
          </div>

          {sentences.map((sentence: any, idx: number) => (
            <div key={idx} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary mt-1">
                  {idx + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <Input
                    value={sentence.correct_sentence || ""}
                    onChange={(e) =>
                      updateSentence(idx, "correct_sentence", e.target.value)
                    }
                    placeholder="Correct sentence..."
                    className="h-8 text-sm"
                  />
                  <Input
                    value={sentence.hint || ""}
                    onChange={(e) =>
                      updateSentence(idx, "hint", e.target.value)
                    }
                    placeholder="Hint (optional)..."
                    className="h-8 text-sm text-muted-foreground"
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive"
                  onClick={() => removeSentence(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Word builder
    if (content.activity_type === "word_builder") {
      const words = editedContent.words || []
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Words ({words.length})
            </Label>
            <Button size="sm" variant="outline" onClick={addWord}>
              <Plus className="mr-1 h-3 w-3" />
              Add Word
            </Button>
          </div>

          {words.map((word: any, idx: number) => (
            <div key={idx} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary mt-1">
                  {idx + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <Input
                    value={word.word || ""}
                    onChange={(e) => updateWord(idx, "word", e.target.value)}
                    placeholder="Word..."
                    className="h-8 text-sm font-medium"
                  />
                  <Input
                    value={word.hint || ""}
                    onChange={(e) => updateWord(idx, "hint", e.target.value)}
                    placeholder="Hint (optional)..."
                    className="h-8 text-sm text-muted-foreground"
                  />
                  <Input
                    value={word.definition || ""}
                    onChange={(e) =>
                      updateWord(idx, "definition", e.target.value)
                    }
                    placeholder="Definition (optional)..."
                    className="h-8 text-sm text-muted-foreground"
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive"
                  onClick={() => removeWord(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Fallback - show raw JSON editor
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">Content (JSON)</Label>
        <Textarea
          value={JSON.stringify(editedContent, null, 2)}
          onChange={(e) => {
            try {
              setEditedContent(JSON.parse(e.target.value))
              markChanged()
            } catch {
              // Invalid JSON, don't update
            }
          }}
          rows={10}
          className="font-mono text-xs"
        />
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[70vw] max-w-[1100px] sm:max-w-[70vw] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${colorClasses.bg}`}>
              <IconComponent className={`h-6 w-6 ${colorClasses.text}`} />
            </div>
            <div className="flex-1">
              <SheetTitle>Edit Content</SheetTitle>
              <SheetDescription>
                {config.label}
                {hasChanges && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Unsaved changes
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load content. Please try again.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!isLoading && !error && detailedContent && (
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-6 px-6 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    markChanged()
                  }}
                  placeholder="Enter title..."
                />
              </div>

              <Separator />

              {/* Content Editor */}
              {renderContentEditor()}
            </div>
          </ScrollArea>
        )}

        <SheetFooter className="shrink-0 gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
