/**
 * Assignment Wizard Page - Full-page replacement for AssignmentCreationDialog
 *
 * Multi-step wizard for creating/editing assignments:
 * - Step 0: Select a Book
 * - Step 1: Select Content (Book Activities or AI Content tabs)
 * - Step 2: Select Recipients
 * - Step 3: Additional Resources (skipped for AI content)
 * - Step 4: Configure Settings
 * - Step 5: Review & Create
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { format } from "date-fns"
import { ClipboardEdit, Eye, X } from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import useCustomToast from "@/hooks/useCustomToast"
import { useContentLibraryDetail } from "@/hooks/useContentLibrary"
import { useQuickActivityPreview } from "@/hooks/usePreviewMode"
import {
  getActivityTypeColorClasses,
  getActivityTypeConfig,
} from "@/lib/activityTypeConfig"
import { mapAssignmentForEditToFormData } from "@/lib/assignment-utils"
import { assignmentsApi, getAssignmentForEdit } from "@/services/assignmentsApi"
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
import { StepSelectActivities } from "./StepSelectActivities"
import { StepSelectRecipients } from "./StepSelectRecipients"
import { type SourceType, StepSelectSource } from "./StepSelectSource"
import { TimePlanningWarningDialog } from "./TimePlanningWarningDialog"

export interface AssignmentWizardContentProps {
  mode: "create" | "edit"
  prefilledPublishDate?: string | null
  preSelectedContentId?: string | null
  assignmentId?: string
  onClose: () => void
}

interface AssignmentWizardPageProps {
  mode: "create" | "edit"
  prefilledPublishDate?: string | null
  preSelectedContentId?: string | null
  assignmentId?: string
}

const STEPS = [
  { number: 0, label: "Select Book" },
  { number: 1, label: "Content" },
  { number: 2, label: "Recipients" },
  { number: 3, label: "Resources" },
  { number: 4, label: "Settings" },
  { number: 5, label: "Review" },
]

/**
 * Core wizard content — used both by the full-page wrapper and the bottom sheet.
 * The parent is responsible for providing the outer container (fixed overlay or sheet).
 */
export function AssignmentWizardContent({
  mode,
  prefilledPublishDate,
  preSelectedContentId,
  assignmentId,
  onClose,
}: AssignmentWizardContentProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const isEditMode = mode === "edit"

  // Fetch existing assignment data for edit mode
  const { data: existingAssignment } = useQuery<AssignmentForEditResponse>({
    queryKey: ["assignment-for-edit", assignmentId],
    queryFn: () => getAssignmentForEdit(assignmentId!),
    enabled: isEditMode && !!assignmentId,
  })

  // Fetch pre-selected AI content by ID
  const { data: preSelectedContentDetail } = useContentLibraryDetail(
    preSelectedContentId || "",
  )
  // Convert ContentItemDetail to ContentItem (they extend each other)
  const preSelectedAIContent: ContentItem | null =
    preSelectedContentDetail || null

  // State
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(
    null,
  )
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showTimePlanningWarning, setShowTimePlanningWarning] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Derive sourceType from selections
  const sourceType: SourceType = selectedContent ? "ai_content" : "book"

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
    scheduled_publish_date: null,
    time_planning_enabled: false,
    date_groups: [],
    video_path: null,
    resources: null,
  })

  // Initialize state based on mode and props
  useEffect(() => {
    if (initialized) return

    if (isEditMode && existingAssignment) {
      const mappedData = mapAssignmentForEditToFormData(existingAssignment)
      setFormData(mappedData)
      setSelectedActivityIds(mappedData.activity_ids)

      const bookFromPreview: Book = {
        id: Number(existingAssignment.book_id),
        dream_storage_id: existingAssignment.book_name,
        title: existingAssignment.book_title,
        publisher_id: 0,
        publisher_name: existingAssignment.publisher_name,
        description: null,
        cover_image_url: existingAssignment.book_cover_url,
        activity_count: existingAssignment.total_activities,
      }
      setSelectedBook(bookFromPreview)
      setCurrentStep(1)
      setInitialized(true)
    } else if (!isEditMode && preSelectedAIContent) {
      setCurrentStep(1)
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
        scheduled_publish_date: prefilledPublishDate
          ? new Date(prefilledPublishDate)
          : null,
        time_planning_enabled: false,
        date_groups: [],
        video_path: null,
        resources: null,
      })
      setInitialized(true)
    } else if (!isEditMode && !preSelectedContentId) {
      // Normal create mode (no pre-selected content to wait for)
      setFormData((prev) => ({
        ...prev,
        scheduled_publish_date: prefilledPublishDate
          ? new Date(prefilledPublishDate)
          : null,
      }))
      setInitialized(true)
    }
  }, [
    initialized,
    isEditMode,
    existingAssignment,
    preSelectedAIContent,
    preSelectedContentId,
    prefilledPublishDate,
  ])

  // Unsaved changes: beforeunload warning
  const isFormDirty = useCallback((): boolean => {
    if (currentStep > 0) return true
    if (selectedActivityIds.length > 0) return true
    if (selectedContent !== null) return true
    if (formData.student_ids.length > 0 || formData.class_ids.length > 0)
      return true
    if (formData.instructions.trim() !== "") return true
    if (formData.due_date !== null) return true
    if (formData.time_limit_minutes !== null) return true
    if (formData.scheduled_publish_date !== null) return true
    return false
  }, [currentStep, selectedActivityIds, selectedContent, formData])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isFormDirty()) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isFormDirty])

  // Update form name when activities are selected (only in create mode)
  useEffect(() => {
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
      setFormData((prev) => ({
        ...prev,
        activity_ids: selectedActivityIds,
      }))
    }
  }, [selectedActivityIds, selectedBook, isEditMode])

  // Mutations
  const createAssignmentMutation = useMutation({
    mutationFn: assignmentsApi.createAssignment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["calendar-assignments"] })

      showSuccessToast(
        `Assignment "${data.name}" created successfully for ${data.student_count} student${data.student_count !== 1 ? "s" : ""}`,
      )

      onClose()
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

  const createBulkAssignmentsMutation = useMutation({
    mutationFn: assignmentsApi.createBulkAssignments,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["calendar-assignments"] })

      showSuccessToast(
        `${data.total_created} assignments created successfully! They will become visible on their scheduled dates.`,
      )

      onClose()
    },
    onError: (error: any) => {
      console.error("Failed to create bulk assignments:", error)
      const errorMessage =
        error?.response?.data?.detail || "Failed to create assignments"
      showErrorToast(errorMessage)
    },
  })

  const updateAssignmentMutation = useMutation({
    mutationFn: (data: { id: string; data: any }) =>
      assignmentsApi.updateAssignment(data.id, data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["calendar-assignments"] })
      if (assignmentId) {
        queryClient.invalidateQueries({
          queryKey: ["assignment-preview", assignmentId],
        })
      }

      showSuccessToast("Assignment updated successfully")

      onClose()
      navigate({
        to: "/teacher/assignments/$assignmentId",
        params: { assignmentId: assignmentId! },
      })
    },
    onError: (error: any) => {
      console.error("Failed to update assignment:", error)
      const errorMessage =
        error?.response?.data?.detail || "Failed to update assignment"
      showErrorToast(errorMessage)
    },
  })

  // Handlers
  const handleFormDataChange = (updates: Partial<AssignmentFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    if (validationError) {
      setValidationError(null)
    }
  }

  const handleTimePlanningToggle = (enabled: boolean) => {
    if (enabled && selectedActivityIds.length > 0) {
      setShowTimePlanningWarning(true)
    } else {
      handleFormDataChange({ time_planning_enabled: enabled })
    }
  }

  const handleTimePlanningWarningConfirm = () => {
    setSelectedActivityIds([])
    handleFormDataChange({
      time_planning_enabled: true,
      activity_ids: [],
    })
    setShowTimePlanningWarning(false)
  }

  const handleTimePlanningWarningCancel = () => {
    setShowTimePlanningWarning(false)
  }

  const handleActivityIdsChange = useCallback((activityIds: string[]) => {
    setSelectedActivityIds(activityIds)
  }, [])

  const handleBookSelect = useCallback((book: Book | null) => {
    setSelectedBook(book)
    if (book) {
      setCurrentStep(1)
    }
  }, [])

  const handleContentSelect = useCallback((content: ContentItem | null) => {
    setSelectedContent(content)
    if (content) {
      setSelectedActivityIds([])
      const dateStr = format(new Date(), "MMM dd, yyyy")
      setFormData((prev) => ({
        ...prev,
        name: `${content.title} - ${dateStr}`,
        activity_ids: [],
      }))
    }
  }, [])

  const handleNext = () => {
    if (currentStep === 0) {
      if (!selectedBook) {
        showErrorToast("Please select a book")
        return
      }
    }

    if (currentStep === 1) {
      if (selectedActivityIds.length === 0 && !selectedContent) {
        showErrorToast(
          "Please select at least one activity or an AI content item",
        )
        return
      }
      if (selectedActivityIds.length > 0 && formData.time_planning_enabled) {
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

    if (currentStep === 2) {
      const hasRecipients =
        formData.class_ids.length > 0 || formData.student_ids.length > 0
      if (!hasRecipients) {
        showErrorToast("Please select at least one class or student")
        return
      }
    }

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
      if (formData.scheduled_publish_date) {
        if (formData.scheduled_publish_date <= new Date()) {
          showErrorToast("Scheduled publish date must be in the future")
          return
        }
        if (
          formData.due_date &&
          formData.scheduled_publish_date > formData.due_date
        ) {
          showErrorToast("Publish date must be before or equal to the due date")
          return
        }
      }
    }

    setValidationError(null)
    if (currentStep < STEPS.length - 1) {
      if (currentStep === 2 && sourceType === "ai_content") {
        setCurrentStep(4)
      } else {
        setCurrentStep((prev) => prev + 1)
      }
    }
  }

  const handleBack = () => {
    setValidationError(null)
    if (currentStep > 0) {
      if (currentStep === 1) {
        // If AI content is selected, go back to content list first
        if (selectedContent) {
          setSelectedContent(null)
          return
        }
        setSelectedBook(null)
        setSelectedActivityIds([])
      }
      if (currentStep === 4 && sourceType === "ai_content") {
        setCurrentStep(2)
      } else {
        setCurrentStep((prev) => prev - 1)
      }
    }
  }

  const handleCancelClick = () => {
    if (isFormDirty()) {
      setShowCancelConfirm(true)
    } else {
      onClose()
    }
  }

  const handleCancel = () => {
    setShowCancelConfirm(false)
    onClose()
  }

  const transformResourcesForPreview = useCallback(
    (
      resources: AdditionalResources | null,
    ): AdditionalResourcesResponse | null => {
      if (!resources) return null

      const token = localStorage.getItem("access_token")
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ""

      const transformedMaterials: TeacherMaterialResourceResponse[] = (
        resources.teacher_materials ?? []
      ).map((mat) => {
        const downloadUrl =
          mat.material_type !== "url" && mat.material_type !== "text_note"
            ? `${getMaterialDownloadUrl(mat.material_id)}${tokenParam}`
            : null
        return {
          ...mat,
          is_available: true,
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

  const handlePreviewInNewTab = useCallback(() => {
    if (sourceType === "book") {
      if (!selectedBook || selectedActivityIds.length === 0) {
        showErrorToast("Please select a book and activities first")
        return
      }

      const previewResources = transformResourcesForPreview(formData.resources)

      const previewData = {
        bookId: selectedBook.id,
        bookTitle: selectedBook.title,
        bookName: selectedBook.title,
        publisherName: selectedBook.publisher_name,
        activityIds: selectedActivityIds,
        assignmentName: formData.name || `${selectedBook.title} Preview`,
        timeLimitMinutes: formData.time_limit_minutes,
        resources: previewResources,
      }
      sessionStorage.setItem(
        "assignment-preview-data",
        JSON.stringify(previewData),
      )

      window.open("/teacher/assignments/preview", "_blank")
    } else {
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
    if (isEditMode && assignmentId) {
      const updateData = {
        name: formData.name,
        instructions: formData.instructions || null,
        due_date: formData.due_date ? formData.due_date.toISOString() : null,
        time_limit_minutes: formData.time_limit_minutes || null,
        activity_ids: selectedActivityIds,
        resources: formData.resources,
      }

      updateAssignmentMutation.mutate({
        id: assignmentId,
        data: updateData,
      })
      return
    }

    if (sourceType === "book") {
      if (!selectedBook) {
        showErrorToast("Please select a book")
        return
      }

      if (selectedActivityIds.length === 0) {
        showErrorToast("Please select at least one activity")
        return
      }

      if (formData.time_planning_enabled && formData.date_groups.length > 0) {
        const requestData: AssignmentCreateRequest = {
          book_id: selectedBook.id,
          name: formData.name,
          instructions: formData.instructions || null,
          student_ids:
            formData.student_ids.length > 0 ? formData.student_ids : undefined,
          class_ids:
            formData.class_ids.length > 0 ? formData.class_ids : undefined,
          date_groups: formData.date_groups.map((group) => ({
            scheduled_publish_date: group.date.toISOString(),
            due_date: group.dueDate ? group.dueDate.toISOString() : null,
            time_limit_minutes: group.timeLimit || null,
            activity_ids: group.activityIds,
          })),
        }
        createBulkAssignmentsMutation.mutate(requestData)
        return
      }

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
      if (!selectedContent) {
        showErrorToast("Please select AI content")
        return
      }

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

  const isMutating =
    createAssignmentMutation.isPending ||
    createBulkAssignmentsMutation.isPending ||
    updateAssignmentMutation.isPending

  return (
    <>
      <div className="flex flex-col h-full select-none">
        {/* Top Bar */}
        <div className="shrink-0 border-b bg-background px-6 py-3">
          <div className="relative flex items-center justify-center">
            {/* Title — anchored left */}
            <h1 className="absolute left-0 flex items-center gap-2.5 text-xl font-bold text-foreground">
              <ClipboardEdit className="h-6 w-6 text-teal-500" />
              {isEditMode ? "Edit Assignment" : "Create Assignment"}
            </h1>

            {/* Close button — anchored right */}
            <button
              type="button"
              onClick={handleCancelClick}
              className="absolute right-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Step Progress Bar — centered */}
            <div className="relative w-full max-w-xl">
              {/* Connecting lines between steps */}
              <div className="absolute top-4 left-0 right-0 flex justify-between px-4">
                {STEPS.slice(0, -1).map((step, i) => {
                  const isSegmentCompleted = currentStep > i
                  return (
                    <div
                      key={step.number}
                      className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${
                        isSegmentCompleted
                          ? "bg-teal-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  )
                })}
              </div>

              {/* Steps */}
              <div className="relative flex justify-between">
                {STEPS.map((step) => {
                  const isSkipped =
                    step.number === 3 && sourceType === "ai_content"
                  const isCompleted = currentStep > step.number || isSkipped
                  const isCurrent = currentStep === step.number && !isSkipped

                  return (
                    <div
                      key={step.number}
                      className={`flex flex-col items-center ${isSkipped ? "opacity-40" : ""}`}
                    >
                      <div
                        className={`relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all duration-200 ${
                          isCompleted
                            ? "bg-teal-500 text-white shadow-sm"
                            : isCurrent
                              ? "bg-teal-500 text-white ring-2 ring-teal-500/20 shadow-md"
                              : "bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {isCompleted ? (
                          <svg
                            className="w-4 h-4"
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
                      <span
                        className={`text-xs mt-1.5 font-medium transition-colors ${
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
          </div>
        </div>

        {/* Step Content */}
        {/* Step 1 needs its own overflow handling (internal scroll in ActivitySelectionTabs) */}
        {currentStep === 1 && selectedBook && (
          <div className="flex-1 min-h-0 w-full px-4 py-4">
            <StepSelectActivities
              bookId={selectedBook.id}
              book={selectedBook}
              selectedActivityIds={selectedActivityIds}
              onActivityIdsChange={handleActivityIdsChange}
              selectedContent={selectedContent}
              onContentSelect={handleContentSelect}
              timePlanningEnabled={formData.time_planning_enabled}
              onTimePlanningChange={handleTimePlanningToggle}
              dateGroups={formData.date_groups}
              onDateGroupsChange={(groups) =>
                handleFormDataChange({ date_groups: groups })
              }
            />
          </div>
        )}

        {/* Other steps scroll normally */}
        <div className={`flex-1 overflow-y-auto ${currentStep === 1 ? "hidden" : ""}`}>
          <div className="max-w-5xl mx-auto px-6 py-6 h-full">
            {currentStep === 0 && (
              <StepSelectSource
                selectedBook={selectedBook}
                onSelectBook={handleBookSelect}
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
              <StepReviewCreate
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
        </div>

        {/* Bottom Bar */}
        <div className="shrink-0 border-t bg-background px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
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
                    disabled={isMutating}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {isMutating
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
        </div>
      </div>

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

      {/* Activity Preview Modal */}
      <ActivityPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={closePreview}
        activity={previewActivity}
      />

      {/* Time Planning Warning Dialog */}
      <TimePlanningWarningDialog
        open={showTimePlanningWarning}
        onConfirm={handleTimePlanningWarningConfirm}
        onCancel={handleTimePlanningWarningCancel}
        activityCount={selectedActivityIds.length}
      />
    </>
  )
}

/**
 * Full-page wrapper — kept for backward compatibility with the old route-based approach.
 */
export function AssignmentWizardPage({
  mode,
  prefilledPublishDate,
  preSelectedContentId,
  assignmentId,
}: AssignmentWizardPageProps) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <AssignmentWizardContent
        mode={mode}
        prefilledPublishDate={prefilledPublishDate}
        preSelectedContentId={preSelectedContentId}
        assignmentId={assignmentId}
        onClose={() => navigate({ to: "/teacher/assignments" })}
      />
    </div>
  )
}

// Review step component (extracted from dialog's StepReviewCreateMulti)
interface StepReviewCreateProps {
  book: Book | null
  selectedContent: ContentItem | null
  sourceType: SourceType
  activityCount: number
  formData: AssignmentFormData
}

function StepReviewCreate({
  book,
  selectedContent,
  sourceType,
  activityCount,
  formData,
}: StepReviewCreateProps) {
  const recipientCount =
    formData.class_ids.length > 0
      ? `${formData.class_ids.length} class(es)`
      : `${formData.student_ids.length} student(s)`

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
