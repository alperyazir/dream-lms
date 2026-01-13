/**
 * GenerationPreview - Preview generated AI content
 * Story 27.17: Question Generator UI - Task 7
 *
 * Displays generated content preview with summary stats and actions.
 * Supports inline editing and deletion of questions.
 */

import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Pencil,
  RotateCw,
  Save,
  Trash2,
  Volume2,
  X,
} from "lucide-react"
import { useCallback, useRef, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type {
  ActivityType,
  GeneratedActivity,
} from "@/hooks/useGenerationState"
import { cn } from "@/lib/utils"

interface GenerationPreviewProps {
  activityType: ActivityType
  result: GeneratedActivity
  onEdit?: () => void
  onSave?: () => void
  onCreateAssignment?: () => void
  onRegenerate?: () => void
  onUpdateQuestion?: (index: number, question: any) => void
  onDeleteQuestion?: (index: number) => void
}

export function GenerationPreview({
  activityType,
  result,
  onEdit: _onEdit, // Reserved for future full edit mode
  onSave,
  onCreateAssignment,
  onRegenerate,
  onUpdateQuestion,
  onDeleteQuestion,
}: GenerationPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true) // Default to expanded for editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{
    question_text: string
    options: string[]
    correct_index: number
  } | null>(null)
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(
    null,
  )

  // Vocabulary quiz edit form state
  const [vocabEditForm, setVocabEditForm] = useState<{
    definition: string
    correct_answer: string
  } | null>(null)

  // Vocabulary matching edit form state
  const [matchingEditForm, setMatchingEditForm] = useState<{
    left_item: string
    right_item: string
  } | null>(null)

  // Sentence builder edit form state
  const [sentenceEditForm, setSentenceEditForm] = useState<{
    correct_sentence: string
  } | null>(null)

  // Word builder edit form state
  const [wordEditForm, setWordEditForm] = useState<{
    correct_word: string
    definition: string
  } | null>(null)

  // Audio playback state
  const [playingAudioIndex, setPlayingAudioIndex] = useState<number | null>(
    null,
  )
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Get preview data based on activity type
  const preview = getPreviewData(activityType, result)

  // Get API base URL from environment
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  // Get audio info for a question (vocabulary quiz only)
  const getAudioInfo = (
    index: number,
  ): { bookId: number; wordId: string } | null => {
    if (activityType !== "vocabulary_quiz") return null
    const questions = (result as any).questions || []
    const question = questions[index]
    if (!question) return null

    // Get book_id from the quiz result
    const bookId = (result as any).book_id
    if (!bookId) return null

    // Get vocabulary_id from the question (DCS word ID like "word_1")
    const wordId = question.vocabulary_id
    if (!wordId) return null

    return { bookId, wordId }
  }

  // Handle audio playback - fetches from backend proxy endpoint
  const handlePlayAudio = useCallback(
    async (index: number) => {
      const audioInfo = getAudioInfo(index)
      if (!audioInfo) return

      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      // If clicking the same one that's playing, just stop
      if (playingAudioIndex === index) {
        setPlayingAudioIndex(null)
        return
      }

      setPlayingAudioIndex(index)

      try {
        // Get auth token from localStorage
        const token = localStorage.getItem("access_token")

        // Fetch audio from backend proxy using word_id (not word text)
        // Backend: GET /api/v1/ai/audio/vocabulary/{book_id}/{lang}/{word_id}
        const audioUrl = `${API_BASE_URL}/api/v1/ai/audio/vocabulary/${audioInfo.bookId}/en/${audioInfo.wordId}`
        const response = await fetch(audioUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`)
        }

        // Create blob URL and play
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)

        const audio = new Audio(blobUrl)
        audioRef.current = audio

        audio.onended = () => {
          setPlayingAudioIndex(null)
          audioRef.current = null
          URL.revokeObjectURL(blobUrl)
        }

        audio.onerror = () => {
          setPlayingAudioIndex(null)
          audioRef.current = null
          URL.revokeObjectURL(blobUrl)
        }

        await audio.play()
      } catch (error) {
        console.error("Audio playback failed:", error)
        setPlayingAudioIndex(null)
        audioRef.current = null
      }
    },
    [playingAudioIndex, getAudioInfo],
  )

  // Start editing an item
  const handleStartEdit = (index: number) => {
    setEditingIndex(index)

    // Clear all edit forms first
    setEditForm(null)
    setVocabEditForm(null)
    setMatchingEditForm(null)
    setSentenceEditForm(null)
    setWordEditForm(null)

    if (activityType === "vocabulary_quiz") {
      const questions = (result as any).questions || []
      const q = questions[index]
      if (q) {
        setVocabEditForm({
          definition: q.definition,
          correct_answer: q.correct_answer,
        })
      }
    } else if (
      activityType === "ai_quiz" ||
      activityType === "reading_comprehension"
    ) {
      const questions = (result as any).questions || []
      const q = questions[index]
      if (q) {
        setEditForm({
          question_text: q.question_text,
          options: q.options ? [...q.options] : [],
          correct_index: q.correct_index ?? 0,
        })
      }
    } else if (activityType === "sentence_builder") {
      const sentences = (result as any).sentences || []
      const s = sentences[index]
      if (s) {
        setSentenceEditForm({
          correct_sentence: s.correct_sentence || s.sentence || "",
        })
      }
    } else if (activityType === "word_builder") {
      const words = (result as any).words || []
      const w = words[index]
      if (w) {
        setWordEditForm({
          correct_word: w.word || w.correct_word || "",
          definition: w.definition || w.hint || "",
        })
      }
    }
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditForm(null)
    setVocabEditForm(null)
    setMatchingEditForm(null)
    setSentenceEditForm(null)
    setWordEditForm(null)
  }

  // Save edit
  const handleSaveEdit = () => {
    if (editingIndex !== null && onUpdateQuestion) {
      if (activityType === "vocabulary_quiz" && vocabEditForm) {
        const questions = (result as any).questions || []
        const originalQuestion = questions[editingIndex]
        // Update vocabulary quiz question
        onUpdateQuestion(editingIndex, {
          ...originalQuestion,
          definition: vocabEditForm.definition,
          correct_answer: vocabEditForm.correct_answer,
          // Update options to include the new correct answer if changed
          options: originalQuestion.options.map((opt: string) =>
            opt === originalQuestion.correct_answer
              ? vocabEditForm.correct_answer
              : opt,
          ),
        })
      } else if (
        (activityType === "ai_quiz" ||
          activityType === "reading_comprehension") &&
        editForm
      ) {
        const questions = (result as any).questions || []
        const originalQuestion = questions[editingIndex]
        // Update AI Quiz / Reading Comprehension question
        onUpdateQuestion(editingIndex, {
          ...originalQuestion,
          question_text: editForm.question_text,
          options: editForm.options,
          correct_index: editForm.correct_index,
          correct_answer: editForm.options[editForm.correct_index],
        })
      } else if (activityType === "sentence_builder" && sentenceEditForm) {
        const sentences = (result as any).sentences || []
        const originalSentence = sentences[editingIndex]
        // Update sentence builder - re-split words from the new sentence
        const words = sentenceEditForm.correct_sentence
          .split(/\s+/)
          .filter(Boolean)
        onUpdateQuestion(editingIndex, {
          ...originalSentence,
          correct_sentence: sentenceEditForm.correct_sentence,
          sentence: sentenceEditForm.correct_sentence,
          words: words,
          word_count: words.length,
        })
      } else if (activityType === "word_builder" && wordEditForm) {
        const words = (result as any).words || []
        const originalWord = words[editingIndex]
        // Update word builder - re-scramble letters from new word
        const letters = wordEditForm.correct_word
          .split("")
          .sort(() => Math.random() - 0.5)
        onUpdateQuestion(editingIndex, {
          ...originalWord,
          word: wordEditForm.correct_word,
          correct_word: wordEditForm.correct_word,
          definition: wordEditForm.definition,
          hint: wordEditForm.definition,
          letters: letters,
        })
      }
    }
    handleCancelEdit()
  }

  // Update option text
  const handleOptionChange = (optIndex: number, value: string) => {
    if (editForm) {
      const newOptions = [...editForm.options]
      newOptions[optIndex] = value
      setEditForm({ ...editForm, options: newOptions })
    }
  }

  // Handle delete - show confirmation dialog
  const handleDeleteClick = (index: number) => {
    setDeleteConfirmIndex(index)
  }

  // Confirm delete
  const handleConfirmDelete = () => {
    if (deleteConfirmIndex !== null && onDeleteQuestion) {
      onDeleteQuestion(deleteConfirmIndex)
    }
    setDeleteConfirmIndex(null)
  }

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteConfirmIndex(null)
  }

  // Support editing for all activity types
  const editableTypes = [
    "ai_quiz",
    "vocabulary_quiz",
    "reading_comprehension",
    "sentence_builder",
    "word_builder",
  ]
  const canEdit = editableTypes.includes(activityType) && onUpdateQuestion
  const canDelete = editableTypes.includes(activityType) && onDeleteQuestion

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <FileQuestion className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Generated Content</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {preview.activityName}
              </p>
            </div>
          </div>
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Ready
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          {preview.stats.map((stat, index) => (
            <div key={index} className="space-y-1">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* Passage Preview (Reading Comprehension only) */}
        {activityType === "reading_comprehension" &&
          (result as any).passage && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">AI-Generated Passage</h4>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border max-h-[200px] overflow-y-auto">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {(result as any).passage}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  ~{(result as any).passage.split(/\s+/).length} words • Based
                  on module content
                </p>
              </div>
              <Separator />
            </>
          )}

        {/* Sample Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Preview</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  Show Less <ChevronUp className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Show All <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {preview.samples
              .slice(0, isExpanded ? undefined : 3)
              .map((sample, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-muted/50 border space-y-2 group relative"
                >
                  {/* Action buttons (Audio, Edit, Delete) */}
                  {editingIndex !== index && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      {/* Audio button for vocabulary quiz - always visible (TTS fallback available) */}
                      {activityType === "vocabulary_quiz" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7",
                            playingAudioIndex === index && "text-teal-600",
                          )}
                          onClick={() => handlePlayAudio(index)}
                          title="Listen to pronunciation"
                        >
                          <Volume2
                            className={cn(
                              "h-3.5 w-3.5",
                              playingAudioIndex === index && "animate-pulse",
                            )}
                          />
                        </Button>
                      )}
                      {/* Edit/Delete buttons - show on hover */}
                      {(canEdit || canDelete) && (
                        <>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleStartEdit(index)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && preview.samples.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteClick(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Editing mode - AI Quiz / Reading Comprehension (MCQ/True-False) */}
                  {editingIndex === index && editForm ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Question</Label>
                        <Textarea
                          value={editForm.question_text}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              question_text: e.target.value,
                            })
                          }
                          className="text-sm min-h-[60px]"
                        />
                      </div>
                      {/* Only show options for MCQ/True-False (not short_answer) */}
                      {editForm.options.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs">
                            Options (select correct answer)
                          </Label>
                          <RadioGroup
                            value={editForm.correct_index.toString()}
                            onValueChange={(v) =>
                              setEditForm({
                                ...editForm,
                                correct_index: parseInt(v, 10),
                              })
                            }
                          >
                            {editForm.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className="flex items-center gap-2"
                              >
                                <RadioGroupItem
                                  value={optIdx.toString()}
                                  id={`opt-${index}-${optIdx}`}
                                />
                                <Input
                                  value={opt}
                                  onChange={(e) =>
                                    handleOptionChange(optIdx, e.target.value)
                                  }
                                  className="text-sm h-8 flex-1"
                                />
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : editingIndex === index && vocabEditForm ? (
                    /* Editing mode - Vocabulary Quiz */
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Word (Correct Answer)</Label>
                        <Input
                          value={vocabEditForm.correct_answer}
                          onChange={(e) =>
                            setVocabEditForm({
                              ...vocabEditForm,
                              correct_answer: e.target.value,
                            })
                          }
                          className="text-sm h-9 font-medium"
                          placeholder="Enter the vocabulary word"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Definition</Label>
                        <Textarea
                          value={vocabEditForm.definition}
                          onChange={(e) =>
                            setVocabEditForm({
                              ...vocabEditForm,
                              definition: e.target.value,
                            })
                          }
                          className="text-sm min-h-[60px]"
                          placeholder="Enter the definition"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : editingIndex === index && matchingEditForm ? (
                    /* Editing mode - Vocabulary Matching */
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Left Item (Word/Term)</Label>
                        <Input
                          value={matchingEditForm.left_item}
                          onChange={(e) =>
                            setMatchingEditForm({
                              ...matchingEditForm,
                              left_item: e.target.value,
                            })
                          }
                          className="text-sm h-9"
                          placeholder="Enter left item"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Right Item (Match)</Label>
                        <Input
                          value={matchingEditForm.right_item}
                          onChange={(e) =>
                            setMatchingEditForm({
                              ...matchingEditForm,
                              right_item: e.target.value,
                            })
                          }
                          className="text-sm h-9"
                          placeholder="Enter right item"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : editingIndex === index && sentenceEditForm ? (
                    /* Editing mode - Sentence Builder */
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Correct Sentence</Label>
                        <Textarea
                          value={sentenceEditForm.correct_sentence}
                          onChange={(e) =>
                            setSentenceEditForm({
                              correct_sentence: e.target.value,
                            })
                          }
                          className="text-sm min-h-[60px]"
                          placeholder="Enter the correct sentence"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Words will be automatically scrambled for the student.
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : editingIndex === index && wordEditForm ? (
                    /* Editing mode - Word Builder */
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Word to Spell</Label>
                        <Input
                          value={wordEditForm.correct_word}
                          onChange={(e) =>
                            setWordEditForm({
                              ...wordEditForm,
                              correct_word: e.target.value,
                            })
                          }
                          className="text-sm h-9 font-medium"
                          placeholder="Enter the word"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Hint/Definition</Label>
                        <Textarea
                          value={wordEditForm.definition}
                          onChange={(e) =>
                            setWordEditForm({
                              ...wordEditForm,
                              definition: e.target.value,
                            })
                          }
                          className="text-sm min-h-[60px]"
                          placeholder="Enter the hint or definition"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Letters will be automatically scrambled for the student.
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Normal view mode */
                    <>
                      <p className="font-medium text-sm pr-16">
                        {sample.question}
                      </p>
                      {sample.options && (
                        <div className="grid grid-cols-1 gap-1.5 pl-2">
                          {sample.options.map((opt) => (
                            <div
                              key={opt.label}
                              className={`flex items-start gap-2 text-xs ${
                                opt.isCorrect
                                  ? "text-green-700 dark:text-green-400 font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <span
                                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium shrink-0 ${
                                  opt.isCorrect
                                    ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400"
                                    : "bg-gray-100 dark:bg-neutral-800"
                                }`}
                              >
                                {opt.label}
                              </span>
                              <span className="pt-0.5">{opt.text}</span>
                              {opt.isCorrect && (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {sample.details && !sample.options && (
                        <p className="text-xs text-muted-foreground">
                          {sample.details}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}

            {!isExpanded && preview.samples.length > 3 && (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="w-full py-2 text-sm text-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronDown className="inline-block h-4 w-4 mr-1" />
                Show {preview.samples.length - 3} more questions
              </button>
            )}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          {onSave && (
            <Button variant="outline" onClick={onSave}>
              <Save className="mr-2 h-4 w-4" />
              Save to Library
            </Button>
          )}

          {onCreateAssignment && (
            <Button onClick={onCreateAssignment}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          )}

          {onRegenerate && (
            <Button
              variant="ghost"
              onClick={onRegenerate}
              className="col-span-2"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Regenerate with Same Settings
            </Button>
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmIndex !== null}
        onOpenChange={(open) => !open && handleCancelDelete()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

/**
 * Empty state when no content generated yet
 * Position is fixed at top to prevent jumping when switching activity types
 */
export function GenerationPreviewEmpty() {
  return (
    <Card className="h-full min-h-[400px]">
      <CardContent className="pt-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-2">No Content Generated</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Configure your settings and click "Generate Activity" to create
          AI-powered content for your students.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Extract preview data from generated activity
 */
function getPreviewData(
  activityType: ActivityType,
  result: any,
): {
  activityName: string
  stats: Array<{ label: string; value: string | number }>
  samples: Array<{
    question: string
    details?: string
    options?: Array<{ label: string; text: string; isCorrect?: boolean }>
  }>
} {
  // Default preview structure
  let activityName = ""
  let stats: Array<{ label: string; value: string | number }> = []
  let samples: Array<{
    question: string
    details?: string
    options?: Array<{ label: string; text: string; isCorrect?: boolean }>
  }> = []

  switch (activityType) {
    case "ai_quiz":
      activityName = "Quiz"
      stats = [
        { label: "Questions", value: result.questions?.length || 0 },
        { label: "Difficulty", value: result.difficulty || "Medium" },
      ]
      samples = (result.questions || []).map((q: any, i: number) => ({
        question: `Q${i + 1}: ${q.question_text}`,
        options: q.options
          ? q.options.map((opt: string, idx: number) => ({
              label: String.fromCharCode(65 + idx), // A, B, C, D
              text: opt,
              isCorrect: idx === q.correct_index,
            }))
          : undefined,
      }))
      break

    case "vocabulary_quiz": {
      activityName = "Vocabulary Quiz"
      // Count unique words (some questions might have duplicate words)
      const uniqueWords = new Set(
        (result.questions || []).map((q: any) => q.correct_answer),
      )
      stats = [
        { label: "Words", value: uniqueWords.size },
        { label: "Questions", value: result.questions?.length || 0 },
      ]
      samples = (result.questions || []).map((q: any, i: number) => ({
        question: `Q${i + 1}: ${q.correct_answer}`,
        details: q.definition,
      }))
      break
    }

    case "reading_comprehension": {
      activityName = "Reading Comprehension"
      // Calculate word count for passage
      const passageWordCount = result.passage
        ? result.passage.split(/\s+/).length
        : 0
      stats = [
        { label: "Questions", value: result.questions?.length || 0 },
        { label: "Passage Words", value: passageWordCount },
      ]
      samples = (result.questions || []).map((q: any, i: number) => ({
        question: `Q${i + 1}: ${q.question_text}`,
        details: `Type: ${q.question_type || "Unknown"}`,
        options: q.options?.map((opt: string, optIdx: number) => ({
          label: String.fromCharCode(65 + optIdx), // A, B, C, D
          text: opt,
          isCorrect: optIdx === q.correct_index,
        })),
      }))
      break
    }

    case "sentence_builder":
      activityName = "Sentence Builder"
      stats = [
        { label: "Sentences", value: result.sentences?.length || 0 },
        { label: "Difficulty", value: result.difficulty || "Medium" },
      ]
      samples = (result.sentences || []).map((s: any, i: number) => ({
        question: `${i + 1}. ${s.correct_sentence || s.sentence || ""}`,
        details: s.word_count ? `${s.word_count} words` : undefined,
      }))
      break

    case "word_builder":
      activityName = "Word Builder"
      stats = [
        { label: "Words", value: result.words?.length || 0 },
        { label: "Hint Type", value: result.hint_type || "Both" },
      ]
      samples = (result.words || []).map((w: any, i: number) => ({
        // Handle both field naming conventions: word/correct_word
        question: `${i + 1}. ${w.correct_word || w.word || ""}`,
        details: w.definition || w.hint || "",
      }))
      break
  }

  return { activityName, stats, samples }
}
