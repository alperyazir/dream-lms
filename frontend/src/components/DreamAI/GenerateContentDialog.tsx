/**
 * GenerateContentDialog - Professional step-by-step wizard for AI content generation
 *
 * Steps:
 * - Step 0: Select Book
 * - Step 1: Select Modules
 * - Step 2: Activity Type & Options
 * - Step 3: Result/Preview (with edit and delete functionality)
 */

import {
  AlertCircle,
  BookOpen,
  Check,
  Loader2,
  Pencil,
  RotateCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { useMyAIUsage } from "@/hooks/useAIUsage"
import { useCustomToast } from "@/hooks/useCustomToast"
import type { ActivityType } from "@/hooks/useGenerationState"
import { useGenerationState } from "@/hooks/useGenerationState"
import { generateActivity } from "@/lib/generateActivity"
import { cn } from "@/lib/utils"
import { getBooks } from "@/services/booksApi"
import { contentReviewApi } from "@/services/contentReviewApi"
import { type AIModuleSummary, getBookAIModules } from "@/services/dcsAiDataApi"
import type { Book } from "@/types/book"
import {
  ActivityTypeSelector,
  getActivityTypeConfig,
} from "./ActivityTypeSelector"
import { AIGeneratingAnimation } from "./AIGeneratingAnimation"
import { GenerationOptions } from "./GenerationOptions"

interface GenerateContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveSuccess?: () => void
}

const STEPS = [
  { number: 0, label: "Select Book" },
  { number: 1, label: "Select Modules" },
  { number: 2, label: "Activity Type" },
  { number: 3, label: "Review & Save" },
]

export function GenerateContentDialog({
  open,
  onOpenChange,
  onSaveSuccess,
}: GenerateContentDialogProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { data: myUsage, isLoading: isLoadingUsage } = useMyAIUsage()

  const {
    formState,
    setBookId,
    setModuleIds,
    setActivityType,
    setOptions,
    setOption,
    generationState,
    startGeneration,
    setGenerationResult,
    setGenerationError,
    clearGeneration,
    resetForm,
  } = useGenerationState()

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showBackConfirm, setShowBackConfirm] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Book/Module state
  const [books, setBooks] = useState<Book[]>([])
  const [modules, setModules] = useState<AIModuleSummary[]>([])
  const [isLoadingBooks, setIsLoadingBooks] = useState(false)
  const [isLoadingModules, setIsLoadingModules] = useState(false)
  const [bookSearch, setBookSearch] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Edit state for generated questions
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedItem, setEditedItem] = useState<any>(null)

  // Filter books based on search
  const filteredBooks = useMemo(() => {
    if (!bookSearch.trim()) return books
    const searchLower = bookSearch.toLowerCase()
    return books.filter((book) =>
      book.title.toLowerCase().includes(searchLower),
    )
  }, [books, bookSearch])

  const selectedBook = books.find((b) => b.id === formState.bookId)

  // Load books on dialog open
  useEffect(() => {
    if (open && books.length === 0) {
      const loadBooks = async () => {
        try {
          setIsLoadingBooks(true)
          setError(null)
          const response = await getBooks()
          setBooks(response.items || [])
        } catch (err) {
          console.error("Failed to load books:", err)
          setError("Failed to load books")
        } finally {
          setIsLoadingBooks(false)
        }
      }
      loadBooks()
    }
  }, [open, books.length])

  // Load modules when book is selected
  useEffect(() => {
    if (!formState.bookId) {
      setModules([])
      return
    }

    const loadModules = async () => {
      try {
        setIsLoadingModules(true)
        setError(null)
        const response = await getBookAIModules(formState.bookId!)
        setModules(response.modules || [])
      } catch (err: any) {
        console.error("Failed to load AI modules:", err)
        const message =
          err.response?.data?.detail ||
          "Failed to load AI modules. Book may not be AI-processed."
        setError(message)
        setModules([])
      } finally {
        setIsLoadingModules(false)
      }
    }

    loadModules()
  }, [formState.bookId])

  // Reset dialog when closed
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Show confirmation if in the middle of wizard with changes
        if (currentStep > 0 || formState.bookId || generationState.result) {
          setShowCancelConfirm(true)
          return
        }
      }
      if (newOpen) {
        // Reset on open
        setCurrentStep(0)
        setTitle("")
        setDescription("")
        clearGeneration()
        setIsGenerating(false)
        setEditingIndex(null)
        setEditedItem(null)
      }
      onOpenChange(newOpen)
    },
    [
      onOpenChange,
      clearGeneration,
      currentStep,
      formState.bookId,
      generationState.result,
    ],
  )

  // Handle cancel confirm
  const handleConfirmCancel = () => {
    setShowCancelConfirm(false)
    setCurrentStep(0)
    setTitle("")
    setDescription("")
    clearGeneration()
    setIsGenerating(false)
    setEditingIndex(null)
    setEditedItem(null)
    resetForm()
    onOpenChange(false)
  }

  // Handle activity type selection
  const handleActivityTypeSelect = (
    type: ActivityType,
    defaultOptions: Record<string, any>,
  ) => {
    setActivityType(type)
    setOptions(defaultOptions)
  }

  // Step validation
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!formState.bookId
      case 1:
        return formState.moduleIds.length > 0
      case 2:
        return !!formState.activityType
      default:
        return true
    }
  }

  // Handle next step
  const handleNext = async () => {
    if (currentStep === 0 && !formState.bookId) {
      showErrorToast("Please select a book")
      return
    }
    if (currentStep === 1 && formState.moduleIds.length === 0) {
      showErrorToast("Please select at least one module")
      return
    }
    if (currentStep === 2 && !formState.activityType) {
      showErrorToast("Please select an activity type")
      return
    }

    // If on activity type step and clicking next, generate content
    if (currentStep === 2) {
      await handleGenerate()
      return
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  // Handle back step
  const handleBack = () => {
    if (currentStep > 0) {
      // If going back from result step, show confirmation first
      if (currentStep === 3 && generationState.result) {
        setShowBackConfirm(true)
        return
      }
      setCurrentStep((prev) => prev - 1)
    }
  }

  // Confirm going back from result step (discards generated content)
  const handleConfirmBack = () => {
    setShowBackConfirm(false)
    clearGeneration()
    setTitle("")
    setDescription("")
    setEditingIndex(null)
    setEditedItem(null)
    setCurrentStep((prev) => prev - 1)
  }

  // Handle generation
  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      startGeneration()
      const result = await generateActivity(formState)
      setGenerationResult(result)

      // Generate default title
      const activityConfig = formState.activityType
        ? getActivityTypeConfig(formState.activityType)
        : null
      const itemCount = getItemCount(result)
      setTitle(`${activityConfig?.name || "Activity"} - ${itemCount} items`)

      setCurrentStep(3) // Move to result step
    } catch (error: any) {
      console.error("Generation failed:", error)
      const message =
        error.response?.data?.detail || error.message || "Generation failed"
      setGenerationError(message)
      showErrorToast(`Generation failed: ${message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle regenerate
  const handleRegenerate = () => {
    clearGeneration()
    setTitle("")
    setEditingIndex(null)
    setEditedItem(null)
    handleGenerate()
  }

  // Open save dialog
  const handleSave = () => {
    if (!generationState.result) {
      showErrorToast("No content to save")
      return
    }
    // Generate default title if empty
    if (!title.trim()) {
      const activityConfig = formState.activityType
        ? getActivityTypeConfig(formState.activityType)
        : null
      const itemCount = getItemCount(generationState.result)
      setTitle(`${activityConfig?.name || "Activity"} - ${itemCount} items`)
    }
    setShowSaveDialog(true)
  }

  // Confirm save to library
  const handleConfirmSave = async () => {
    if (!generationState.result || !title.trim()) {
      showErrorToast("Please enter a name")
      return
    }

    try {
      setIsSaving(true)
      const result = generationState.result as any

      await contentReviewApi.saveToLibrary({
        quiz_id: result.quiz_id || result.activity_id || "",
        activity_type: formState.activityType || "",
        title: title.trim(),
        description: description.trim() || undefined,
        content: result,
      })

      showSuccessToast("Content saved to library!")
      setShowSaveDialog(false)
      setCurrentStep(0)
      setTitle("")
      setDescription("")
      clearGeneration()
      resetForm()
      onOpenChange(false)
      onSaveSuccess?.()
    } catch (error: any) {
      console.error("Save failed:", error)
      const message =
        error.response?.data?.detail || error.message || "Failed to save"
      showErrorToast(`Save failed: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete item from generated content
  const handleDeleteItem = (index: number) => {
    if (!generationState.result) return

    const result = { ...generationState.result } as any
    const itemsKey = getItemsKey(formState.activityType)

    if (itemsKey && result[itemsKey]) {
      result[itemsKey] = result[itemsKey].filter(
        (_: any, i: number) => i !== index,
      )
      setGenerationResult(result)
    }
  }

  // Handle edit item
  const handleStartEdit = (index: number, item: any) => {
    setEditingIndex(index)
    setEditedItem({ ...item })
  }

  // Handle save edit
  const handleSaveEdit = () => {
    if (editingIndex === null || !editedItem || !generationState.result) return

    const result = { ...generationState.result } as any
    const itemsKey = getItemsKey(formState.activityType)

    if (itemsKey && result[itemsKey]) {
      result[itemsKey] = [...result[itemsKey]]
      result[itemsKey][editingIndex] = editedItem
      setGenerationResult(result)
    }

    setEditingIndex(null)
    setEditedItem(null)
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditedItem(null)
  }

  // Handle add new item
  const handleAddItem = () => {
    if (!generationState.result) return

    const result = { ...generationState.result } as any
    const itemsKey = getItemsKey(formState.activityType)

    // Create empty template based on activity type
    let newItem: any = {}

    switch (formState.activityType) {
      case "vocabulary_quiz":
        newItem = {
          question_id: `q_new_${Date.now()}`,
          definition: "", // This is the question text
          correct_answer: "",
          options: ["", "", "", ""],
          question_type: "definition",
        }
        break
      case "ai_quiz":
        newItem = {
          question_id: `q_new_${Date.now()}`,
          question_text: "",
          options: [
            { text: "", is_correct: true },
            { text: "", is_correct: false },
            { text: "", is_correct: false },
            { text: "", is_correct: false },
          ],
          explanation: "",
        }
        break
      case "reading_comprehension":
        newItem = {
          question_id: `q_new_${Date.now()}`,
          question_text: "",
          question_type: "mcq",
          options: [
            { text: "", is_correct: true },
            { text: "", is_correct: false },
            { text: "", is_correct: false },
            { text: "", is_correct: false },
          ],
          explanation: "",
          passage_reference: "",
        }
        break
      case "sentence_builder":
        newItem = {
          item_id: `s_new_${Date.now()}`,
          correct_sentence: "",
          shuffled_words: [],
          translation: "",
        }
        break
      case "word_builder":
        newItem = {
          item_id: `w_new_${Date.now()}`,
          correct_word: "",
          definition: "",
          scrambled_letters: [],
        }
        break
      default:
        return
    }

    if (itemsKey && result[itemsKey]) {
      result[itemsKey] = [...result[itemsKey], newItem]
      setGenerationResult(result)

      // Start editing the new item
      const newIndex = result[itemsKey].length - 1
      setEditingIndex(newIndex)
      setEditedItem({ ...newItem })
    }
  }

  // Get item count from result
  const getItemCount = (result: any): number => {
    if (result.questions) return result.questions.length
    if (result.pairs) return result.pairs.length
    if (result.sentences) return result.sentences.length
    if (result.words) return result.words.length
    return 0
  }

  // Get items key based on activity type
  const getItemsKey = (type: ActivityType | null): string | null => {
    switch (type) {
      case "vocabulary_quiz":
      case "ai_quiz":
      case "reading_comprehension":
        return "questions"
      case "sentence_builder":
        return "sentences"
      case "word_builder":
        return "words"
      default:
        return null
    }
  }

  const getItemLabel = (type: ActivityType | null): string => {
    switch (type) {
      case "vocabulary_quiz":
      case "ai_quiz":
      case "reading_comprehension":
        return "questions"
      case "sentence_builder":
        return "sentences"
      case "word_builder":
        return "words"
      default:
        return "items"
    }
  }

  // Handle module toggle
  const toggleModule = (moduleId: number) => {
    const newModuleIds = formState.moduleIds.includes(moduleId)
      ? formState.moduleIds.filter((id) => id !== moduleId)
      : [...formState.moduleIds, moduleId]
    setModuleIds(newModuleIds)
  }

  // Select all modules
  const handleSelectAllModules = () => {
    setModuleIds(modules.map((m) => m.module_id))
  }

  // Clear all modules
  const handleClearModules = () => {
    setModuleIds([])
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-[95vw] w-[1100px] h-[90vh] max-h-[900px] overflow-hidden flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Generate AI Content
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="relative mb-4 shrink-0">
            {/* Progress Bar Background */}
            <div className="absolute top-2.5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
            {/* Progress Bar Fill */}
            <div
              className="absolute top-2.5 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
              style={{
                width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
              }}
            />

            {/* Steps */}
            <div className="relative flex justify-between">
              {STEPS.map((step) => {
                const isCompleted = currentStep > step.number
                const isCurrent = currentStep === step.number

                return (
                  <div key={step.number} className="flex flex-col items-center">
                    {/* Step Circle */}
                    <div
                      className={cn(
                        "relative flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium transition-all duration-200",
                        isCompleted
                          ? "bg-purple-500 text-white shadow-sm"
                          : isCurrent
                            ? "bg-purple-500 text-white ring-2 ring-purple-500/20 shadow-md"
                            : "bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600",
                      )}
                    >
                      {isCompleted ? (
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <span>{step.number + 1}</span>
                      )}
                    </div>
                    {/* Step Label */}
                    <span
                      className={cn(
                        "text-[9px] mt-1 font-medium transition-colors whitespace-nowrap",
                        isCompleted || isCurrent
                          ? "text-purple-600 dark:text-purple-400"
                          : "text-gray-400 dark:text-gray-500",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-hidden min-h-0">
            {/* Step 0: Select Book */}
            {currentStep === 0 && (
              <StepSelectBook
                books={filteredBooks}
                selectedBookId={formState.bookId}
                isLoading={isLoadingBooks}
                bookSearch={bookSearch}
                onSearchChange={setBookSearch}
                onBookSelect={(id) => {
                  setBookId(id)
                  setModuleIds([]) // Clear modules when book changes
                }}
                error={error}
              />
            )}

            {/* Step 1: Select Modules */}
            {currentStep === 1 && (
              <StepSelectModules
                book={selectedBook}
                modules={modules}
                selectedModuleIds={formState.moduleIds}
                isLoading={isLoadingModules}
                onToggleModule={toggleModule}
                onSelectAll={handleSelectAllModules}
                onClearAll={handleClearModules}
                error={error}
              />
            )}

            {/* Step 2: Activity Type & Options */}
            {currentStep === 2 && !isGenerating && (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  <ActivityTypeSelector
                    selectedType={formState.activityType}
                    onSelect={handleActivityTypeSelect}
                  />

                  {formState.activityType && (
                    <GenerationOptions
                      activityType={formState.activityType}
                      options={formState.options}
                      onOptionChange={setOption}
                    />
                  )}

                  <p className="text-xs text-center text-muted-foreground">
                    AI-generated content may contain errors. Please review
                    before use.
                  </p>
                </div>
              </ScrollArea>
            )}

            {/* Generating Animation */}
            {isGenerating && (
              <div className="h-full flex items-center justify-center">
                <AIGeneratingAnimation activityType={formState.activityType} />
              </div>
            )}

            {/* Step 3: Result/Preview */}
            {currentStep === 3 && !isGenerating && generationState.result && (
              <StepResultPreview
                activityType={formState.activityType}
                result={generationState.result}
                editingIndex={editingIndex}
                editedItem={editedItem}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditedItemChange={setEditedItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                getItemLabel={getItemLabel}
                getItemCount={getItemCount}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t mt-4 shrink-0">
            {/* Left side: Quota display */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-purple-500" />
              {isLoadingUsage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : myUsage ? (
                <span>
                  {myUsage.remaining_quota} / {myUsage.monthly_quota} remaining
                </span>
              ) : (
                <span>--</span>
              )}
            </div>

            {/* Right side: Action buttons */}
            <div className="flex items-center gap-2">
              {currentStep === 3 ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={isSaving || isGenerating}
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={isSaving || isGenerating}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !title.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save to Library
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 0}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed() || isGenerating}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : currentStep === 2 ? (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    ) : (
                      "Next"
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Content Generation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel? All progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Back Confirmation Dialog (from result step) */}
      <AlertDialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Generated Content?</AlertDialogTitle>
            <AlertDialogDescription>
              Going back will discard all generated content. You will need to
              regenerate the content if you continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBack}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard & Go Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Content Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Save to Library</AlertDialogTitle>
            <AlertDialogDescription>
              Give your content a name to save it to the library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="content-name">Name *</Label>
              <Input
                id="content-name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Unit 1 Vocabulary Quiz"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content-description">
                Description (Optional)
              </Label>
              <Textarea
                id="content-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this content..."
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              disabled={!title.trim() || isSaving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save to Library"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Step 0: Select Book
 */
interface StepSelectBookProps {
  books: Book[]
  selectedBookId: number | null
  isLoading: boolean
  bookSearch: string
  onSearchChange: (search: string) => void
  onBookSelect: (bookId: number | null) => void
  error: string | null
}

function StepSelectBook({
  books,
  selectedBookId,
  isLoading,
  bookSearch,
  onSearchChange,
  onBookSelect,
  error,
}: StepSelectBookProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-1">Select a Book</h3>
        <p className="text-sm text-muted-foreground">
          Choose a book to generate AI content from
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search books..."
          value={bookSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Book Grid */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : books.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {bookSearch ? "No books match your search" : "No books available"}
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 pb-4 pr-4">
            {books.map((book) => (
              <button
                key={book.id}
                onClick={() =>
                  onBookSelect(selectedBookId === book.id ? null : book.id)
                }
                className={cn(
                  "relative flex flex-col rounded-lg border-2 p-2 transition-all hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                  selectedBookId === book.id
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : "border-muted bg-card",
                )}
              >
                {/* Book Cover */}
                <div className="aspect-[3/4] w-full rounded overflow-hidden bg-muted">
                  {book.cover_image_url ? (
                    <img
                      src={book.cover_image_url}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20">
                      <BookOpen className="h-8 w-8 text-purple-400" />
                    </div>
                  )}
                </div>

                {/* Book Title */}
                <p className="mt-2 text-xs font-medium text-center line-clamp-2 leading-tight">
                  {book.title}
                </p>

                {/* Selected Indicator */}
                {selectedBookId === book.id && (
                  <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

/**
 * Step 1: Select Modules
 */
interface StepSelectModulesProps {
  book: Book | undefined
  modules: AIModuleSummary[]
  selectedModuleIds: number[]
  isLoading: boolean
  onToggleModule: (moduleId: number) => void
  onSelectAll: () => void
  onClearAll: () => void
  error: string | null
}

function StepSelectModules({
  book,
  modules,
  selectedModuleIds,
  isLoading,
  onToggleModule,
  onSelectAll,
  onClearAll,
  error,
}: StepSelectModulesProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Select Modules</h3>
          {book && (
            <p className="text-sm text-muted-foreground">
              from <span className="font-medium">{book.title}</span>
            </p>
          )}
        </div>
        {modules.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              disabled={selectedModuleIds.length === modules.length}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              disabled={selectedModuleIds.length === 0}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">
              Loading modules...
            </span>
          </div>
        ) : modules.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No AI-processed modules found for this book
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2 pr-4">
            {modules.map((module) => (
              <div
                key={module.module_id}
                onClick={() => onToggleModule(module.module_id)}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                  selectedModuleIds.includes(module.module_id)
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : "border-muted hover:border-purple-300 hover:bg-muted/50",
                )}
              >
                <Checkbox
                  checked={selectedModuleIds.includes(module.module_id)}
                  onCheckedChange={() => onToggleModule(module.module_id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{module.title}</div>
                  <p className="text-sm text-muted-foreground">
                    {module.pages.length > 0
                      ? `Pages ${module.pages[0]}-${module.pages[module.pages.length - 1]}`
                      : "No pages"}{" "}
                    • {module.word_count.toLocaleString()} words
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Selection summary */}
      {selectedModuleIds.length > 0 && (
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          {selectedModuleIds.length} module
          {selectedModuleIds.length > 1 ? "s" : ""} selected
        </div>
      )}
    </div>
  )
}

/**
 * Step 3: Result Preview with Edit/Delete
 */
interface StepResultPreviewProps {
  activityType: ActivityType | null
  result: any
  editingIndex: number | null
  editedItem: any
  onStartEdit: (index: number, item: any) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditedItemChange: (item: any) => void
  onDeleteItem: (index: number) => void
  onAddItem: () => void
  getItemLabel: (type: ActivityType | null) => string
  getItemCount: (result: any) => number
}

function StepResultPreview({
  activityType,
  result,
  editingIndex,
  editedItem,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditedItemChange,
  onDeleteItem,
  onAddItem,
  getItemLabel,
  getItemCount,
}: StepResultPreviewProps) {
  const activityConfig = activityType
    ? getActivityTypeConfig(activityType)
    : null

  const items =
    result.questions || result.pairs || result.sentences || result.words || []
  const itemCount = getItemCount(result)
  const itemLabel = getItemLabel(activityType)

  // Check if this is a card-style activity (word builder, sentence builder)
  const isCardStyle =
    activityType === "word_builder" || activityType === "sentence_builder"

  return (
    <div className="h-full flex flex-col">
      {/* Summary Header */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-4">
        <div className="p-2 rounded-md bg-green-500/10">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <div className="font-medium text-green-800 dark:text-green-200">
            Content Generated Successfully
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">
            {activityConfig?.name} • {itemCount} {itemLabel}
          </div>
        </div>
      </div>

      {/* Reading Comprehension Passage */}
      {activityType === "reading_comprehension" &&
        (result.passage || result.passage_text) && (
          <div className="mb-4">
            <Label className="mb-2 block">Reading Passage</Label>
            <ScrollArea className="h-[150px]">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {result.passage || result.passage_text}
                </p>
              </div>
            </ScrollArea>
          </div>
        )}

      {/* Items Header with Add Button */}
      <div className="flex items-center justify-between mb-2">
        <Label>
          Generated {itemLabel} ({itemCount})
        </Label>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddItem}
          className="text-purple-600 border-purple-300 hover:bg-purple-50"
        >
          <svg
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add {itemLabel.slice(0, -1)}
        </Button>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full border rounded-lg">
          <div className="p-4 space-y-3">
            {items.map((item: any, index: number) => (
              <div key={index} className="relative">
                {editingIndex === index ? (
                  <EditableItemForm
                    activityType={activityType}
                    item={editedItem}
                    onChange={onEditedItemChange}
                    onSave={onSaveEdit}
                    onCancel={onCancelEdit}
                  />
                ) : isCardStyle ? (
                  // Word Builder / Sentence Builder - List with chips
                  <div className="p-3 rounded-md bg-muted/50 border group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-muted-foreground text-xs">
                            #{index + 1}
                          </span>
                          {activityType === "word_builder" && (
                            <span className="text-sm text-muted-foreground">
                              {item.definition || item.hint}
                            </span>
                          )}
                          {activityType === "sentence_builder" &&
                            item.translation && (
                              <span className="text-sm text-muted-foreground italic">
                                {item.translation}
                              </span>
                            )}
                        </div>
                        {/* Word/Letter chips */}
                        <div className="flex flex-wrap gap-1.5">
                          {activityType === "word_builder" &&
                            (item.correct_word || item.word || "")
                              .split("")
                              .map((letter: string, i: number) => (
                                <span
                                  key={i}
                                  className="w-8 h-8 flex items-center justify-center text-sm font-bold bg-white dark:bg-neutral-800 rounded-md border-2 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 shadow-sm"
                                >
                                  {letter.toUpperCase()}
                                </span>
                              ))}
                          {activityType === "sentence_builder" &&
                            (item.correct_sentence || "")
                              .split(/\s+/)
                              .filter(Boolean)
                              .map((word: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-neutral-800 rounded-md border-2 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 shadow-sm"
                                >
                                  {word}
                                </span>
                              ))}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onStartEdit(index, item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDeleteItem(index)}
                          disabled={itemCount <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Quiz types - standard list
                  <div className="p-3 rounded-md bg-muted/50 border group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-muted-foreground mb-1 text-xs">
                          #{index + 1}
                        </div>
                        <PreviewItemContent
                          activityType={activityType}
                          item={item}
                        />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onStartEdit(index, item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDeleteItem(index)}
                          disabled={itemCount <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

/**
 * Preview item content based on activity type
 * Shows all relevant fields including options for any type that has them
 */
function PreviewItemContent({
  activityType,
  item,
}: {
  activityType: ActivityType | null
  item: any
}) {
  // Helper to check if an option is the correct answer
  const isCorrectOption = (opt: any, index: number): boolean => {
    // Object options with is_correct field
    if (typeof opt === "object" && opt.is_correct !== undefined) {
      return opt.is_correct
    }
    // String options - compare with correct_answer field
    const optText = typeof opt === "object" ? opt.text : opt
    if (item.correct_answer !== undefined) {
      // Could be index or text match
      if (typeof item.correct_answer === "number") {
        return index === item.correct_answer
      }
      return optText === item.correct_answer
    }
    return false
  }

  // Common options display component with correct answer highlighting
  const renderOptions = (options: any[]) => (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {options.map((opt: any, i: number) => {
        const isCorrect = isCorrectOption(opt, i)
        const optText = typeof opt === "object" ? opt.text : opt
        return (
          <span
            key={i}
            className={cn(
              "text-xs px-2 py-1 rounded-md border",
              isCorrect
                ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700 font-medium"
                : "bg-muted/50 text-muted-foreground border-muted",
            )}
          >
            {isCorrect && <Check className="h-3 w-3 inline mr-1" />}
            {optText}
          </span>
        )
      })}
    </div>
  )

  switch (activityType) {
    case "vocabulary_quiz":
      return (
        <div>
          <div className="text-sm mb-2">{item.definition}</div>
          {item.options &&
            Array.isArray(item.options) &&
            item.options.length > 0 &&
            renderOptions(item.options)}
          {item.question_type && (
            <div className="mt-2 text-xs text-muted-foreground">
              Type:{" "}
              {item.question_type === "definition"
                ? "Definition"
                : item.question_type === "synonym"
                  ? "Synonym"
                  : "Antonym"}
              {" • "}Answer:{" "}
              <span className="font-medium text-green-600">
                {item.correct_answer}
              </span>
            </div>
          )}
        </div>
      )
    case "ai_quiz":
    case "reading_comprehension":
      return (
        <div>
          <div className="text-sm">{item.question_text}</div>
          {item.options &&
            Array.isArray(item.options) &&
            item.options.length > 0 &&
            renderOptions(item.options)}
          {item.explanation && (
            <div className="mt-2 text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
              {item.explanation}
            </div>
          )}
        </div>
      )
    case "sentence_builder":
      return (
        <div>
          <div className="text-sm">{item.correct_sentence}</div>
          {item.translation && (
            <div className="text-xs text-muted-foreground mt-1">
              Translation: {item.translation}
            </div>
          )}
        </div>
      )
    case "word_builder":
      return (
        <div>
          <div className="font-medium">{item.correct_word}</div>
          <div className="text-sm text-muted-foreground">
            {item.definition || item.hint}
          </div>
          {item.scrambled_letters && (
            <div className="text-xs text-muted-foreground mt-1">
              Letters: {item.scrambled_letters.join(", ")}
            </div>
          )}
        </div>
      )
    default:
      // Fallback: show all fields
      return (
        <div className="space-y-1">
          {Object.entries(item).map(([key, value]) => {
            if (key === "options" && Array.isArray(value)) {
              return (
                <div key={key}>
                  <span className="text-xs text-muted-foreground">{key}: </span>
                  {renderOptions(value as any[])}
                </div>
              )
            }
            if (typeof value === "string" || typeof value === "number") {
              return (
                <div key={key} className="text-sm">
                  <span className="text-muted-foreground">{key}: </span>
                  {String(value)}
                </div>
              )
            }
            return null
          })}
        </div>
      )
  }
}

/**
 * Editable item form based on activity type
 * Comprehensive editing for all fields including options with correct answer selection
 */
function EditableItemForm({
  activityType,
  item,
  onChange,
  onSave,
  onCancel,
}: {
  activityType: ActivityType | null
  item: any
  onChange: (item: any) => void
  onSave: () => void
  onCancel: () => void
}) {
  const updateField = (field: string, value: any) => {
    onChange({ ...item, [field]: value })
  }

  const updateObjectOption = (
    optionIndex: number,
    field: string,
    value: any,
  ) => {
    const newOptions = [...(item.options || [])]
    newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value }
    // If setting is_correct to true, set others to false
    if (field === "is_correct" && value === true) {
      newOptions.forEach((opt, i) => {
        if (i !== optionIndex && typeof opt === "object") {
          opt.is_correct = false
        }
      })
    }
    onChange({ ...item, options: newOptions })
  }

  const updateSimpleOption = (optionIndex: number, value: string) => {
    const newOptions = [...(item.options || [])]
    // If this was the correct answer, update correct_answer too
    if (newOptions[optionIndex] === item.correct_answer) {
      onChange({
        ...item,
        options: newOptions.map((o, i) => (i === optionIndex ? value : o)),
        correct_answer: value,
      })
    } else {
      newOptions[optionIndex] = value
      onChange({ ...item, options: newOptions })
    }
  }

  const setCorrectAnswer = (optionValue: string) => {
    onChange({ ...item, correct_answer: optionValue })
  }

  // Check if options are objects or simple strings
  const hasObjectOptions =
    item.options &&
    item.options.length > 0 &&
    typeof item.options[0] === "object"

  // Helper to check if option is correct (for simple string options)
  const isCorrectSimpleOption = (opt: string): boolean => {
    return item.correct_answer === opt
  }

  return (
    <div className="p-4 rounded-md border border-muted-foreground/30 bg-muted/50 space-y-4">
      {/* Vocabulary Quiz */}
      {activityType === "vocabulary_quiz" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Question</Label>
            <Textarea
              value={item.definition || ""}
              onChange={(e) => updateField("definition", e.target.value)}
              rows={2}
              placeholder="e.g., Which word means 'a feeling of happiness'?"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Correct Answer</Label>
            <Input
              value={item.correct_answer || ""}
              onChange={(e) => updateField("correct_answer", e.target.value)}
              placeholder="The correct word"
            />
          </div>
          {item.options && item.options.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Options (Select correct answer)
              </Label>
              {item.options.map((opt: any, i: number) => {
                const optText = hasObjectOptions ? opt.text : opt
                const isCorrect = hasObjectOptions
                  ? opt.is_correct
                  : isCorrectSimpleOption(opt)
                return (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-option-${activityType}`}
                      checked={isCorrect}
                      onChange={() => {
                        if (hasObjectOptions) {
                          // Set this one as correct, others as false
                          const newOptions = item.options.map(
                            (o: any, idx: number) => ({
                              ...o,
                              is_correct: idx === i,
                            }),
                          )
                          onChange({ ...item, options: newOptions })
                        } else {
                          setCorrectAnswer(opt)
                        }
                      }}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                    />
                    <Input
                      value={optText || ""}
                      onChange={(e) => {
                        if (hasObjectOptions) {
                          updateObjectOption(i, "text", e.target.value)
                        } else {
                          updateSimpleOption(i, e.target.value)
                        }
                      }}
                      className={cn(
                        "flex-1",
                        isCorrect &&
                          "border-green-500 bg-green-50 dark:bg-green-900/20",
                      )}
                      placeholder={`Option ${i + 1}`}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* AI Quiz & Reading Comprehension */}
      {(activityType === "ai_quiz" ||
        activityType === "reading_comprehension") && (
        <>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Question</Label>
            <Textarea
              value={item.question_text || ""}
              onChange={(e) => updateField("question_text", e.target.value)}
              rows={2}
            />
          </div>
          {item.options && item.options.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Options (Select correct answer)
              </Label>
              {item.options.map((opt: any, i: number) => {
                const optText = hasObjectOptions ? opt.text : opt
                const isCorrect = hasObjectOptions
                  ? opt.is_correct
                  : isCorrectSimpleOption(opt)
                return (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-option-${activityType}`}
                      checked={isCorrect}
                      onChange={() => {
                        if (hasObjectOptions) {
                          // Set this one as correct, others as false
                          const newOptions = item.options.map(
                            (o: any, idx: number) => ({
                              ...o,
                              is_correct: idx === i,
                            }),
                          )
                          onChange({ ...item, options: newOptions })
                        } else {
                          setCorrectAnswer(opt)
                        }
                      }}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                    />
                    <Input
                      value={optText || ""}
                      onChange={(e) => {
                        if (hasObjectOptions) {
                          updateObjectOption(i, "text", e.target.value)
                        } else {
                          updateSimpleOption(i, e.target.value)
                        }
                      }}
                      className={cn(
                        "flex-1",
                        isCorrect &&
                          "border-green-500 bg-green-50 dark:bg-green-900/20",
                      )}
                      placeholder={`Option ${i + 1}`}
                    />
                  </div>
                )
              })}
            </div>
          )}
          {(item.explanation !== undefined || activityType === "ai_quiz") && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">Explanation</Label>
              <Textarea
                value={item.explanation || ""}
                onChange={(e) => updateField("explanation", e.target.value)}
                rows={2}
                placeholder="Explain why this is the correct answer..."
              />
            </div>
          )}
        </>
      )}

      {/* Sentence Builder */}
      {activityType === "sentence_builder" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Correct Sentence</Label>
            <Textarea
              value={item.correct_sentence || ""}
              onChange={(e) => updateField("correct_sentence", e.target.value)}
              rows={2}
            />
          </div>
          {(item.translation !== undefined || true) && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Translation (Optional)
              </Label>
              <Input
                value={item.translation || ""}
                onChange={(e) => updateField("translation", e.target.value)}
                placeholder="Translation of the sentence..."
              />
            </div>
          )}
        </>
      )}

      {/* Word Builder */}
      {activityType === "word_builder" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Correct Word</Label>
            <Input
              value={item.correct_word || ""}
              onChange={(e) => updateField("correct_word", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Definition / Hint</Label>
            <Textarea
              value={item.definition || item.hint || ""}
              onChange={(e) => updateField("definition", e.target.value)}
              rows={2}
            />
          </div>
        </>
      )}

      {/* Fallback for unknown types - show all editable string fields */}
      {![
        "vocabulary_quiz",
        "ai_quiz",
        "reading_comprehension",
        "sentence_builder",
        "word_builder",
      ].includes(activityType || "") && (
        <div className="space-y-2">
          {Object.entries(item).map(([key, value]) => {
            if (typeof value === "string") {
              return (
                <div key={key} className="space-y-1">
                  <Label className="text-xs font-medium capitalize">
                    {key.replace(/_/g, " ")}
                  </Label>
                  <Input
                    value={value}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                </div>
              )
            }
            return null
          })}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Check className="h-4 w-4 mr-1" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
