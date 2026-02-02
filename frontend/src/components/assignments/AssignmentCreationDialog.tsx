/**
 * Assignment Creation Dialog - Story 3.7, Story 8.2, Story 10.3+
 *
 * Multi-step wizard for creating assignments:
 * - Step 0: Select Book
 * - Step 1: Select Activities (page-based - Story 8.2)
 * - Step 2: Select Recipients (classes or individual students)
 * - Step 3: Additional Resources (videos with subtitle control - Story 10.3+)
 * - Step 4: Configure Settings (name, due date, time limit, instructions)
 * - Step 5: Review & Create
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { format } from "date-fns"
import { Eye } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import useCustomToast from "@/hooks/useCustomToast"
import { useQuickActivityPreview } from "@/hooks/usePreviewMode"
import {
  getActivityTypeColorClasses,
  getActivityTypeConfig,
} from "@/lib/activityTypeConfig"
import { mapAssignmentForEditToFormData } from "@/lib/assignment-utils"
import { assignmentsApi } from "@/services/assignmentsApi"
import { getDownloadUrl as getMaterialDownloadUrl } from "@/services/materialsApi"
import type {
  AdditionalResources,
  AdditionalResourcesResponse,
  AssignmentCreateRequest,
  AssignmentForEditResponse,
  AssignmentFormData,
  TeacherMaterialResourceResponse,
} from "@/types/assignment"
import type { Book } from "@/types/book"
import type { ContentItem } from "@/types/content-library"
import { ActivityPreviewModal } from "../preview"
import { StepAdditionalResources } from "./StepAdditionalResources"
import { StepConfigureSettings } from "./StepConfigureSettings"
import { StepPreviewAIContent } from "./StepPreviewAIContent"
import { StepSelectActivities } from "./StepSelectActivities"
import { StepSelectRecipients } from "./StepSelectRecipients"
import { type SourceType, StepSelectSource } from "./StepSelectSource"
import { TimePlanningWarningDialog } from "./TimePlanningWarningDialog"

interface AssignmentCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  book?: Book // Optional pre-selected book
  prefilledPublishDate?: Date | null // Optional pre-filled publish date (from calendar click)
  // Story 20.2: Edit mode support
  mode?: "create" | "edit"
  existingAssignment?: AssignmentForEditResponse // Story 20.2: Use for-edit response with recipients
  // Pre-selected AI content (from library "Use" button)
  preSelectedAIContent?: ContentItem | null
}

const STEPS = [
  { number: 0, label: "Select Book" },
  { number: 1, label: "Select Activities" },
  { number: 2, label: "Select Recipients" },
  { number: 3, label: "Resources" },
  { number: 4, label: "Settings" },
  { number: 5, label: "Review" },
]

export function AssignmentCreationDialog({
  isOpen,
  onClose,
  book: initialBook,
  prefilledPublishDate,
  mode = "create",
  existingAssignment,
  preSelectedAIContent,
}: AssignmentCreationDialogProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // Story 20.2: Determine if in edit mode
  const isEditMode = mode === "edit"

  // State for selected book
  const [selectedBook, setSelectedBook] = useState<Book | null>(
    initialBook || null,
  )

  // State for source type (book or AI content)
  const [sourceType, setSourceType] = useState<SourceType>("book")

  // State for selected AI content
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(
    null,
  )

  // State for selected activity IDs (Story 8.2: multi-activity)
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([])

  const [currentStep, setCurrentStep] = useState(initialBook ? 1 : 0)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Story 20.4: Time Planning warning state
  const [showTimePlanningWarning, setShowTimePlanningWarning] = useState(false)

  // Story 9.7: Activity preview
  const {
    previewActivity,
    isModalOpen: isPreviewModalOpen,
    closePreview,
  } = useQuickActivityPreview()
  const [formData, setFormData] = useState<AssignmentFormData>({
    name: "",
    instructions: "",
    due_date: null,
    time_limit_minutes: null,
    student_ids: [],
    class_ids: [],
    activity_ids: [],
    scheduled_publish_date: null, // Story 9.6: Scheduled publishing
    time_planning_enabled: false,
    date_groups: [],
    video_path: null, // Story 10.3: Video attachment (deprecated)
    resources: null, // Story 10.3+: Additional resources with subtitle control
  })

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Story 20.2: Handle edit mode initialization
      if (isEditMode && existingAssignment) {
        // Edit mode: pre-populate with existing data (Story 20.2 CRITICAL FIX)
        const mappedData = mapAssignmentForEditToFormData(existingAssignment)
        setFormData(mappedData)
        setSelectedActivityIds(mappedData.activity_ids)

        // Construct Book object from edit response data
        const bookFromPreview: Book = {
          id: Number(existingAssignment.book_id),
          dream_storage_id: existingAssignment.book_name,
          title: existingAssignment.book_title,
          publisher_id: 0, // Not available in edit response, use placeholder
          publisher_name: existingAssignment.publisher_name,
          description: null,
          cover_image_url: existingAssignment.book_cover_url,
          activity_count: existingAssignment.total_activities,
        }
        setSelectedBook(bookFromPreview)

        // Start at activities step (step 1) in edit mode
        setCurrentStep(1)
      } else if (preSelectedAIContent) {
        // AI Content pre-selected (from library "Use" button)
        // Start at step 1 with AI content already selected
        setCurrentStep(1)
        setSourceType("ai_content")
        setSelectedContent(preSelectedAIContent)
        setSelectedBook(null)
        setSelectedActivityIds([])
        setFormData({
          name: preSelectedAIContent.title,
          instructions: "",
          due_date: null,
          time_limit_minutes: null,
          student_ids: [],
          class_ids: [],
          activity_ids: [],
          scheduled_publish_date: prefilledPublishDate || null,
          time_planning_enabled: false,
          date_groups: [],
          video_path: null,
          resources: null,
        })
      } else {
        // Create mode: reset to defaults
        setCurrentStep(initialBook ? 1 : 0)
        setSelectedBook(initialBook || null)
        setSourceType("book")
        setSelectedContent(null)
        setSelectedActivityIds([])
        setFormData({
          name: "",
          instructions: "",
          due_date: null,
          time_limit_minutes: null,
          student_ids: [],
          class_ids: [],
          activity_ids: [],
          // If prefilledPublishDate is provided (from calendar click), use it
          scheduled_publish_date: prefilledPublishDate || null,
          time_planning_enabled: false,
          date_groups: [],
          video_path: null, // Story 10.3: Video attachment (deprecated)
          resources: null, // Story 10.3+: Additional resources
        })
      }

      setValidationError(null)
      setShowCancelConfirm(false)
    }
  }, [
    isOpen,
    initialBook,
    prefilledPublishDate,
    isEditMode,
    existingAssignment,
    preSelectedAIContent,
  ])

  // Update form name when activities are selected (only in create mode)
  useEffect(() => {
    // Story 20.2: Don't auto-generate name in edit mode
    if (!isEditMode && selectedActivityIds.length > 0 && selectedBook) {
      const activityCount = selectedActivityIds.length
      const dateStr = format(new Date(), "MMM dd, yyyy")
      const newName =
        activityCount === 1
          ? `${selectedBook.title} Activity - ${dateStr}`
          : `${selectedBook.title} (${activityCount} activities) - ${dateStr}`
      setFormData((prev) => ({
        ...prev,
        name: newName,
        activity_ids: selectedActivityIds,
      }))
    } else if (isEditMode) {
      // In edit mode, just update activity_ids
      setFormData((prev) => ({
        ...prev,
        activity_ids: selectedActivityIds,
      }))
    }
  }, [selectedActivityIds, selectedBook, isEditMode])

  // Mutation for creating single assignment
  const createAssignmentMutation = useMutation({
    mutationFn: assignmentsApi.createAssignment,
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["calendar-assignments"] })

      showSuccessToast(
        `Assignment "${data.name}" created successfully for ${data.student_count} student${data.student_count !== 1 ? "s" : ""}`,
      )

      // Close dialog before navigating
      onClose()

      // Navigate to assignment detail page
      navigate({
        to: "/teacher/assignments/$assignmentId",
        params: { assignmentId: data.id },
      })
    },
    onError: (error: any) => {
      console.error("Failed to create assignment:", error)
      const errorMessage =
        error?.response?.data?.detail || "Failed to create assignment"
      showErrorToast(errorMessage)
    },
  })

  // Mutation for creating bulk assignments (Time Planning mode)
  const createBulkAssignmentsMutation = useMutation({
    mutationFn: assignmentsApi.createBulkAssignments,
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["calendar-assignments"] })

      showSuccessToast(
        `${data.total_created} assignments created successfully! They will become visible on their scheduled dates.`,
      )

      // Close dialog and navigate to assignments list
      onClose()
      navigate({
        to: "/teacher/assignments",
      })
    },
    onError: (error: any) => {
      console.error("Failed to create bulk assignments:", error)
      const errorMessage =
        error?.response?.data?.detail || "Failed to create assignments"
      showErrorToast(errorMessage)
    },
  })

  // Story 20.2: Mutation for updating assignment
  const updateAssignmentMutation = useMutation({
    mutationFn: (data: { id: string; data: any }) =>
      assignmentsApi.updateAssignment(data.id, data.data),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["calendar-assignments"] })
      if (existingAssignment) {
        queryClient.invalidateQueries({
          queryKey: ["assignment-preview", existingAssignment.assignment_id],
        })
      }

      showSuccessToast("Assignment updated successfully")

      // Close dialog
      onClose()
    },
    onError: (error: any) => {
      console.error("Failed to update assignment:", error)
      const errorMessage =
        error?.response?.data?.detail || "Failed to update assignment"
      showErrorToast(errorMessage)
    },
  })

  // Handler to update form data
  const handleFormDataChange = (updates: Partial<AssignmentFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    // Clear validation error when user makes changes
    if (validationError) {
      setValidationError(null)
    }
  }

  // Story 20.4: Time Planning toggle handler with warning
  const handleTimePlanningToggle = (enabled: boolean) => {
    if (enabled && selectedActivityIds.length > 0) {
      // Show warning dialog if activities are selected
      setShowTimePlanningWarning(true)
    } else {
      // No activities selected, safe to enable
      handleFormDataChange({ time_planning_enabled: enabled })
    }
  }

  // Story 20.4: Confirm enabling Time Planning (clears activities)
  const handleTimePlanningWarningConfirm = () => {
    setSelectedActivityIds([])
    handleFormDataChange({
      time_planning_enabled: true,
      activity_ids: [],
    })
    setShowTimePlanningWarning(false)
  }

  // Story 20.4: Cancel enabling Time Planning (keep activities)
  const handleTimePlanningWarningCancel = () => {
    setShowTimePlanningWarning(false)
    // Don't change anything - keep Time Planning off and activities selected
  }

  // Handler for activity IDs change from StepSelectActivities
  const handleActivityIdsChange = useCallback((activityIds: string[]) => {
    setSelectedActivityIds(activityIds)
  }, [])

  // Handler for book selection - auto-advance to Step 2
  const handleBookSelect = useCallback((book: Book | null) => {
    setSelectedBook(book)
    if (book) {
      // Auto-advance to activities step when book is selected
      setCurrentStep(1)
    }
  }, [])

  // Handler for source type change
  const handleSourceTypeChange = useCallback((type: SourceType) => {
    setSourceType(type)
    // Clear selections when switching source type
    setSelectedBook(null)
    setSelectedContent(null)
    setSelectedActivityIds([])
    setFormData((prev) => ({
      ...prev,
      name: "",
      activity_ids: [],
      time_planning_enabled: false,
      date_groups: [],
    }))
  }, [])

  // Handler for AI content selection - auto-advance to preview step
  const handleContentSelect = useCallback((content: ContentItem | null) => {
    setSelectedContent(content)
    if (content) {
      // Auto-generate name from content
      const dateStr = format(new Date(), "MMM dd, yyyy")
      setFormData((prev) => ({
        ...prev,
        name: `${content.title} - ${dateStr}`,
      }))
      // Auto-advance to preview step when content is selected
      setCurrentStep(1)
    }
  }, [])

  const handleNext = () => {
    // Validate step 0 (Select Source)
    if (currentStep === 0) {
      if (sourceType === "book" && !selectedBook) {
        showErrorToast("Please select a book")
        return
      }
      if (sourceType === "ai_content" && !selectedContent) {
        showErrorToast("Please select AI content")
        return
      }
    }

    // Validate step 1 (Select Activities for book, Preview for AI content)
    if (currentStep === 1) {
      // For book source, validate activity selection
      if (sourceType === "book") {
        if (selectedActivityIds.length === 0) {
          showErrorToast("Please select at least one activity")
          return
        }
        // Time Planning mode validation
        if (formData.time_planning_enabled) {
          if (formData.date_groups.length === 0) {
            showErrorToast(
              "Please add at least one date when Time Planning is enabled",
            )
            return
          }
          const hasEmptyGroup = formData.date_groups.some(
            (g) => g.activityIds.length === 0,
          )
          if (hasEmptyGroup) {
            showErrorToast("Each date must have at least one activity assigned")
            return
          }
        }
      }
      // For AI content, no validation needed (preview is read-only)
    }

    // Validate step 2 (Select Recipients)
    if (currentStep === 2) {
      const hasRecipients =
        formData.class_ids.length > 0 || formData.student_ids.length > 0
      if (!hasRecipients) {
        showErrorToast("Please select at least one class or student")
        return
      }
    }

    // Validate step 3 (Additional Resources) - optional, no validation needed
    // Users can skip adding resources

    // Validate step 4 (Configure Settings)
    if (currentStep === 4) {
      if (!formData.name || formData.name.trim() === "") {
        showErrorToast("Please enter an assignment name")
        return
      }
      if (
        formData.time_limit_minutes !== null &&
        formData.time_limit_minutes < 1
      ) {
        showErrorToast("Time limit must be at least 1 minute")
        return
      }
      // Story 9.6: Validate scheduled publish date if scheduling
      if (formData.scheduled_publish_date) {
        // Scheduled publish date must be in the future
        if (formData.scheduled_publish_date <= new Date()) {
          showErrorToast("Scheduled publish date must be in the future")
          return
        }
        // Scheduled publish date must be before or equal to due date (if set)
        if (
          formData.due_date &&
          formData.scheduled_publish_date > formData.due_date
        ) {
          showErrorToast("Publish date must be before or equal to the due date")
          return
        }
      }
    }

    // Clear validation error and move to next step
    setValidationError(null)
    if (currentStep < STEPS.length - 1) {
      // Skip Resources step (3) for AI content
      if (currentStep === 2 && sourceType === "ai_content") {
        setCurrentStep(4) // Jump to Settings
      } else {
        setCurrentStep((prev) => prev + 1)
      }
    }
  }

  const handleBack = () => {
    setValidationError(null)
    if (currentStep > 0) {
      // When going back from Step 1 to Select Source (step 0),
      // clear the selection so the user sees the source selection
      if (currentStep === 1) {
        if (sourceType === "book") {
          setSelectedBook(null)
          setSelectedActivityIds([])
        } else {
          setSelectedContent(null)
        }
      }
      // Skip Resources step (3) for AI content when going back
      if (currentStep === 4 && sourceType === "ai_content") {
        setCurrentStep(2) // Jump back to Recipients
      } else {
        setCurrentStep((prev) => prev - 1)
      }
    }
  }

  // Check if form has been modified from initial state
  const isFormDirty = (): boolean => {
    // Check if we've progressed beyond initial step
    if (currentStep > (initialBook ? 1 : 0)) {
      return true
    }

    // Check if activities were selected (book source)
    if (selectedActivityIds.length > 0) {
      return true
    }

    // Check if AI content was selected
    if (selectedContent !== null) {
      return true
    }

    // Check if recipients were selected
    if (formData.student_ids.length > 0 || formData.class_ids.length > 0) {
      return true
    }

    // Check if any settings were modified
    if (formData.instructions.trim() !== "") {
      return true
    }
    if (formData.due_date !== null) {
      return true
    }
    if (formData.time_limit_minutes !== null) {
      return true
    }
    // Story 9.6: Check if scheduled publish date was set
    if (formData.scheduled_publish_date !== null) {
      return true
    }

    return false
  }

  const handleCancelClick = () => {
    // Show confirmation if form has unsaved changes
    if (isFormDirty()) {
      setShowCancelConfirm(true)
    } else {
      handleCancel()
    }
  }

  const handleCancel = () => {
    setCurrentStep(initialBook ? 1 : 0)
    setValidationError(null)
    setSelectedBook(initialBook || null)
    setSourceType("book")
    setSelectedContent(null)
    setSelectedActivityIds([])
    setFormData({
      name: "",
      instructions: "",
      due_date: null,
      time_limit_minutes: null,
      student_ids: [],
      class_ids: [],
      activity_ids: [],
      scheduled_publish_date: null, // Story 9.6: Scheduled publishing
      time_planning_enabled: false,
      date_groups: [],
      video_path: null, // Story 10.3: Video attachment (deprecated)
      resources: null, // Story 10.3+: Additional resources
    })
    setShowCancelConfirm(false)
    onClose()
  }

  /**
   * Transform AdditionalResources (form data) to AdditionalResourcesResponse (preview format)
   * This enables preview mode to display materials without needing server-side data
   */
  const transformResourcesForPreview = useCallback(
    (
      resources: AdditionalResources | null,
    ): AdditionalResourcesResponse | null => {
      if (!resources) return null

      // Get auth token for video/audio streaming (needs token in URL query param)
      const token = localStorage.getItem("access_token")
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ""

      // Transform teacher_materials to include is_available and download_url
      const transformedMaterials: TeacherMaterialResourceResponse[] = (
        resources.teacher_materials ?? []
      ).map((mat) => {
        const downloadUrl =
          mat.material_type !== "url" && mat.material_type !== "text_note"
            ? `${getMaterialDownloadUrl(mat.material_id)}${tokenParam}`
            : null
        return {
          ...mat,
          is_available: true, // Materials are available in preview mode
          file_size: mat.file_size ?? null,
          mime_type: mat.mime_type ?? null,
          url: mat.url ?? null,
          text_content: mat.text_content ?? null,
          download_url: downloadUrl,
        }
      })

      return {
        videos: resources.videos,
        teacher_materials: transformedMaterials,
      }
    },
    [],
  )

  // Story 9.7: Open preview in new tab
  const handlePreviewInNewTab = useCallback(() => {
    // Book assignment preview
    if (sourceType === "book") {
      if (!selectedBook || selectedActivityIds.length === 0) {
        showErrorToast("Please select a book and activities first")
        return
      }

      // Transform resources for preview mode (sets is_available=true and provides download URLs)
      const previewResources = transformResourcesForPreview(formData.resources)

      // Store preview data in sessionStorage
      const previewData = {
        bookId: selectedBook.id,
        bookTitle: selectedBook.title,
        bookName: selectedBook.title, // Use title as name
        publisherName: selectedBook.publisher_name,
        activityIds: selectedActivityIds,
        assignmentName: formData.name || `${selectedBook.title} Preview`,
        timeLimitMinutes: formData.time_limit_minutes,
        resources: previewResources, // Include transformed resources for preview
      }
      sessionStorage.setItem(
        "assignment-preview-data",
        JSON.stringify(previewData),
      )

      // Open preview in new tab
      window.open("/teacher/assignments/preview", "_blank")
    } else {
      // AI Content preview - not supported in new tab, content already previewed in Step 1
      showErrorToast(
        "AI content preview is shown in Step 1. Click Back to view.",
      )
    }
  }, [
    sourceType,
    selectedBook,
    selectedActivityIds,
    formData.name,
    formData.time_limit_minutes,
    formData.resources,
    showErrorToast,
    transformResourcesForPreview,
  ])

  const handleCreateAssignment = async () => {
    // Story 20.2: Handle both create and edit modes
    if (isEditMode && existingAssignment) {
      // Edit mode: update existing assignment
      const updateData = {
        name: formData.name,
        instructions: formData.instructions || null,
        due_date: formData.due_date ? formData.due_date.toISOString() : null,
        time_limit_minutes: formData.time_limit_minutes || null,
        activity_ids: selectedActivityIds,
        resources: formData.resources,
      }

      updateAssignmentMutation.mutate({
        id: existingAssignment.assignment_id,
        data: updateData,
      })
      return
    }

    // Validate based on source type
    if (sourceType === "book") {
      // Book assignment validations
      if (!selectedBook) {
        showErrorToast("Please select a book")
        return
      }

      if (selectedActivityIds.length === 0) {
        showErrorToast("Please select at least one activity")
        return
      }

      // Time Planning mode: create multiple assignments via bulk endpoint
      if (formData.time_planning_enabled && formData.date_groups.length > 0) {
        const requestData: AssignmentCreateRequest = {
          book_id: selectedBook.id,
          name: formData.name,
          instructions: formData.instructions || null,
          student_ids:
            formData.student_ids.length > 0 ? formData.student_ids : undefined,
          class_ids:
            formData.class_ids.length > 0 ? formData.class_ids : undefined,
          // Convert date groups to API format
          date_groups: formData.date_groups.map((group) => ({
            scheduled_publish_date: group.date.toISOString(),
            due_date: group.dueDate ? group.dueDate.toISOString() : null,
            time_limit_minutes: group.timeLimit || null,
            activity_ids: group.activityIds,
          })),
        }
        // Use bulk creation endpoint for Time Planning mode
        createBulkAssignmentsMutation.mutate(requestData)
        return
      }

      // Normal book assignment
      const requestData: AssignmentCreateRequest = {
        book_id: selectedBook.id,
        name: formData.name,
        instructions: formData.instructions || null,
        due_date: formData.due_date ? formData.due_date.toISOString() : null,
        time_limit_minutes: formData.time_limit_minutes,
        student_ids:
          formData.student_ids.length > 0 ? formData.student_ids : undefined,
        class_ids:
          formData.class_ids.length > 0 ? formData.class_ids : undefined,
        activity_ids: selectedActivityIds,
        scheduled_publish_date: formData.scheduled_publish_date
          ? formData.scheduled_publish_date.toISOString()
          : null,
        video_path: formData.video_path,
        resources: formData.resources,
      }

      createAssignmentMutation.mutate(requestData)
    } else {
      // AI Content assignment validations
      if (!selectedContent) {
        showErrorToast("Please select AI content")
        return
      }

      // AI Content assignment
      const requestData: AssignmentCreateRequest = {
        source_type: "ai_content",
        content_id: selectedContent.id,
        name: formData.name,
        instructions: formData.instructions || null,
        due_date: formData.due_date ? formData.due_date.toISOString() : null,
        time_limit_minutes: formData.time_limit_minutes,
        student_ids:
          formData.student_ids.length > 0 ? formData.student_ids : undefined,
        class_ids:
          formData.class_ids.length > 0 ? formData.class_ids : undefined,
        scheduled_publish_date: formData.scheduled_publish_date
          ? formData.scheduled_publish_date.toISOString()
          : null,
        resources: formData.resources,
      }

      createAssignmentMutation.mutate(requestData)
    }
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => !open && setShowCancelConfirm(true)}
      >
        <DialogContent
          className="max-w-[95vw] w-[1400px] h-[85vh] max-h-[850px] overflow-hidden flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Assignment" : "Create Assignment"}
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator - Compact Design */}
          <div className="relative mb-2 shrink-0">
            {/* Progress Bar Background */}
            <div className="absolute top-2.5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
            {/* Progress Bar Fill */}
            <div
              className="absolute top-2.5 left-0 h-0.5 bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-300"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />

            {/* Steps */}
            <div className="relative flex justify-between">
              {STEPS.map((step) => {
                // Skip Resources step (3) for AI content
                const isSkipped =
                  step.number === 3 && sourceType === "ai_content"
                const isCompleted = currentStep > step.number || isSkipped
                const isCurrent = currentStep === step.number && !isSkipped

                return (
                  <div
                    key={step.number}
                    className={`flex flex-col items-center ${isSkipped ? "opacity-40" : ""}`}
                  >
                    {/* Step Circle */}
                    <div
                      className={`relative flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium transition-all duration-200 ${
                        isCompleted
                          ? "bg-teal-500 text-white shadow-sm"
                          : isCurrent
                            ? "bg-teal-500 text-white ring-2 ring-teal-500/20 shadow-md"
                            : "bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600"
                      }`}
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
                      className={`text-[9px] mt-1 font-medium transition-colors ${
                        isCompleted || isCurrent
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-gray-400 dark:text-gray-500"
                      } ${isSkipped ? "line-through" : ""}`}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-hidden min-w-0 min-h-0">
            {currentStep === 0 && (
              <StepSelectSource
                sourceType={sourceType}
                onSourceTypeChange={handleSourceTypeChange}
                selectedBook={selectedBook}
                onSelectBook={handleBookSelect}
                selectedContent={selectedContent}
                onSelectContent={handleContentSelect}
              />
            )}

            {currentStep === 1 &&
              sourceType === "ai_content" &&
              selectedContent && (
                <StepPreviewAIContent content={selectedContent} />
              )}

            {currentStep === 1 && sourceType === "book" && selectedBook && (
              <StepSelectActivities
                bookId={selectedBook.id}
                book={selectedBook}
                selectedActivityIds={selectedActivityIds}
                onActivityIdsChange={handleActivityIdsChange}
                timePlanningEnabled={formData.time_planning_enabled}
                onTimePlanningChange={handleTimePlanningToggle}
                dateGroups={formData.date_groups}
                onDateGroupsChange={(groups) =>
                  handleFormDataChange({ date_groups: groups })
                }
              />
            )}

            {currentStep === 2 && (
              <StepSelectRecipients
                formData={formData}
                onFormDataChange={handleFormDataChange}
              />
            )}

            {currentStep === 3 && (selectedBook || selectedContent) && (
              <StepAdditionalResources
                formData={formData}
                onFormDataChange={handleFormDataChange}
                bookId={
                  selectedBook?.id || selectedContent?.book_id || undefined
                }
              />
            )}

            {currentStep === 4 && (selectedBook || selectedContent) && (
              <StepConfigureSettings
                formData={formData}
                onFormDataChange={handleFormDataChange}
                activityCount={
                  sourceType === "book"
                    ? selectedActivityIds.length
                    : selectedContent?.item_count || 1
                }
              />
            )}

            {currentStep === 5 && (selectedBook || selectedContent) && (
              <StepReviewCreateMulti
                book={selectedBook}
                selectedContent={selectedContent}
                sourceType={sourceType}
                activityCount={
                  sourceType === "book"
                    ? selectedActivityIds.length
                    : selectedContent?.item_count || 1
                }
                formData={formData}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={handleCancelClick}>
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                Back
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Next
                </Button>
              ) : (
                <>
                  {/* Story 9.7: Preview button on final step (only for book assignments) */}
                  {sourceType === "book" && (
                    <Button
                      variant="outline"
                      onClick={handlePreviewInNewTab}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  )}
                  <Button
                    onClick={handleCreateAssignment}
                    disabled={
                      createAssignmentMutation.isPending ||
                      createBulkAssignmentsMutation.isPending ||
                      updateAssignmentMutation.isPending
                    }
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {createAssignmentMutation.isPending ||
                    createBulkAssignmentsMutation.isPending ||
                    updateAssignmentMutation.isPending
                      ? isEditMode
                        ? "Updating..."
                        : "Creating..."
                      : isEditMode
                        ? "Update Assignment"
                        : formData.time_planning_enabled
                          ? `Create ${formData.date_groups.length} Assignments`
                          : "Create Assignment"}
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
            <AlertDialogTitle>Cancel Assignment Creation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel? All unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Story 9.7: Activity Preview Modal */}
      <ActivityPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={closePreview}
        activity={previewActivity}
      />

      {/* Story 20.4: Time Planning Warning Dialog */}
      <TimePlanningWarningDialog
        open={showTimePlanningWarning}
        onConfirm={handleTimePlanningWarningConfirm}
        onCancel={handleTimePlanningWarningCancel}
        activityCount={selectedActivityIds.length}
      />
    </>
  )
}

// Story 8.2: Review step for multi-activity assignments
// Updated for Unified Assignment: Supports both Book and AI Content
interface StepReviewCreateMultiProps {
  book: Book | null
  selectedContent: ContentItem | null
  sourceType: SourceType
  activityCount: number
  formData: AssignmentFormData
}

function StepReviewCreateMulti({
  book,
  selectedContent,
  sourceType,
  activityCount,
  formData,
}: StepReviewCreateMultiProps) {
  const recipientCount =
    formData.class_ids.length > 0
      ? `${formData.class_ids.length} class(es)`
      : `${formData.student_ids.length} student(s)`

  // Get activity type config for AI content
  const aiContentConfig = selectedContent
    ? getActivityTypeConfig(selectedContent.activity_type)
    : null
  const aiColorClasses = aiContentConfig
    ? getActivityTypeColorClasses(aiContentConfig.color)
    : null

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4 shrink-0">
        Review Assignment
      </h3>

      <ScrollArea className="flex-1 pr-4">
        <div className="grid gap-4">
          <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">
              Assignment Name
            </h4>
            <p className="text-muted-foreground">{formData.name}</p>
          </div>

          {/* Source - Book or AI Content */}
          {sourceType === "book" && book ? (
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Book</h4>
              <p className="text-muted-foreground">{book.title}</p>
              <p className="text-sm text-muted-foreground">
                by {book.publisher_name}
              </p>
            </div>
          ) : selectedContent && aiContentConfig && aiColorClasses ? (
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">AI Content</h4>
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${aiColorClasses.bg}`}>
                  <aiContentConfig.icon
                    className={`h-5 w-5 ${aiColorClasses.text}`}
                  />
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {selectedContent.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {aiContentConfig.label}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Activities / Items */}
          <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">
              {sourceType === "ai_content" ? "Content Items" : "Activities"}
            </h4>
            {sourceType === "book" &&
            formData.time_planning_enabled &&
            formData.date_groups.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">
                  Grouped by due date ({formData.date_groups.length} dates):
                </p>
                {formData.date_groups.map((group, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium">
                      {format(group.date, "MMM dd, yyyy")}
                    </span>
                    <span className="text-muted-foreground">
                      {group.activityIds.length}{" "}
                      {group.activityIds.length === 1
                        ? "activity"
                        : "activities"}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Each date group will create a separate assignment
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                {activityCount}{" "}
                {sourceType === "ai_content"
                  ? activityCount === 1
                    ? "item"
                    : "items"
                  : activityCount === 1
                    ? "activity"
                    : "activities"}{" "}
                selected
              </p>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Recipients</h4>
            <p className="text-muted-foreground">{recipientCount}</p>
          </div>

          {formData.instructions && (
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Instructions</h4>
              <p className="text-muted-foreground">{formData.instructions}</p>
            </div>
          )}

          {/* Story 9.6: Show publishing schedule */}
          <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Publishing</h4>
            {formData.scheduled_publish_date ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Scheduled
                </span>
                <p className="text-muted-foreground">
                  Will publish on{" "}
                  {format(formData.scheduled_publish_date, "PPP 'at' p")}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Immediate
                </span>
                <p className="text-muted-foreground">
                  Will be published immediately upon creation
                </p>
              </div>
            )}
          </div>

          {formData.due_date && (
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Due Date</h4>
              <p className="text-muted-foreground">
                {format(formData.due_date, "PPP 'at' p")}
              </p>
            </div>
          )}

          {formData.time_limit_minutes && (
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Time Limit</h4>
              <p className="text-muted-foreground">
                {formData.time_limit_minutes} minutes
              </p>
            </div>
          )}

          {/* Show resources if any */}
          {formData.resources && formData.resources.videos.length > 0 && (
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">
                Additional Resources
              </h4>
              <p className="text-muted-foreground">
                {formData.resources.videos.length} video
                {formData.resources.videos.length > 1 ? "s" : ""} attached
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
