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
import { assignmentsApi } from "@/services/assignmentsApi"
import type {
  AssignmentCreateRequest,
  AssignmentFormData,
} from "@/types/assignment"
import type { Book } from "@/types/book"
import { ActivityPreviewModal } from "../preview"
import { StepAdditionalResources } from "./StepAdditionalResources"
import { StepConfigureSettings } from "./StepConfigureSettings"
import { StepSelectActivities } from "./StepSelectActivities"
import { StepSelectBook } from "./StepSelectBook"
import { StepSelectRecipients } from "./StepSelectRecipients"

interface AssignmentCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  book?: Book // Optional pre-selected book
  prefilledPublishDate?: Date | null // Optional pre-filled publish date (from calendar click)
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
}: AssignmentCreationDialogProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // State for selected book
  const [selectedBook, setSelectedBook] = useState<Book | null>(
    initialBook || null,
  )

  // State for selected activity IDs (Story 8.2: multi-activity)
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([])

  const [currentStep, setCurrentStep] = useState(initialBook ? 1 : 0)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Story 9.7: Activity preview
  const {
    previewActivity,
    isModalOpen: isPreviewModalOpen,
    openPreview,
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
      setCurrentStep(initialBook ? 1 : 0)
      setValidationError(null)
      setSelectedBook(initialBook || null)
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
      setShowCancelConfirm(false)
    }
  }, [isOpen, initialBook, prefilledPublishDate])

  // Update form name when activities are selected
  useEffect(() => {
    if (selectedActivityIds.length > 0 && selectedBook) {
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
    }
  }, [selectedActivityIds, selectedBook])

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

  // Handler to update form data
  const handleFormDataChange = (updates: Partial<AssignmentFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    // Clear validation error when user makes changes
    if (validationError) {
      setValidationError(null)
    }
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

  const handleNext = () => {
    // Validate step 0 (Select Book)
    if (currentStep === 0) {
      if (!selectedBook) {
        showErrorToast("Please select a book")
        return
      }
    }

    // Validate step 1 (Select Activities)
    if (currentStep === 1) {
      if (selectedActivityIds.length === 0) {
        showErrorToast("Please select at least one activity")
        return
      }
      // Time Planning mode validation
      if (formData.time_planning_enabled) {
        if (formData.date_groups.length === 0) {
          showErrorToast("Please add at least one date when Time Planning is enabled")
          return
        }
        const hasEmptyGroup = formData.date_groups.some(g => g.activityIds.length === 0)
        if (hasEmptyGroup) {
          showErrorToast("Each date must have at least one activity assigned")
          return
        }
      }
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
        if (formData.due_date && formData.scheduled_publish_date > formData.due_date) {
          showErrorToast("Publish date must be before or equal to the due date")
          return
        }
      }
    }

    // Clear validation error and move to next step
    setValidationError(null)
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setValidationError(null)
    if (currentStep > 0) {
      // When going back from Select Activities (step 1) to Select Book (step 0),
      // clear the selected book so the user sees the book selection list
      if (currentStep === 1) {
        setSelectedBook(null)
        setSelectedActivityIds([])
      }
      setCurrentStep((prev) => prev - 1)
    }
  }

  // Check if form has been modified from initial state
  const isFormDirty = (): boolean => {
    // Check if we've progressed beyond initial step
    if (currentStep > (initialBook ? 1 : 0)) {
      return true
    }

    // Check if activities were selected
    if (selectedActivityIds.length > 0) {
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

  // Story 9.7: Open preview in new tab
  const handlePreviewInNewTab = useCallback(() => {
    if (!selectedBook || selectedActivityIds.length === 0) {
      showErrorToast("Please select a book and activities first")
      return
    }

    // Store preview data in sessionStorage
    const previewData = {
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      bookName: selectedBook.title, // Use title as name
      publisherName: selectedBook.publisher_name,
      activityIds: selectedActivityIds,
      assignmentName: formData.name || `${selectedBook.title} Preview`,
      timeLimitMinutes: formData.time_limit_minutes,
    }
    sessionStorage.setItem("assignment-preview-data", JSON.stringify(previewData))

    // Open preview in new tab
    window.open("/teacher/assignments/preview", "_blank")
  }, [selectedBook, selectedActivityIds, formData.name, formData.time_limit_minutes, showErrorToast])

  const handleCreateAssignment = async () => {
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
        class_ids: formData.class_ids.length > 0 ? formData.class_ids : undefined,
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

    // Normal mode: create single assignment
    const requestData: AssignmentCreateRequest = {
      book_id: selectedBook.id,
      name: formData.name,
      instructions: formData.instructions || null,
      due_date: formData.due_date ? formData.due_date.toISOString() : null,
      time_limit_minutes: formData.time_limit_minutes,
      student_ids:
        formData.student_ids.length > 0 ? formData.student_ids : undefined,
      class_ids: formData.class_ids.length > 0 ? formData.class_ids : undefined,
      // Story 8.2: Use activity_ids for multi-activity assignments
      activity_ids: selectedActivityIds,
      // Story 9.6: Scheduled publishing
      scheduled_publish_date: formData.scheduled_publish_date
        ? formData.scheduled_publish_date.toISOString()
        : null,
      // Story 10.3: Video attachment (deprecated, use resources)
      video_path: formData.video_path,
      // Story 10.3+: Additional resources with subtitle control
      resources: formData.resources,
    }

    // Call mutation
    createAssignmentMutation.mutate(requestData)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && setShowCancelConfirm(true)}>
        <DialogContent
          className="max-w-[95vw] w-[1400px] h-[85vh] max-h-[850px] overflow-hidden flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
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
                const isCompleted = currentStep > step.number
                const isCurrent = currentStep === step.number

                return (
                  <div key={step.number} className="flex flex-col items-center">
                    {/* Step Circle */}
                    <div
                      className={`relative flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium transition-all duration-200 ${
                        isCompleted
                          ? "bg-teal-500 text-white shadow-sm"
                          : isCurrent
                            ? "bg-teal-500 text-white ring-2 ring-teal-500/20 shadow-md"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600"
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
                      }`}
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
              <StepSelectBook
                selectedBook={selectedBook}
                onSelectBook={handleBookSelect}
              />
            )}

            {currentStep === 1 && selectedBook && (
              <StepSelectActivities
                bookId={selectedBook.id}
                book={selectedBook}
                selectedActivityIds={selectedActivityIds}
                onActivityIdsChange={handleActivityIdsChange}
                timePlanningEnabled={formData.time_planning_enabled}
                onTimePlanningChange={(enabled) =>
                  handleFormDataChange({ time_planning_enabled: enabled })
                }
                dateGroups={formData.date_groups}
                onDateGroupsChange={(groups) =>
                  handleFormDataChange({ date_groups: groups })
                }
                onPreviewActivity={openPreview}
              />
            )}

            {currentStep === 2 && (
              <StepSelectRecipients
                formData={formData}
                onFormDataChange={handleFormDataChange}
              />
            )}

            {currentStep === 3 && selectedBook && (
              <StepAdditionalResources
                formData={formData}
                onFormDataChange={handleFormDataChange}
                bookId={selectedBook.id}
              />
            )}

            {currentStep === 4 && selectedBook && (
              <StepConfigureSettings
                formData={formData}
                onFormDataChange={handleFormDataChange}
                activityCount={selectedActivityIds.length}
              />
            )}

            {currentStep === 5 && selectedBook && (
              <StepReviewCreateMulti
                book={selectedBook}
                activityCount={selectedActivityIds.length}
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
                  {/* Story 9.7: Preview button on final step */}
                  <Button
                    variant="outline"
                    onClick={handlePreviewInNewTab}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    onClick={handleCreateAssignment}
                    disabled={createAssignmentMutation.isPending || createBulkAssignmentsMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {createAssignmentMutation.isPending || createBulkAssignmentsMutation.isPending
                      ? "Creating..."
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
    </>
  )
}

// Story 8.2: Review step for multi-activity assignments
interface StepReviewCreateMultiProps {
  book: Book
  activityCount: number
  formData: AssignmentFormData
}

function StepReviewCreateMulti({
  book,
  activityCount,
  formData,
}: StepReviewCreateMultiProps) {
  const recipientCount =
    formData.class_ids.length > 0
      ? `${formData.class_ids.length} class(es)`
      : `${formData.student_ids.length} student(s)`

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4 shrink-0">
        Review Assignment
      </h3>

      <ScrollArea className="flex-1 pr-4">
      <div className="grid gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Assignment Name</h4>
          <p className="text-muted-foreground">{formData.name}</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Book</h4>
          <p className="text-muted-foreground">{book.title}</p>
          <p className="text-sm text-muted-foreground">
            by {book.publisher_name}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Activities</h4>
          {formData.time_planning_enabled && formData.date_groups.length > 0 ? (
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
                    {group.activityIds.length} {group.activityIds.length === 1 ? "activity" : "activities"}
                  </span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2 italic">
                Each date group will create a separate assignment
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">
              {activityCount} {activityCount === 1 ? "activity" : "activities"}{" "}
              selected
            </p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Recipients</h4>
          <p className="text-muted-foreground">{recipientCount}</p>
        </div>

        {formData.instructions && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Instructions</h4>
            <p className="text-muted-foreground">{formData.instructions}</p>
          </div>
        )}

        {/* Story 9.6: Show publishing schedule */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Publishing</h4>
          {formData.scheduled_publish_date ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                Scheduled
              </span>
              <p className="text-muted-foreground">
                Will publish on {format(formData.scheduled_publish_date, "PPP 'at' p")}
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
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Due Date</h4>
            <p className="text-muted-foreground">
              {format(formData.due_date, "PPP 'at' p")}
            </p>
          </div>
        )}

        {formData.time_limit_minutes && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Time Limit</h4>
            <p className="text-muted-foreground">
              {formData.time_limit_minutes} minutes
            </p>
          </div>
        )}

        {/* Show resources if any */}
        {formData.resources && formData.resources.videos.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Additional Resources</h4>
            <p className="text-muted-foreground">
              {formData.resources.videos.length} video{formData.resources.videos.length > 1 ? "s" : ""} attached
            </p>
          </div>
        )}
      </div>
      </ScrollArea>
    </div>
  )
}
