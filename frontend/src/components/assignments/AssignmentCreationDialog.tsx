/**
 * Assignment Creation Dialog - Story 3.7
 *
 * Multi-step wizard for creating assignments:
 * - Step 0: Review Activity
 * - Step 1: Select Recipients (classes or individual students)
 * - Step 2: Configure Settings (name, due date, time limit, instructions)
 * - Step 3: Review & Create
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { format } from "date-fns"
import { useEffect, useState } from "react"
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
import type { Activity, Book } from "@/types/book"
import { StepConfigureSettings } from "./StepConfigureSettings"
import { StepReviewActivity } from "./StepReviewActivity"
import { StepReviewCreate } from "./StepReviewCreate"
import { StepSelectBookActivity } from "./StepSelectBookActivity"
import { StepSelectRecipients } from "./StepSelectRecipients"

interface AssignmentCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  activity?: Activity
  book?: Book
}

const STEPS = [
  { number: 0, label: "Select Book & Activity" },
  { number: 1, label: "Review Activity" },
  { number: 2, label: "Select Recipients" },
  { number: 3, label: "Configure Settings" },
  { number: 4, label: "Review & Create" },
]

export function AssignmentCreationDialog({
  isOpen,
  onClose,
  activity: initialActivity,
  book: initialBook,
}: AssignmentCreationDialogProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // State for selected book and activity
  const [selectedBook, setSelectedBook] = useState<Book | null>(
    initialBook || null,
  )
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    initialActivity || null,
  )

  const [currentStep, setCurrentStep] = useState(
    initialBook && initialActivity ? 1 : 0, // Skip book selection if pre-selected
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [formData, setFormData] = useState<AssignmentFormData>({
    name: selectedActivity
      ? `${selectedActivity.title || "Activity"} - ${format(new Date(), "MMM dd, yyyy")}`
      : "",
    instructions: "",
    due_date: null,
    time_limit_minutes: null,
    student_ids: [],
    class_ids: [],
  })

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialBook && initialActivity ? 1 : 0)
      setValidationError(null)
      setSelectedBook(initialBook || null)
      setSelectedActivity(initialActivity || null)
      setFormData({
        name: initialActivity
          ? `${initialActivity.title || "Activity"} - ${format(new Date(), "MMM dd, yyyy")}`
          : "",
        instructions: "",
        due_date: null,
        time_limit_minutes: null,
        student_ids: [],
        class_ids: [],
      })
      setShowCancelConfirm(false)
    }
  }, [isOpen, initialBook, initialActivity])

  // Update form data when activity is selected
  useEffect(() => {
    if (selectedActivity) {
      setFormData((prev) => ({
        ...prev,
        name: `${selectedActivity.title || "Activity"} - ${format(new Date(), "MMM dd, yyyy")}`,
      }))
    }
  }, [selectedActivity])

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

  const handleNext = () => {
    // Validate step 0 (Select Book & Activity)
    if (currentStep === 0) {
      if (!selectedBook) {
        showErrorToast("Please select a book")
        return
      }
      if (!selectedActivity) {
        showErrorToast("Please select an activity")
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
      setCurrentStep((prev) => prev - 1)
    }
  }

  // Check if form has been modified from initial state
  const isFormDirty = (): boolean => {
    // Check if we've progressed beyond initial step
    if (currentStep > (initialBook && initialActivity ? 1 : 0)) {
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
    setCurrentStep(initialBook && initialActivity ? 1 : 0)
    setValidationError(null)
    setSelectedBook(initialBook || null)
    setSelectedActivity(initialActivity || null)
    setFormData({
      name: selectedActivity
        ? `${selectedActivity.title || "Activity"} - ${format(new Date(), "MMM dd, yyyy")}`
        : "",
      instructions: "",
      due_date: null,
      time_limit_minutes: null,
      student_ids: [],
      class_ids: [],
    })
    setShowCancelConfirm(false)
    onClose()
  }

  const handleCreateAssignment = async () => {
    if (!selectedActivity || !selectedBook) {
      showErrorToast("Please select a book and activity")
      return
    }

    // Prepare API request payload
    const requestData: AssignmentCreateRequest = {
      activity_id: selectedActivity.id,
      book_id: selectedBook.id,
      name: formData.name,
      instructions: formData.instructions || null,
      due_date: formData.due_date ? formData.due_date.toISOString() : null,
      time_limit_minutes: formData.time_limit_minutes,
      student_ids:
        formData.student_ids.length > 0 ? formData.student_ids : undefined,
      class_ids: formData.class_ids.length > 0 ? formData.class_ids : undefined,
    }

    // Call mutation
    createAssignmentMutation.mutate(requestData)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-6">
            {STEPS.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      currentStep >= step.number
                        ? "bg-teal-600 text-white dark:bg-teal-500"
                        : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {step.number + 1}
                  </div>
                  <span
                    className={`text-xs mt-1 text-center ${
                      currentStep >= step.number
                        ? "text-teal-600 font-medium dark:text-teal-400"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      currentStep > step.number ? "bg-teal-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">
            {currentStep === 0 && (
              <StepSelectBookActivity
                selectedBook={selectedBook}
                selectedActivity={selectedActivity}
                onSelectBook={setSelectedBook}
                onSelectActivity={setSelectedActivity}
              />
            )}

            {currentStep === 1 && selectedActivity && selectedBook && (
              <StepReviewActivity
                activity={selectedActivity}
                book={selectedBook}
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

            {currentStep === 4 && selectedActivity && selectedBook && (
              <StepReviewCreate
                activity={selectedActivity}
                book={selectedBook}
                formData={formData}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
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
