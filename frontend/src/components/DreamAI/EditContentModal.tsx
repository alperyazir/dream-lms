/**
 * EditContentModal - Edit saved content including questions and options
 * Story 27.21: Content Library UI
 *
 * Allows editing content title and individual questions/items.
 */

import { AlertCircle, Loader2, Plus, Save, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"
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
import { Label } from "@/components/ui/label"
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
import type { ContentItem } from "@/types/content-library"

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

  // Reset state when content changes
  useEffect(() => {
    if (detailedContent) {
      setTitle(detailedContent.title)
      setEditedContent(structuredClone(detailedContent.content))
      setHasChanges(false)
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

  // Reading comprehension passage handler
  const updatePassage = (value: string) => {
    setEditedContent({ ...editedContent, passage: value })
    markChanged()
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

    // Reading Comprehension
    if (content.activity_type === "reading_comprehension") {
      const questions = editedContent.questions || []
      return (
        <div className="space-y-4">
          {/* Passage */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Passage</Label>
            <Textarea
              value={editedContent.passage || ""}
              onChange={(e) => updatePassage(e.target.value)}
              rows={6}
              placeholder="Enter the reading passage..."
              className="resize-none"
            />
          </div>

          {/* Questions */}
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
                      <Label className="text-xs text-muted-foreground">
                        Options (select correct answer)
                      </Label>
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
                              id={`rc${qIdx}-opt${optIdx}`}
                            />
                            <Input
                              value={opt.text || ""}
                              onChange={(e) =>
                                updateAIOption(qIdx, optIdx, e.target.value)
                              }
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 h-8 text-sm"
                            />
                          </div>
                        ))}
                      </RadioGroup>
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
        </div>
      )
    }

    // Sentence builder
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${colorClasses.bg}`}>
              <IconComponent className={`h-6 w-6 ${colorClasses.text}`} />
            </div>
            <div className="flex-1">
              <DialogTitle>Edit Content</DialogTitle>
              <DialogDescription>
                {config.label}
                {hasChanges && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Unsaved changes
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator className="flex-shrink-0" />

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load content. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && detailedContent && (
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-4 pb-4">
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
          </div>
        )}

        <DialogFooter className="flex-shrink-0 gap-2 pt-4 border-t">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
