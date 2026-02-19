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
  Eye,
  Headphones,
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useMyAIUsage } from "@/hooks/useAIUsage"
import { useCustomToast } from "@/hooks/useCustomToast"
import type { ActivityType } from "@/hooks/useGenerationState"
import { useGenerationState } from "@/hooks/useGenerationState"
import {
  generateActivity,
  generateActivityV2,
  generateActivityV2Stream,
} from "@/lib/generateActivity"
import type { GenerationResponseV2 } from "@/services/generationV2Api"
import { cn } from "@/lib/utils"
import { getAuthenticatedCoverUrl, getBooks } from "@/services/booksApi"
import { contentReviewApi } from "@/services/contentReviewApi"
import { type AIModuleSummary, getBookAIModules } from "@/services/dcsAiDataApi"
import type { Book } from "@/types/book"
import {
  ActivityTypeSelector,
  getActivityTypeConfig,
} from "./ActivityTypeSelector"
import { AIGeneratingAnimation } from "./AIGeneratingAnimation"
import { GenerationOptions } from "./GenerationOptions"
import { FormatSelectionPanel } from "./FormatSelectionPanel"
import { GenerationConfigPanel } from "./GenerationConfigPanel"
import { PassageAudioPlayer } from "./PassageAudioPlayer"
import { SkillSelectionGrid } from "./SkillSelectionGrid"
import type { SkillWithFormats } from "@/types/skill"
import { getSkills } from "@/services/skillsApi"
import { generatePassageAudio } from "@/services/passageAudioApi"

interface GenerateContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveSuccess?: () => void
}

const STEPS = [
  { number: 0, label: "Select Book" },
  { number: 1, label: "Select Modules" },
  { number: 2, label: "Select Skill" },
  { number: 3, label: "Activity Type" },
  { number: 4, label: "Review & Save" },
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
    setSkillSlug,
    setFormatSlug,
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
  // SSE streaming state for reading comprehension
  const [streamingPassages, setStreamingPassages] = useState<any[]>([])
  const [streamingTotal, setStreamingTotal] = useState(0)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  // Passage audio generation state
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)

  // Book/Module state
  const [books, setBooks] = useState<Book[]>([])
  const [modules, setModules] = useState<AIModuleSummary[]>([])
  const [isLoadingBooks, setIsLoadingBooks] = useState(false)
  const [isLoadingModules, setIsLoadingModules] = useState(false)
  const [bookSearch, setBookSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [coverUrls, setCoverUrls] = useState<Record<number, string>>({})

  // Skills state (Epic 30)
  const [skills, setSkills] = useState<SkillWithFormats[]>([])
  const [isLoadingSkills, setIsLoadingSkills] = useState(false)

  // Load cover URLs for books
  useEffect(() => {
    const loadCovers = async () => {
      const urls: Record<number, string> = {}
      for (const book of books) {
        if (book.cover_image_url) {
          const url = await getAuthenticatedCoverUrl(book.cover_image_url)
          if (url) urls[book.id] = url
        }
      }
      setCoverUrls(urls)
    }
    if (books.length > 0) loadCovers()
  }, [books])

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

  // Load skills on dialog open (Epic 30)
  useEffect(() => {
    if (open && skills.length === 0) {
      const loadSkills = async () => {
        try {
          setIsLoadingSkills(true)
          const data = await getSkills()
          setSkills(data)
        } catch (err) {
          console.error("Failed to load skills:", err)
        } finally {
          setIsLoadingSkills(false)
        }
      }
      loadSkills()
    }
  }, [open, skills.length])

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
        setStreamingPassages([])
        setStreamingTotal(0)
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
    setV2Response(null)
    setIsGenerating(false)
    setStreamingPassages([])
    setStreamingTotal(0)
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
        return !!formState.skillSlug
      case 3:
        // Skill-based flow: need formatSlug; Legacy flow: need activityType
        if (formState.skillSlug) {
          return !!formState.formatSlug
        }
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
    if (currentStep === 2 && !formState.skillSlug) {
      showErrorToast("Please select a skill")
      return
    }
    if (currentStep === 3) {
      // Skill-based flow: need formatSlug; Legacy flow: need activityType
      if (formState.skillSlug && !formState.formatSlug) {
        showErrorToast("Please select an activity format")
        return
      }
      if (!formState.skillSlug && !formState.activityType) {
        showErrorToast("Please select an activity type")
        return
      }
    }

    // If Mix is selected at step 2, skip format step → go to generation
    if (currentStep === 2 && formState.skillSlug === "mix") {
      setOptions({ count: 10, difficulty: "auto" })
      await handleGenerate()
      return
    }

    // If on activity type step and clicking next, generate content
    if (currentStep === 3) {
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
      if (currentStep === 4 && generationState.result) {
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
    setV2Response(null)
    setStreamingPassages([])
    setStreamingTotal(0)
    setTitle("")
    setDescription("")
    setEditingIndex(null)
    setEditedItem(null)
    setCurrentStep((prev) => prev - 1)
  }

  // V2 response state (stores skill metadata from V2 endpoint)
  const [v2Response, setV2Response] = useState<GenerationResponseV2 | null>(
    null,
  )

  // Effective activity type — v2 response takes priority over form state
  const effectiveActivityType: ActivityType | null =
    (v2Response?.activity_type as ActivityType) || formState.activityType

  // Check if this is a multi-passage reading comprehension request
  const isStreamableRC = () => {
    const passageCount = formState.options.passage_count || 1
    // Format slug is "comprehension" from skill-format selection (reading + comprehension)
    return formState.skillSlug === "reading" && passageCount > 1
  }

  // Handle passage audio generation
  // contentOverride: pass in the content object directly when calling from
  // handleGenerate to avoid reading stale generationState.result
  const handleGenerateAudio = async (
    passageText: string,
    passageIndex?: number,
    contentOverride?: any,
    voiceOverride?: string,
    questionIndex?: number,
    itemIndex?: number,
  ) => {
    try {
      setIsGeneratingAudio(true)
      const audioResult = await generatePassageAudio({
        text: passageText,
        voice_id: voiceOverride || formState.options.voice_id || undefined,
      })
      const audioData = {
        audio_base64: audioResult.audio_base64,
        word_timestamps: audioResult.word_timestamps,
        duration_seconds: audioResult.duration_seconds,
      }

      // Use contentOverride if provided (from auto-trigger), else current state
      const base = contentOverride ?? generationState.result
      const result = { ...(base as any) }

      if (itemIndex !== undefined && result.items) {
        // Fill blank: attach audio_data to specific item
        result.items = [...result.items]
        result.items[itemIndex] = {
          ...result.items[itemIndex],
          audio_data: audioData,
          audio_status: "ready",
        }
      } else if (questionIndex !== undefined && result.questions) {
        // Listening quiz: attach audio_data to specific question
        result.questions = [...result.questions]
        result.questions[questionIndex] = {
          ...result.questions[questionIndex],
          audio_data: audioData,
          audio_status: "ready",
        }
      } else if (passageIndex !== undefined && result.passages) {
        // Multi-passage: attach to specific passage
        result.passages = [...result.passages]
        result.passages[passageIndex] = {
          ...result.passages[passageIndex],
          passage_audio: audioData,
        }
      } else {
        // Single passage
        result.passage_audio = audioData
      }

      setGenerationResult(result)
    } catch (error: any) {
      console.error("Audio generation failed:", error)
      const message =
        error.response?.data?.detail || error.message || "Audio generation failed"
      showErrorToast(`Audio generation failed: ${message}`)
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  /** Auto-generate audio for all listening quiz questions sequentially */
  const handleGenerateListeningAudio = async (
    questions: any[],
    contentOverride: any,
  ) => {
    let currentContent = { ...contentOverride }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.audio_text) continue
      try {
        setIsGeneratingAudio(true)
        const audioResult = await generatePassageAudio({
          text: q.audio_text,
          voice_id: formState.options.voice_id || undefined,
        })
        const audioData = {
          audio_base64: audioResult.audio_base64,
          word_timestamps: audioResult.word_timestamps,
          duration_seconds: audioResult.duration_seconds,
        }
        currentContent = { ...currentContent }
        currentContent.questions = [...currentContent.questions]
        currentContent.questions[i] = {
          ...currentContent.questions[i],
          audio_data: audioData,
          audio_status: "ready",
        }
        setGenerationResult(currentContent)
      } catch (error: any) {
        console.error(`Audio generation failed for question ${i}:`, error)
        // Mark as failed but continue with remaining questions
        currentContent = { ...currentContent }
        currentContent.questions = [...currentContent.questions]
        currentContent.questions[i] = {
          ...currentContent.questions[i],
          audio_status: "failed",
        }
        setGenerationResult(currentContent)
      }
    }
    setIsGeneratingAudio(false)
  }

  /** Auto-generate audio for all listening fill blank items sequentially */
  const handleGenerateListeningFillBlankAudio = async (
    items: any[],
    contentOverride: any,
    textKey: string = "full_sentence",
  ) => {
    // Determine which key holds the items array in the content object
    const arrayKey = contentOverride.items
      ? "items"
      : contentOverride.sentences
        ? "sentences"
        : contentOverride.words
          ? "words"
          : "items"
    let currentContent = { ...contentOverride }
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const text = item[textKey]
      if (!text) continue
      try {
        setIsGeneratingAudio(true)
        const audioResult = await generatePassageAudio({
          text,
          voice_id: formState.options.voice_id || undefined,
        })
        const audioData = {
          audio_base64: audioResult.audio_base64,
          word_timestamps: audioResult.word_timestamps,
          duration_seconds: audioResult.duration_seconds,
        }
        currentContent = { ...currentContent }
        currentContent[arrayKey] = [...currentContent[arrayKey]]
        currentContent[arrayKey][i] = {
          ...currentContent[arrayKey][i],
          audio_data: audioData,
          audio_status: "ready",
        }
        setGenerationResult(currentContent)
      } catch (error: any) {
        console.error(`Audio generation failed for item ${i}:`, error)
        currentContent = { ...currentContent }
        currentContent[arrayKey] = [...currentContent[arrayKey]]
        currentContent[arrayKey][i] = {
          ...currentContent[arrayKey][i],
          audio_status: "failed",
        }
        setGenerationResult(currentContent)
      }
    }
    setIsGeneratingAudio(false)
  }

  // Handle generation
  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      startGeneration()

      if (formState.skillSlug && isStreamableRC()) {
        // SSE streaming path for multi-passage reading comprehension
        setStreamingPassages([])
        setStreamingTotal(formState.options.passage_count || 1)
        setCurrentStep(4) // Move to result step immediately to show progress

        await generateActivityV2Stream(formState, {
          onPassage: (passage) => {
            setStreamingPassages((prev) => {
              const updated = [...prev, passage]
              // Sort by passage title (Passage 1, Passage 2, etc.)
              updated.sort((a, b) => (a.module_title || "").localeCompare(b.module_title || ""))
              return updated
            })
          },
          onComplete: (data) => {
            // Build final content from streamed data
            const passages = data.passages || []
            passages.sort((a: any, b: any) => (a.module_title || "").localeCompare(b.module_title || ""))
            const allQuestions = passages.flatMap((p: any) => p.questions)

            const content: any = {
              activity_id: data.content_id,
              book_id: data.book_id,
              passages,
              questions: allQuestions,
              difficulty: data.difficulty,
              created_at: data.created_at,
            }

            setGenerationResult(content)
            setV2Response({
              content_id: data.content_id,
              activity_type: data.activity_type,
              content,
              skill_id: data.skill_id,
              skill_slug: data.skill_slug,
              skill_name: data.skill_name,
              format_id: data.format_id,
              format_slug: data.format_slug,
              format_name: data.format_name,
              source_type: data.source_type,
              book_id: data.book_id,
              difficulty: data.difficulty,
              item_count: data.item_count,
              created_at: data.created_at,
            })
            setTitle(
              `${data.skill_name} - ${data.format_name} - ${data.item_count} items`,
            )
            setStreamingPassages([]) // Clear streaming state
            setStreamingTotal(0)
            setIsGenerating(false)

            // Auto-generate audio for each passage if enabled
            if (formState.options.generate_audio && passages.length > 0) {
              for (let i = 0; i < passages.length; i++) {
                handleGenerateAudio(passages[i].passage, i, content)
              }
            }
          },
          onError: (error) => {
            console.error("Stream error:", error)
            showErrorToast(`Generation error: ${error}`)
          },
        })
      } else if (formState.skillSlug) {
        // V2 skill-first path (non-streaming)
        const response = await generateActivityV2(formState)
        setV2Response(response)

        // Extract inner content as the GeneratedActivity for preview
        const content = response.content as any
        setGenerationResult(content)

        // Generate default title from skill metadata
        const itemCount = getItemCount(content)
        setTitle(
          `${response.skill_name} - ${response.format_name} - ${itemCount} items`,
        )
        setCurrentStep(4) // Move to result step
        setIsGenerating(false)

        // Auto-generate audio for single-passage reading comprehension
        if (
          formState.options.generate_audio &&
          response.activity_type === "reading_comprehension" &&
          content.passage
        ) {
          handleGenerateAudio(content.passage, undefined, content)
        }

        // Auto-generate audio for listening quiz questions
        if (
          response.activity_type === "listening_quiz" &&
          content.questions?.length > 0
        ) {
          handleGenerateListeningAudio(content.questions, content)
        }

        // Auto-generate audio for listening fill blank items
        if (
          response.activity_type === "listening_fill_blank" &&
          content.items?.length > 0
        ) {
          handleGenerateListeningFillBlankAudio(content.items, content)
        }

        // Auto-generate audio for listening sentence builder
        if (
          response.activity_type === "listening_sentence_builder" &&
          content.sentences?.length > 0
        ) {
          handleGenerateListeningFillBlankAudio(content.sentences, content, "correct_sentence")
        }

        // Auto-generate audio for listening word builder
        if (
          response.activity_type === "listening_word_builder" &&
          content.words?.length > 0
        ) {
          handleGenerateListeningFillBlankAudio(content.words, content, "correct_word")
        }
      } else {
        // Legacy V1 path
        const result = await generateActivity(formState)
        setGenerationResult(result)

        const activityConfig = formState.activityType
          ? getActivityTypeConfig(formState.activityType)
          : null
        const itemCount = getItemCount(result)
        setTitle(`${activityConfig?.name || "Activity"} - ${itemCount} items`)
        setCurrentStep(4) // Move to result step
        setIsGenerating(false)
      }
    } catch (error: any) {
      console.error("Generation failed:", error)
      const message =
        error.response?.data?.detail || error.message || "Generation failed"
      setGenerationError(message)
      showErrorToast(`Generation failed: ${message}`)
      setIsGenerating(false)
    }
  }

  // Handle regenerate
  const handleRegenerate = () => {
    clearGeneration()
    setV2Response(null)
    setStreamingPassages([])
    setStreamingTotal(0)
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
        activity_type:
          v2Response?.activity_type || formState.activityType || "",
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
      setV2Response(null)
      setStreamingPassages([])
      setStreamingTotal(0)
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
    const itemsKey = getItemsKey(effectiveActivityType)

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

    const savedIndex = editingIndex
    const result = { ...generationState.result } as any
    const itemsKey = getItemsKey(effectiveActivityType)

    if (itemsKey && result[itemsKey]) {
      result[itemsKey] = [...result[itemsKey]]
      const item = { ...editedItem }
      // Auto-set audio_url for listening items
      const listeningTextKey =
        effectiveActivityType === "listening_sentence_builder" ? "correct_sentence"
        : effectiveActivityType === "listening_word_builder" ? "correct_word"
        : effectiveActivityType === "listening_fill_blank" ? "full_sentence"
        : effectiveActivityType === "listening_quiz" ? "audio_text"
        : null
      if (listeningTextKey && item[listeningTextKey]) {
        const text = item[listeningTextKey] || ""
        const lang = result.language || "en"
        item.audio_url = `/api/v1/ai/tts/audio?text=${encodeURIComponent(text)}&lang=${lang}`
        item.audio_status = "ready"
        item.audio_data = undefined

        // Auto-recalculate shuffled words/scrambled letters on text change
        if (effectiveActivityType === "listening_sentence_builder") {
          const words = text.split(/\s+/).filter(Boolean)
          const shuffled = [...words].sort(() => Math.random() - 0.5)
          // Ensure not same order
          if (JSON.stringify(shuffled) === JSON.stringify(words) && words.length >= 2) {
            [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]]
          }
          item.words = shuffled
          item.word_count = words.length
        } else if (effectiveActivityType === "listening_word_builder") {
          const letters = text.toLowerCase().split("")
          const scrambled = [...letters].sort(() => Math.random() - 0.5)
          if (JSON.stringify(scrambled) === JSON.stringify(letters) && letters.length >= 2) {
            [scrambled[0], scrambled[1]] = [scrambled[1], scrambled[0]]
          }
          item.letters = scrambled
          item.letter_count = letters.length
        }
      }
      result[itemsKey][editingIndex] = item
      setGenerationResult(result)

      // Auto-generate audio for listening items after save
      if (listeningTextKey && item[listeningTextKey]) {
        const text = item[listeningTextKey] || ""
        const isListeningFB = effectiveActivityType === "listening_fill_blank"
        const isListeningSB = effectiveActivityType === "listening_sentence_builder"
        const isListeningWB = effectiveActivityType === "listening_word_builder"
        if (isListeningSB || isListeningWB) {
          // Use the fill-blank audio handler for sentence/word builder too
          const itemsArr = [item]
          handleGenerateListeningFillBlankAudio(
            itemsArr,
            result,
            listeningTextKey,
          )
        } else {
          handleGenerateAudio(
            text,
            undefined, // passageIndex
            result,    // contentOverride (use updated result)
            undefined, // voiceOverride
            isListeningFB ? undefined : savedIndex, // questionIndex (for listening_quiz)
            isListeningFB ? savedIndex : undefined, // itemIndex (for listening_fill_blank)
          )
        }
      }
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
    const itemsKey = getItemsKey(effectiveActivityType)

    // Create empty template based on activity type
    let newItem: any = {}

    switch (effectiveActivityType) {
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
      case "listening_fill_blank":
        newItem = {
          item_id: `lfb_new_${Date.now()}`,
          full_sentence: "",
          display_sentence: "",
          missing_words: [],
          acceptable_answers: [],
          word_bank: [],
          audio_url: null,
          audio_status: "pending",
          difficulty: "A2",
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
      case "listening_sentence_builder":
        newItem = {
          item_id: `lsb_new_${Date.now()}`,
          correct_sentence: "",
          words: [],
          word_count: 0,
          audio_url: null,
          audio_status: "pending",
          difficulty: "medium",
        }
        break
      case "listening_word_builder":
        newItem = {
          item_id: `lwb_new_${Date.now()}`,
          correct_word: "",
          letters: [],
          letter_count: 0,
          definition: "",
          audio_url: null,
          audio_status: "pending",
          difficulty: "medium",
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
    if (result.items) return result.items.length
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
      case "listening_quiz":
        return "questions"
      case "listening_fill_blank":
      case "grammar_fill_blank":
      case "writing_fill_blank":
        return "items"
      case "sentence_builder":
      case "listening_sentence_builder":
        return "sentences"
      case "word_builder":
      case "listening_word_builder":
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
      case "listening_quiz":
        return "questions"
      case "listening_fill_blank":
      case "grammar_fill_blank":
      case "writing_fill_blank":
        return "items"
      case "sentence_builder":
      case "listening_sentence_builder":
        return "sentences"
      case "word_builder":
      case "listening_word_builder":
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
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-[70vw] max-w-[1100px] sm:max-w-[70vw] p-0 flex flex-col"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Generate AI Content
            </SheetTitle>
            <SheetDescription className="sr-only">
              AI Content Generation Wizard
            </SheetDescription>
          </SheetHeader>

          {/* Step Indicator */}
          <div className="relative px-6 pt-4 pb-2 shrink-0">
            {/* Progress Bar Background */}
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200 dark:bg-gray-700" />
            {/* Progress Bar Fill */}
            <div
              className="absolute top-6 left-6 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
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
          <div className="flex-1 overflow-hidden min-h-0 px-6">
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
                coverUrls={coverUrls}
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

            {/* Step 2: Select Skill (Epic 30) */}
            {currentStep === 2 && !isGenerating && (
              <ScrollArea className="h-full pr-4">
                <SkillSelectionGrid
                  skills={skills}
                  selectedSkillSlug={formState.skillSlug}
                  onSelect={(slug) => setSkillSlug(slug)}
                  isLoading={isLoadingSkills}
                />
              </ScrollArea>
            )}

            {/* Step 3: Format Selection & Configuration */}
            {currentStep === 3 && !isGenerating && (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {formState.skillSlug ? (
                    <>
                      {/* Skill-based flow: format selection + config */}
                      <FormatSelectionPanel
                        formats={
                          skills.find(
                            (s) => s.skill.slug === formState.skillSlug,
                          )?.formats || []
                        }
                        selectedFormatSlug={formState.formatSlug}
                        onSelect={(slug) => setFormatSlug(slug)}
                      />
                      {formState.formatSlug && (
                        <GenerationConfigPanel
                          skillSlug={formState.skillSlug}
                          formatSlug={formState.formatSlug}
                          options={formState.options}
                          onOptionChange={setOption}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {/* Fallback: old activity type selector */}
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
                    </>
                  )}

                  <p className="text-xs text-center text-muted-foreground">
                    AI-generated content may contain errors. Please review
                    before use.
                  </p>
                </div>
              </ScrollArea>
            )}

            {/* Generating Animation (non-streaming) */}
            {isGenerating && streamingTotal === 0 && (
              <div className="h-full flex items-center justify-center">
                <AIGeneratingAnimation activityType={formState.activityType} />
              </div>
            )}

            {/* Streaming Progress: show passages as they arrive */}
            {isGenerating && streamingTotal > 0 && currentStep === 4 && (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                    <span className="text-sm font-medium">
                      Generating passages... {streamingPassages.length} / {streamingTotal} ready
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${(streamingPassages.length / streamingTotal) * 100}%` }}
                      />
                    </div>
                  </div>

                  {streamingPassages.map((p, idx) => (
                    <div
                      key={p.passage_id}
                      className="border rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <h4 className="font-medium text-sm">{p.module_title || `Passage ${idx + 1}`}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {p.questions?.length || 0} questions
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {p.passage?.slice(0, 200)}...
                      </p>
                    </div>
                  ))}

                  {/* Placeholder cards for pending passages */}
                  {Array.from({ length: streamingTotal - streamingPassages.length }).map((_, idx) => (
                    <div
                      key={`pending-${idx}`}
                      className="border border-dashed rounded-lg p-4 flex items-center gap-3"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Generating passage {streamingPassages.length + idx + 1}...
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Step 4: Result/Preview */}
            {currentStep === 4 && !isGenerating && generationState.result && (
              <StepResultPreview
                activityType={
                  (v2Response?.activity_type as ActivityType) ||
                  formState.activityType
                }
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
                onGenerateAudio={handleGenerateAudio}
                onRegenerateAudio={(text, voiceId, pIdx) =>
                  handleGenerateAudio(text, pIdx, undefined, voiceId)
                }
                onGenerateQuestionAudio={(text, qIdx) =>
                  handleGenerateAudio(text, undefined, undefined, undefined, qIdx)
                }
                onRegenerateQuestionAudio={(text, voiceId, qIdx) =>
                  handleGenerateAudio(text, undefined, undefined, voiceId, qIdx)
                }
                onGenerateItemAudio={(text, iIdx) =>
                  handleGenerateAudio(text, undefined, undefined, undefined, undefined, iIdx)
                }
                onRegenerateItemAudio={(text, voiceId, iIdx) =>
                  handleGenerateAudio(text, undefined, undefined, voiceId, undefined, iIdx)
                }
                onUpdatePassage={(newText, pIdx) => {
                  const base = { ...(generationState.result as any) }
                  if (pIdx !== undefined && base.passages) {
                    base.passages = [...base.passages]
                    const { passage_audio: _, ...rest } = base.passages[pIdx]
                    base.passages[pIdx] = { ...rest, passage: newText }
                  } else {
                    delete base.passage_audio
                    base.passage = newText
                  }
                  setGenerationResult(base)
                }}
                onUpdateQuestion={(qIdx, updates) => {
                  const base = { ...(generationState.result as any) }
                  if (base.questions) {
                    base.questions = [...base.questions]
                    base.questions[qIdx] = { ...base.questions[qIdx], ...updates }
                    setGenerationResult(base)
                  }
                }}
                isGeneratingAudio={isGeneratingAudio}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
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
              {currentStep === 4 ? (
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
                    ) : currentStep === 3 ? (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    ) : currentStep === 2 && formState.skillSlug === "mix" ? (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Mix
                      </>
                    ) : (
                      "Next"
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
  coverUrls: Record<number, string>
}

function StepSelectBook({
  books,
  selectedBookId,
  isLoading,
  bookSearch,
  onSearchChange,
  onBookSelect,
  error,
  coverUrls,
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
                  {coverUrls[book.id] ? (
                    <img
                      src={coverUrls[book.id]}
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
                  <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center shadow-sm">
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
  onGenerateAudio?: (passageText: string, passageIndex?: number) => void
  onRegenerateAudio?: (passageText: string, voiceId: string, passageIndex?: number) => void
  onUpdatePassage?: (newText: string, passageIndex?: number) => void
  onGenerateQuestionAudio?: (audioText: string, questionIndex: number) => void
  onRegenerateQuestionAudio?: (audioText: string, voiceId: string, questionIndex: number) => void
  onUpdateQuestion?: (questionIndex: number, updates: Record<string, any>) => void
  onGenerateItemAudio?: (text: string, itemIndex: number) => void
  onRegenerateItemAudio?: (text: string, voiceId: string, itemIndex: number) => void
  isGeneratingAudio?: boolean
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
  onGenerateAudio,
  onRegenerateAudio,
  onUpdatePassage,
  onGenerateQuestionAudio,
  onRegenerateQuestionAudio,
  onUpdateQuestion,
  onGenerateItemAudio,
  onRegenerateItemAudio,
  isGeneratingAudio,
}: StepResultPreviewProps) {
  const [editingPassage, setEditingPassage] = useState<number | "single" | null>(null)
  const [editingPassageText, setEditingPassageText] = useState("")
  // Listening quiz question editing state
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<{
    question_text: string
    audio_text: string
    options: string[]
    correct_index: number
  } | null>(null)

  const activityConfig = activityType
    ? getActivityTypeConfig(activityType)
    : null

  const items =
    result.questions || result.items || result.pairs || result.sentences || result.words || []
  const itemCount = getItemCount(result)
  const itemLabel = getItemLabel(activityType)

  // Check if this is a card-style activity (word builder, sentence builder)
  const isCardStyle =
    activityType === "word_builder" || activityType === "sentence_builder"

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="space-y-4 pr-4">
          {/* Summary Header */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <Check className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              {activityConfig?.name || "Activity"} • {itemCount} {itemLabel}
            </span>
          </div>

          {/* Multi-passage Reading Comprehension */}
          {activityType === "reading_comprehension" && result.passages && result.passages.length > 1 ? (
            <div className="space-y-4">
              <Label>
                {result.passages.length} Passages • {itemCount} Questions Total
              </Label>
              <div className="space-y-6">
                {result.passages.map((passage: any, pIdx: number) => (
                  <div key={pIdx} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Passage {pIdx + 1}
                        </Badge>
                        <span className="text-sm font-medium text-muted-foreground">
                          {passage.module_title}
                        </span>
                      </div>
                      {editingPassage !== pIdx && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPassage(pIdx)
                            setEditingPassageText(passage.passage || "")
                          }}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                      )}
                    </div>
                    {editingPassage === pIdx ? (
                      <>
                        <Textarea
                          value={editingPassageText}
                          onChange={(e) => setEditingPassageText(e.target.value)}
                          rows={12}
                          placeholder="Enter the reading passage..."
                          className="min-h-[200px]"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPassage(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              onUpdatePassage?.(editingPassageText, pIdx)
                              setEditingPassage(null)
                              onGenerateAudio?.(editingPassageText, pIdx)
                            }}
                            disabled={isGeneratingAudio}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                            Save &amp; Generate Audio
                          </Button>
                        </div>
                      </>
                    ) : isGeneratingAudio && !passage.passage_audio ? (
                      <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                        <div className="text-center">
                          <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Generating audio narration...</p>
                          <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
                        </div>
                      </div>
                    ) : passage.passage_audio ? (
                      <PassageAudioPlayer
                        audioBase64={passage.passage_audio.audio_base64}
                        wordTimestamps={passage.passage_audio.word_timestamps}
                        durationSeconds={passage.passage_audio.duration_seconds}
                        onRegenerateAudio={
                          onRegenerateAudio
                            ? (voiceId) => onRegenerateAudio(passage.passage, voiceId, pIdx)
                            : undefined
                        }
                        isRegenerating={isGeneratingAudio}
                      />
                    ) : (
                      <>
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {passage.passage}
                          </p>
                        </div>
                        {onGenerateAudio && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onGenerateAudio(passage.passage, pIdx)}
                            disabled={isGeneratingAudio}
                            className="text-teal-600 border-teal-300 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-700 dark:hover:bg-teal-900/20"
                          >
                            <Headphones className="h-4 w-4 mr-1.5" />
                            Generate Audio
                          </Button>
                        )}
                      </>
                    )}
                    <Label className="text-xs text-muted-foreground">
                      Questions ({passage.questions?.length || 0})
                    </Label>
                    <div className="space-y-2 pl-2">
                      {(passage.questions || []).map((item: any, qIdx: number) => (
                        <div key={qIdx} className="p-3 rounded-md bg-muted/50 border">
                          <div className="font-medium text-muted-foreground mb-1 text-xs">
                            #{qIdx + 1}
                          </div>
                          <PreviewItemContent
                            activityType={activityType}
                            item={item}
                          />
                        </div>
                      ))}
                    </div>
                    {pIdx < result.passages.length - 1 && (
                      <Separator />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <>
          {/* Single Reading Comprehension Passage */}
          {activityType === "reading_comprehension" &&
            (result.passage || result.passage_text) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Reading Passage</Label>
                  {editingPassage !== "single" && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPassage("single")
                        setEditingPassageText(result.passage || result.passage_text || "")
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                </div>
                {editingPassage === "single" ? (
                  <>
                    <Textarea
                      value={editingPassageText}
                      onChange={(e) => setEditingPassageText(e.target.value)}
                      rows={12}
                      placeholder="Enter the reading passage..."
                      className="min-h-[200px]"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingPassage(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          onUpdatePassage?.(editingPassageText)
                          setEditingPassage(null)
                          onGenerateAudio?.(editingPassageText)
                        }}
                        disabled={isGeneratingAudio}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        Save &amp; Generate Audio
                      </Button>
                    </div>
                  </>
                ) : isGeneratingAudio && !result.passage_audio ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Generating audio narration...</p>
                      <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
                    </div>
                  </div>
                ) : result.passage_audio ? (
                  <PassageAudioPlayer
                    audioBase64={result.passage_audio.audio_base64}
                    wordTimestamps={result.passage_audio.word_timestamps}
                    durationSeconds={result.passage_audio.duration_seconds}
                    onRegenerateAudio={
                      onRegenerateAudio
                        ? (voiceId) => onRegenerateAudio(result.passage || result.passage_text, voiceId)
                        : undefined
                    }
                    isRegenerating={isGeneratingAudio}
                  />
                ) : (
                  <>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {result.passage || result.passage_text}
                      </p>
                    </div>
                    {onGenerateAudio && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onGenerateAudio(result.passage || result.passage_text)}
                        disabled={isGeneratingAudio}
                        className="text-teal-600 border-teal-300 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-700 dark:hover:bg-teal-900/20"
                      >
                        <Headphones className="h-4 w-4 mr-1.5" />
                        Generate Audio
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

          {/* Listening Quiz — per-question audio preview */}
          {activityType === "listening_quiz" && result.questions && (
            <div className="space-y-4">
              <Label>
                Listening Quiz — {result.questions.length} Questions
              </Label>
              <div className="space-y-4">
                {result.questions.map((q: any, qIdx: number) => (
                  <div
                    key={q.question_id || qIdx}
                    className="space-y-2 p-4 rounded-lg border bg-card"
                  >
                    {/* Question header with sub_skill badge + actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-muted-foreground">
                          #{qIdx + 1}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize",
                            q.sub_skill === "gist" && "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400",
                            q.sub_skill === "detail" && "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400",
                            q.sub_skill === "discrimination" && "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400",
                          )}
                        >
                          {q.sub_skill}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Hint toggle */}
                        <button
                          type="button"
                          onClick={() => onUpdateQuestion?.(qIdx, { hint_enabled: !q.hint_enabled })}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors",
                            q.hint_enabled
                              ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                              : "border-muted text-muted-foreground hover:border-amber-300 hover:text-amber-600",
                          )}
                          title="When enabled, students can reveal the audio text as a hint"
                        >
                          <Eye className="h-3 w-3" />
                          Hint
                        </button>
                        {/* Edit button */}
                        {editingQuestionIdx !== qIdx && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestionIdx(qIdx)
                              setEditingQuestion({
                                question_text: q.question_text,
                                audio_text: q.audio_text,
                                options: [...q.options],
                                correct_index: q.correct_index,
                              })
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {editingQuestionIdx === qIdx && editingQuestion ? (
                      /* ---- EDIT MODE ---- */
                      <div className="space-y-3 pt-1">
                        <div className="space-y-1">
                          <Label className="text-xs">Audio Text</Label>
                          <Textarea
                            value={editingQuestion.audio_text}
                            onChange={(e) => setEditingQuestion({ ...editingQuestion, audio_text: e.target.value })}
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Question</Label>
                          <Input
                            value={editingQuestion.question_text}
                            onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Options (click to set correct answer)</Label>
                          <div className="space-y-1.5">
                            {editingQuestion.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingQuestion({ ...editingQuestion, correct_index: oIdx })}
                                  className={cn(
                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                                    oIdx === editingQuestion.correct_index
                                      ? "border-green-500 bg-green-500 text-white"
                                      : "border-muted text-muted-foreground hover:border-green-400",
                                  )}
                                >
                                  {String.fromCharCode(65 + oIdx)}
                                </button>
                                <Input
                                  value={opt}
                                  onChange={(e) => {
                                    const newOptions = [...editingQuestion.options]
                                    newOptions[oIdx] = e.target.value
                                    setEditingQuestion({ ...editingQuestion, options: newOptions })
                                  }}
                                  className="text-sm h-8"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingQuestionIdx(null)
                              setEditingQuestion(null)
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const audioTextChanged = editingQuestion.audio_text !== q.audio_text
                              onUpdateQuestion?.(qIdx, {
                                question_text: editingQuestion.question_text,
                                audio_text: editingQuestion.audio_text,
                                options: editingQuestion.options,
                                correct_index: editingQuestion.correct_index,
                                correct_answer: editingQuestion.options[editingQuestion.correct_index],
                                // Clear audio if audio_text was edited
                                ...(audioTextChanged ? { audio_data: undefined, audio_status: "pending" } : {}),
                              })
                              setEditingQuestionIdx(null)
                              setEditingQuestion(null)
                              // Regenerate audio if audio text changed
                              if (audioTextChanged) {
                                onGenerateQuestionAudio?.(editingQuestion.audio_text, qIdx)
                              }
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ---- VIEW MODE ---- */
                      <>
                        {/* Audio text section */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Audio Text (spoken to student)
                          </Label>
                          {isGeneratingAudio && !q.audio_data ? (
                            <div className="flex items-center gap-3 p-4 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10">
                              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                              <p className="text-sm text-teal-700 dark:text-teal-300">
                                Generating audio...
                              </p>
                            </div>
                          ) : q.audio_data ? (
                            <PassageAudioPlayer
                              audioBase64={q.audio_data.audio_base64}
                              wordTimestamps={q.audio_data.word_timestamps}
                              durationSeconds={q.audio_data.duration_seconds}
                              onRegenerateAudio={
                                onRegenerateQuestionAudio
                                  ? (voiceId) => onRegenerateQuestionAudio(q.audio_text, voiceId, qIdx)
                                  : undefined
                              }
                              isRegenerating={isGeneratingAudio}
                            />
                          ) : (
                            <>
                              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <p className="text-sm leading-relaxed">
                                  {q.audio_text}
                                </p>
                              </div>
                              {onGenerateQuestionAudio && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onGenerateQuestionAudio(q.audio_text, qIdx)}
                                  disabled={isGeneratingAudio}
                                  className="text-teal-600 border-teal-300 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-700 dark:hover:bg-teal-900/20"
                                >
                                  <Headphones className="h-4 w-4 mr-1.5" />
                                  Generate Audio
                                </Button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Hint enabled indicator */}
                        {q.hint_enabled && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <Eye className="h-3 w-3" />
                            <span>Hint enabled — students can reveal the audio text</span>
                          </div>
                        )}

                        {/* Question text */}
                        <div className="space-y-1 pt-1">
                          <Label className="text-xs text-muted-foreground">
                            Question
                          </Label>
                          <p className="text-sm font-medium">{q.question_text}</p>
                        </div>

                        {/* MCQ options */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {q.options?.map((opt: string, oIdx: number) => (
                            <div
                              key={oIdx}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md border text-sm",
                                oIdx === q.correct_index
                                  ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300"
                                  : "border-muted bg-muted/30",
                              )}
                            >
                              <span className="font-medium text-xs text-muted-foreground">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <span>{opt}</span>
                              {oIdx === q.correct_index && (
                                <Check className="h-3.5 w-3.5 ml-auto text-green-600 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <p className="text-xs text-muted-foreground italic pt-1">
                            {q.explanation}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listening Fill Blank — per-item audio preview with edit/delete */}
          {activityType === "listening_fill_blank" && result.items && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>
                  Listening Fill Blank — {result.items.length} Items
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
                  Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {result.items.map((item: any, iIdx: number) => (
                  <div
                    key={item.item_id || iIdx}
                    className="relative"
                  >
                    {editingIndex === iIdx ? (
                      <EditableItemForm
                        activityType={activityType}
                        item={editedItem}
                        onChange={onEditedItemChange}
                        onSave={onSaveEdit}
                        onCancel={onCancelEdit}
                      />
                    ) : (
                    <div className="space-y-2 p-4 rounded-lg border bg-card group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-muted-foreground">
                            #{iIdx + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {(item.missing_words || [item.missing_word]).length} blank{(item.missing_words || [item.missing_word]).length > 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onStartEdit(iIdx, item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => onDeleteItem(iIdx)}
                            disabled={result.items.length <= 1}
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
                        {isGeneratingAudio && !item.audio_data ? (
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
                            onRegenerateAudio={
                              onRegenerateItemAudio
                                ? (voiceId) => onRegenerateItemAudio(item.full_sentence, voiceId, iIdx)
                                : undefined
                            }
                            isRegenerating={isGeneratingAudio}
                          />
                        ) : (
                          <>
                            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                              <p className="text-sm leading-relaxed">
                                {item.full_sentence}
                              </p>
                            </div>
                            {onGenerateItemAudio && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onGenerateItemAudio(item.full_sentence, iIdx)}
                                disabled={isGeneratingAudio}
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
                        <Label className="text-xs text-muted-foreground">
                          Student sees
                        </Label>
                        <p className="text-sm font-medium leading-relaxed">
                          {item.display_sentence.split("_______").map((part: string, pIdx: number, arr: string[]) => (
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
                              const isCorrect = (item.missing_words || []).some(
                                (mw: string) => mw.toLowerCase() === word.toLowerCase()
                              )
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
                        {(item.missing_words || [item.missing_word]).map((word: string, wIdx: number) => (
                          <Badge key={wIdx} variant="outline" className="text-green-600 border-green-300">
                            {wIdx + 1}. {word}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listening Sentence Builder preview */}
          {activityType === "listening_sentence_builder" && result.sentences && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>
                  Generated Sentences ({result.sentences.length})
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddItem}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Sentence
                </Button>
              </div>
              <div className="space-y-3">
                {result.sentences.map((item: any, idx: number) => (
                  <div key={item.item_id || idx} className="relative">
                    {editingIndex === idx ? (
                      <EditableItemForm
                        activityType={activityType}
                        item={editedItem}
                        onChange={onEditedItemChange}
                        onSave={onSaveEdit}
                        onCancel={onCancelEdit}
                      />
                    ) : (
                    <div className="group rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">#{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.word_count} words
                          </Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStartEdit(idx, item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteItem(idx)} disabled={result.sentences.length <= 1}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {/* Audio */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Audio (student hears this)</label>
                        {item.audio_data ? (
                          <PassageAudioPlayer
                            audioBase64={item.audio_data.audio_base64}
                            wordTimestamps={item.audio_data.word_timestamps}
                            durationSeconds={item.audio_data.duration_seconds}
                            onRegenerateAudio={
                              onRegenerateItemAudio
                                ? (voiceId) => onRegenerateItemAudio(item.correct_sentence, voiceId, idx)
                                : undefined
                            }
                            isRegenerating={isGeneratingAudio}
                          />
                        ) : (
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm">{item.correct_sentence}</p>
                          </div>
                        )}
                      </div>
                      {/* Shuffled words */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Shuffled Words (student sees)</label>
                        <div className="flex flex-wrap gap-1.5">
                          {(item.words || []).map((word: string, wIdx: number) => (
                            <span key={wIdx} className="px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Correct answer (teacher view) */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Correct:</span>
                        <span className="text-green-600 font-medium">{item.correct_sentence}</span>
                      </div>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listening Word Builder preview */}
          {activityType === "listening_word_builder" && result.words && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>
                  Generated Words ({result.words.length})
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddItem}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Word
                </Button>
              </div>
              <div className="space-y-3">
                {result.words.map((item: any, idx: number) => (
                  <div key={item.item_id || idx} className="relative">
                    {editingIndex === idx ? (
                      <EditableItemForm
                        activityType={activityType}
                        item={editedItem}
                        onChange={onEditedItemChange}
                        onSave={onSaveEdit}
                        onCancel={onCancelEdit}
                      />
                    ) : (
                    <div className="group rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">#{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.letter_count} letters
                          </Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStartEdit(idx, item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteItem(idx)} disabled={result.words.length <= 1}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {/* Audio */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Audio (student hears this)</label>
                        {item.audio_data ? (
                          <PassageAudioPlayer
                            audioBase64={item.audio_data.audio_base64}
                            wordTimestamps={item.audio_data.word_timestamps}
                            durationSeconds={item.audio_data.duration_seconds}
                            onRegenerateAudio={
                              onRegenerateItemAudio
                                ? (voiceId) => onRegenerateItemAudio(item.correct_word, voiceId, idx)
                                : undefined
                            }
                            isRegenerating={isGeneratingAudio}
                          />
                        ) : (
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm">{item.correct_word}</p>
                          </div>
                        )}
                      </div>
                      {/* Scrambled letters */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Scrambled Letters (student sees)</label>
                        <div className="flex flex-wrap gap-1.5">
                          {(item.letters || []).map((letter: string, lIdx: number) => (
                            <span key={lIdx} className="px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 uppercase">
                              {letter}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Definition hint */}
                      {item.definition && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Definition:</span> {item.definition}
                        </div>
                      )}
                      {/* Correct answer (teacher view) */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Correct:</span>
                        <span className="text-green-600 font-medium">{item.correct_word}</span>
                      </div>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items Header with Add Button — hidden for types that have their own preview above */}
          {activityType !== "listening_quiz" && activityType !== "listening_fill_blank" && activityType !== "listening_sentence_builder" && activityType !== "listening_word_builder" && (<>
          <div className="flex items-center justify-between">
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
          <div className="space-y-3">
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
          </>)}
          </>
          )}
        </div>
      </ScrollArea>
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
  const optionLetters = ["A", "B", "C", "D", "E", "F"]
  const renderOptions = (options: any[]) => (
    <div className="mt-2 space-y-1.5">
      {options.map((opt: any, i: number) => {
        const isCorrect = isCorrectOption(opt, i)
        const optText = typeof opt === "object" ? opt.text : opt
        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 text-xs px-3 py-2 rounded-md border",
              isCorrect
                ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700 font-medium"
                : "bg-muted/50 text-muted-foreground border-muted",
            )}
          >
            <span className="shrink-0 font-semibold">
              {isCorrect ? <Check className="h-3.5 w-3.5 inline" /> : optionLetters[i] + "."}
            </span>
            <span>{optText}</span>
          </div>
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
    case "listening_fill_blank":
      return (
        <div>
          <div className="text-sm">{item.display_sentence}</div>
          <div className="mt-1 text-xs">
            <span className="text-muted-foreground">Answers: </span>
            {(item.missing_words || [item.missing_word]).map((word: string, wIdx: number) => (
              <span key={wIdx} className="font-medium text-green-600">
                {wIdx > 0 && ", "}
                {wIdx + 1}. {word}
              </span>
            ))}
          </div>
          {item.word_bank && item.word_bank.length > 0 && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              Word bank: {item.word_bank.join(", ")}
            </div>
          )}
        </div>
      )
    case "grammar_fill_blank":
    case "writing_fill_blank":
      return (
        <div>
          <div className="text-sm">{item.display_sentence}</div>
          <div className="mt-1 text-xs">
            <span className="text-muted-foreground">Answer: </span>
            <span className="font-medium text-green-600">{item.missing_word}</span>
          </div>
          {item.acceptable_answers && item.acceptable_answers.length > 1 && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              Also accepted: {item.acceptable_answers.filter((a: string) => a.toLowerCase() !== item.missing_word.toLowerCase()).join(", ")}
            </div>
          )}
          {item.word_type && (
            <div className="mt-0.5 text-xs text-muted-foreground capitalize">
              Type: {item.word_type}
            </div>
          )}
        </div>
      )
    case "sentence_builder":
    case "listening_sentence_builder":
      return (
        <div>
          <div className="text-sm">{item.correct_sentence}</div>
          {item.words && (
            <div className="text-xs text-muted-foreground mt-1">
              Words: {item.words.join(" | ")}
            </div>
          )}
          {item.translation && (
            <div className="text-xs text-muted-foreground mt-1">
              Translation: {item.translation}
            </div>
          )}
        </div>
      )
    case "word_builder":
    case "listening_word_builder":
      return (
        <div>
          <div className="font-medium">{item.correct_word}</div>
          <div className="text-sm text-muted-foreground">
            {item.definition || item.hint}
          </div>
          {(item.letters || item.scrambled_letters) && (
            <div className="text-xs text-muted-foreground mt-1">
              Letters: {(item.letters || item.scrambled_letters).join(", ")}
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

      {/* Listening Fill Blank — word-picker UI */}
      {activityType === "listening_fill_blank" && (() => {
        // Split sentence into tokens preserving punctuation attached to words
        const fullSentence: string = item.full_sentence || ""
        const missingSet = new Set((item.missing_words || []).map((w: string) => w.toLowerCase()))

        // Tokenize: split into words and whitespace/punctuation segments
        // e.g. "Hello, world!" → ["Hello", ",", " ", "world", "!"]
        const tokens: string[] = fullSentence.match(/[\w'-]+|[^\w\s]|\s+/g) || []

        // Helper to rebuild all derived fields from a new missing words list
        const rebuildFromSelection = (newMissing: string[]) => {
          // Rebuild display_sentence
          const newMissingLower = new Set(newMissing.map(w => w.toLowerCase()))
          let display = fullSentence
          for (const word of newMissing) {
            if (!word) continue
            const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
            display = display.replace(regex, '_______')
          }
          // Rebuild word bank: new correct words + existing distractors
          const oldCorrect = new Set((item.missing_words || []).map((w: string) => w.toLowerCase()))
          const distractors = (item.word_bank || []).filter(
            (w: string) => !oldCorrect.has(w.toLowerCase()) && !newMissingLower.has(w.toLowerCase())
          )
          onChange({
            ...item,
            missing_words: newMissing,
            display_sentence: display,
            word_bank: [...newMissing, ...distractors],
            acceptable_answers: newMissing.map((w: string) => [w]),
          })
        }

        // Toggle a word as blank / not blank
        const toggleWord = (word: string) => {
          const currentMissing: string[] = item.missing_words || []
          const isSelected = currentMissing.some(w => w.toLowerCase() === word.toLowerCase())
          if (isSelected) {
            rebuildFromSelection(currentMissing.filter(w => w.toLowerCase() !== word.toLowerCase()))
          } else {
            rebuildFromSelection([...currentMissing, word])
          }
        }

        // Get distractors (word bank words that are NOT correct answers)
        const distractors = (item.word_bank || []).filter(
          (w: string) => !missingSet.has(w.toLowerCase())
        )

        return (
        <>
          {/* Editable sentence */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Sentence</Label>
            <Textarea
              value={fullSentence}
              onChange={(e) => {
                const newFull = e.target.value
                const currentMissing: string[] = item.missing_words || []
                // Keep only missing words that still exist in new sentence
                const kept = currentMissing.filter(w =>
                  new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(newFull)
                )
                let display = newFull
                for (const word of kept) {
                  const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
                  display = display.replace(regex, '_______')
                }
                const oldCorrect = new Set(currentMissing.map((w: string) => w.toLowerCase()))
                const existingDistractors = (item.word_bank || []).filter(
                  (w: string) => !oldCorrect.has(w.toLowerCase())
                )
                onChange({
                  ...item,
                  full_sentence: newFull,
                  missing_words: kept,
                  display_sentence: display,
                  word_bank: [...kept, ...existingDistractors],
                  acceptable_answers: kept.map((w: string) => [w]),
                  audio_data: undefined,
                  audio_url: null,
                  audio_status: "pending",
                })
              }}
              rows={2}
              placeholder="Type the full sentence here..."
            />
          </div>

          {/* Word picker — click words to toggle as blanks */}
          {fullSentence.trim() && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Tap words to mark as blanks
              </Label>
              <div className="flex flex-wrap gap-1 p-3 rounded-lg border bg-card min-h-[44px]">
                {tokens.map((token, tIdx) => {
                  const isWord = /^[\w'-]+$/.test(token)
                  if (!isWord) {
                    // Whitespace or punctuation — render as-is
                    return <span key={tIdx} className="text-sm">{token}</span>
                  }
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
                {(item.missing_words || []).length} blank(s) selected
                {(item.missing_words || []).length > 0 && (
                  <> — {(item.missing_words || []).join(", ")}</>
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
                const newDistractors = e.target.value.split(",").map((w: string) => w.trim()).filter(Boolean)
                const correctWords: string[] = item.missing_words || []
                onChange({
                  ...item,
                  word_bank: [...correctWords, ...newDistractors],
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
        </>
        )
      })()}

      {/* Grammar Fill Blank */}
      {activityType === "grammar_fill_blank" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Sentence (use _______ for blank)
            </Label>
            <Textarea
              value={item.sentence || item.display_sentence || ""}
              onChange={(e) => {
                const field = item.sentence !== undefined ? "sentence" : "display_sentence"
                updateField(field, e.target.value)
              }}
              rows={2}
              placeholder="She _______ to the store."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Correct Answer</Label>
            <Input
              value={item.correct_answer || item.missing_word || ""}
              onChange={(e) => {
                const field = item.correct_answer !== undefined ? "correct_answer" : "missing_word"
                updateField(field, e.target.value)
              }}
              placeholder="went"
            />
          </div>
          {item.word_bank && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Word Bank (comma-separated)
              </Label>
              <Input
                value={(item.word_bank || []).join(", ")}
                onChange={(e) => {
                  const words = e.target.value.split(",").map((w: string) => w.trim()).filter(Boolean)
                  onChange({ ...item, word_bank: words })
                }}
                placeholder="went, goes, going, gone"
              />
            </div>
          )}
          {item.grammar_topic && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">Grammar Topic</Label>
              <Input
                value={item.grammar_topic || ""}
                onChange={(e) => updateField("grammar_topic", e.target.value)}
              />
            </div>
          )}
        </>
      )}

      {/* Writing Fill Blank */}
      {activityType === "writing_fill_blank" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Sentence (use _______ for blank)
            </Label>
            <Textarea
              value={item.display_sentence || ""}
              onChange={(e) => updateField("display_sentence", e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Missing Word</Label>
            <Input
              value={item.missing_word || ""}
              onChange={(e) => updateField("missing_word", e.target.value)}
            />
          </div>
          {item.acceptable_answers && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Acceptable Answers (comma-separated)
              </Label>
              <Input
                value={(item.acceptable_answers || []).join(", ")}
                onChange={(e) => {
                  const answers = e.target.value.split(",").map((a: string) => a.trim()).filter(Boolean)
                  onChange({ ...item, acceptable_answers: answers })
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Listening Sentence Builder */}
      {activityType === "listening_sentence_builder" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Sentence (spoken via audio)</Label>
            <Textarea
              value={item.correct_sentence || ""}
              onChange={(e) => {
                const newSentence = e.target.value
                const words = newSentence.split(/\s+/).filter(Boolean)
                const shuffled = [...words].sort(() => Math.random() - 0.5)
                if (JSON.stringify(shuffled) === JSON.stringify(words) && words.length >= 2) {
                  [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]]
                }
                onChange({
                  ...item,
                  correct_sentence: newSentence,
                  words: shuffled,
                  word_count: words.length,
                  audio_data: undefined,
                  audio_url: null,
                  audio_status: "pending",
                })
              }}
              rows={2}
              placeholder="The cat is sleeping on the bed."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Shuffled Words Preview</Label>
            <div className="flex flex-wrap gap-1.5">
              {(item.words || []).map((word: string, wIdx: number) => (
                <span key={wIdx} className="px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  {word}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Listening Word Builder */}
      {activityType === "listening_word_builder" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Word (spoken via audio)</Label>
            <Input
              value={item.correct_word || ""}
              onChange={(e) => {
                const newWord = e.target.value.toLowerCase().trim()
                const letters = newWord.split("")
                const scrambled = [...letters].sort(() => Math.random() - 0.5)
                if (JSON.stringify(scrambled) === JSON.stringify(letters) && letters.length >= 2) {
                  [scrambled[0], scrambled[1]] = [scrambled[1], scrambled[0]]
                }
                onChange({
                  ...item,
                  correct_word: newWord,
                  letters: scrambled,
                  letter_count: letters.length,
                  audio_data: undefined,
                  audio_url: null,
                  audio_status: "pending",
                })
              }}
              placeholder="beautiful"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Definition (optional hint)</Label>
            <Input
              value={item.definition || ""}
              onChange={(e) => updateField("definition", e.target.value)}
              placeholder="Very attractive or pleasing"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Scrambled Letters Preview</Label>
            <div className="flex flex-wrap gap-1.5">
              {(item.letters || []).map((letter: string, lIdx: number) => (
                <span key={lIdx} className="px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 uppercase">
                  {letter}
                </span>
              ))}
            </div>
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
        "listening_fill_blank",
        "grammar_fill_blank",
        "writing_fill_blank",
        "listening_sentence_builder",
        "listening_word_builder",
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
