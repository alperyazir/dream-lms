/**
 * Assignment Creation Dialog - Story 3.7, Story 8.2
 *
 * Multi-step wizard for creating assignments:
 * - Step 0: Select Book
 * - Step 1: Select Activities (page-based - Story 8.2)
 * - Step 2: Select Recipients (classes or individual students)
 * - Step 3: Configure Settings (name, due date, time limit, instructions)
 * - Step 4: Review & Create
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { format } from "date-fns"
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
import useCustomToast from "@/hooks/useCustomToast"
import { assignmentsApi } from "@/services/assignmentsApi"
import type {
  AssignmentCreateRequest,
  AssignmentFormData,
} from "@/types/assignment"
import type { Book } from "@/types/book"
import { StepConfigureSettings } from "./StepConfigureSettings"
import { StepSelectActivities } from "./StepSelectActivities"
import { StepSelectBook } from "./StepSelectBook"
import { StepSelectRecipients } from "./StepSelectRecipients"

interface AssignmentCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  book?: Book // Optional pre-selected book
}

const STEPS = [
  { number: 0, label: "Select Book" },
  { number: 1, label: "Select Activities" },
  { number: 2, label: "Select Recipients" },
  { number: 3, label: "Configure Settings" },
  { number: 4, label: "Review & Create" },
]

export function AssignmentCreationDialog({
  isOpen,
  onClose,
  book: initialBook,
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
  const [formData, setFormData] = useState<AssignmentFormData>({
    name: "",
    instructions: "",
    due_date: null,
    time_limit_minutes: null,
    student_ids: [],
    class_ids: [],
    activity_ids: [],
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
      })
      setShowCancelConfirm(false)
    }
  }, [isOpen, initialBook])

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

  // Mutation for creating assignment
  const createAssignmentMutation = useMutation({
    mutationFn: assignmentsApi.createAssignment,
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })

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

    // Validate step 3 (Configure Settings)
    if (currentStep === 3) {
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
    })
    setShowCancelConfirm(false)
    onClose()
  }

  const handleCreateAssignment = async () => {
    if (!selectedBook) {
      showErrorToast("Please select a book")
      return
    }

    if (selectedActivityIds.length === 0) {
      showErrorToast("Please select at least one activity")
      return
    }

    // Prepare API request payload
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
    }

    // Call mutation
    createAssignmentMutation.mutate(requestData)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
          </DialogHeader>

          {/* Step Indicator - Elegant Design */}
          <div className="relative mb-4 shrink-0">
            {/* Progress Bar Background */}
            <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
            {/* Progress Bar Fill */}
            <div
              className="absolute top-3 left-0 h-0.5 bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-300"
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
                      className={`relative flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all duration-200 ${
                        isCompleted
                          ? "bg-teal-500 text-white shadow-sm"
                          : isCurrent
                          ? "bg-teal-500 text-white ring-4 ring-teal-500/20 shadow-md"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>{step.number + 1}</span>
                      )}
                    </div>
                    {/* Step Label */}
                    <span
                      className={`text-[10px] mt-1.5 font-medium transition-colors ${
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
          <div className="min-h-[550px] overflow-hidden flex-1 min-w-0">
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
              />
            )}

            {currentStep === 2 && (
              <StepSelectRecipients
                formData={formData}
                onFormDataChange={handleFormDataChange}
              />
            )}

            {currentStep === 3 && (
              <StepConfigureSettings
                formData={formData}
                onFormDataChange={handleFormDataChange}
              />
            )}

            {currentStep === 4 && selectedBook && (
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
                <Button
                  onClick={handleCreateAssignment}
                  disabled={createAssignmentMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {createAssignmentMutation.isPending
                    ? "Creating..."
                    : "Create Assignment"}
                </Button>
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
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">
        Review Assignment
      </h3>

      <div className="grid gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Assignment Name</h4>
          <p className="text-muted-foreground">{formData.name}</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Book</h4>
          <p className="text-muted-foreground">{book.title}</p>
          <p className="text-sm text-muted-foreground">by {book.publisher_name}</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Activities</h4>
          <p className="text-muted-foreground">
            {activityCount} {activityCount === 1 ? "activity" : "activities"}{" "}
            selected
          </p>
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
      </div>
    </div>
  )
}
