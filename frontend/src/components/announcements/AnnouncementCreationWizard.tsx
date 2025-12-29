/**
 * Announcement Creation Wizard
 * Story 26.1: Multi-step announcement creation with improved UX
 */

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "./RichTextEditor"
import { RecipientSelector } from "./RecipientSelector"
import { CheckCircle2, FileText, Users } from "lucide-react"
import { teachersApi } from "@/services/teachersApi"

interface AnnouncementCreationWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    title: string
    content: string
    recipient_classroom_ids: string[]
    recipient_student_ids: string[]
  }) => Promise<void>
  isSubmitting: boolean
  initialData?: {
    title: string
    content: string
    recipientStudentIds?: string[]
  }
  isEditMode?: boolean
}

export function AnnouncementCreationWizard({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialData,
  isEditMode = false,
}: AnnouncementCreationWizardProps) {
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState(initialData?.title || "")
  const [content, setContent] = useState(initialData?.content || "")
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    initialData?.recipientStudentIds || []
  )
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch classes in edit mode to reconstruct classroom selections
  const { data: classes = [] } = useQuery({
    queryKey: ["teacher-classes"],
    queryFn: teachersApi.getMyClasses,
    enabled: isEditMode && open,
  })

  // Fetch students per class to determine which classrooms should be selected
  const { data: classStudentsGroups = [] } = useQuery({
    queryKey: ["teacher-class-students", classes.map((c) => c.id)],
    queryFn: () => teachersApi.getStudentsForClasses(classes.map((c) => c.id)),
    enabled: isEditMode && open && classes.length > 0,
  })

  // Reset all form fields when initialData changes (e.g., editing different announcements)
  useEffect(() => {
    if (initialData && isEditMode && classes.length > 0 && classStudentsGroups.length > 0) {
      setTitle(initialData.title || "")
      setContent(initialData.content || "")

      const recipientIds = initialData.recipientStudentIds || []
      const recipientIdSet = new Set(recipientIds)

      // Determine which classrooms should be selected
      const selectedClasses: string[] = []
      const individualStudents = new Set(recipientIds)

      // For each class, check if ALL students in that class are recipients
      for (const group of classStudentsGroups) {
        const classStudentIds = group.students.map((s) => s.id)

        // If class has students and ALL are in recipients, select the class
        if (classStudentIds.length > 0 && classStudentIds.every((id) => recipientIdSet.has(id))) {
          selectedClasses.push(group.class_id)
          // Remove these students from individual selection since they're covered by class
          classStudentIds.forEach((id) => individualStudents.delete(id))
        }
      }

      setSelectedClassIds(selectedClasses)
      setSelectedStudentIds(Array.from(individualStudents))
      setStep(1) // Reset to first step
    } else if (initialData && !isEditMode) {
      // For create mode, just reset basic fields
      setTitle(initialData.title || "")
      setContent(initialData.content || "")
      setSelectedStudentIds(initialData.recipientStudentIds || [])
      setStep(1)
    }
  }, [initialData, isEditMode, classes, classStudentsGroups])

  const handleClose = () => {
    // Reset form when closing
    setStep(1)
    setSearchTerm("")
    if (!isEditMode) {
      // Only clear everything if creating new announcement
      setTitle("")
      setContent("")
      setSelectedClassIds([])
      setSelectedStudentIds([])
    }
    onOpenChange(false)
  }

  const handleNext = () => {
    setStep(2)
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleSubmit = async () => {
    await onSubmit({
      title: title.trim(),
      content,
      recipient_classroom_ids: selectedClassIds,
      recipient_student_ids: selectedStudentIds,
    })
    handleClose()
  }

  const isStep1Valid = title.trim().length > 0 && content.trim().length > 0
  const isStep2Valid =
    selectedClassIds.length > 0 || selectedStudentIds.length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Announcement" : "Create Announcement"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? isEditMode
                ? "Update your announcement content"
                : "Write your announcement content"
              : isEditMode
                ? "Update who will receive this announcement"
                : "Select who will receive this announcement"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step === 1
                  ? "bg-teal-500 text-white"
                  : isStep1Valid
                    ? "bg-teal-100 text-teal-600"
                    : "bg-gray-200 text-gray-600"
              }`}
            >
              {isStep1Valid && step !== 1 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                step === 1 ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Content
            </span>
          </div>

          <div className="w-12 h-px bg-border" />

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step === 2
                  ? "bg-teal-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              <Users className="w-4 h-4" />
            </div>
            <span
              className={`text-sm font-medium ${
                step === 2 ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Recipients
            </span>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4 px-1">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                  maxLength={200}
                  autoFocus
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label>Content *</Label>
                <RichTextEditor content={content} onChange={setContent} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="px-1">
              <RecipientSelector
                selectedClassIds={selectedClassIds}
                selectedStudentIds={selectedStudentIds}
                onClassIdsChange={setSelectedClassIds}
                onStudentIdsChange={setSelectedStudentIds}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                Back
              </Button>
            )}

            {step === 1 ? (
              <Button onClick={handleNext} disabled={!isStep1Valid}>
                Next: Select Recipients
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isStep2Valid || isSubmitting}
              >
                {isSubmitting
                  ? isEditMode
                    ? "Saving..."
                    : "Sending..."
                  : isEditMode
                    ? "Save Changes"
                    : "Send Announcement"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
