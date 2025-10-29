import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import {
  type Activity,
  type Book,
  type AssignmentFull,
  mockStudents,
  mockClasses,
} from "@/lib/mockData"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { useAssignmentStore } from "@/stores/assignmentStore"

interface WizardFormData {
  activityId: string
  activityName: string
  bookName: string
  selectedStudents: string[]
  selectedClasses: string[]
  assignmentName: string
  instructions: string
  dueDate: string
  timeLimit: string
}

export interface AssignmentWizardProps {
  open: boolean
  onClose: () => void
  activity: Activity
  book: Book
}

export function AssignmentWizard({
  open,
  onClose,
  activity,
  book,
}: AssignmentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<WizardFormData>({
    activityId: activity.id,
    activityName: activity.title,
    bookName: book.title,
    selectedStudents: [],
    selectedClasses: [],
    assignmentName: `${activity.title} - Assignment`,
    instructions: "",
    dueDate: "",
    timeLimit: activity.duration_minutes?.toString() || "",
  })
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const { showSuccessToast } = useCustomToast()
  const addAssignment = useAssignmentStore((state) => state.addAssignment)

  const validateStep = (step: number): boolean => {
    const errors: string[] = []

    switch (step) {
      case 2:
        if (formData.selectedStudents.length === 0 && formData.selectedClasses.length === 0) {
          errors.push("Please select at least one student or class")
        }
        break
      case 3:
        if (!formData.assignmentName.trim()) {
          errors.push("Assignment name is required")
        }
        if (!formData.dueDate) {
          errors.push("Due date is required")
        } else {
          const dueDate = new Date(formData.dueDate)
          const now = new Date()
          if (dueDate <= now) {
            errors.push("Due date must be in the future")
          }
        }
        break
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
      setValidationErrors([])
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    setValidationErrors([])
  }

  const handleCreate = () => {
    const newAssignment: AssignmentFull = {
      id: crypto.randomUUID(),
      teacherId: "1", // Mock teacher ID
      activityId: formData.activityId,
      bookId: book.id,
      name: formData.assignmentName,
      instructions: formData.instructions,
      due_date: new Date(formData.dueDate).toISOString(),
      time_limit_minutes: formData.timeLimit ? parseInt(formData.timeLimit) : undefined,
      created_at: new Date().toISOString(),
      completionRate: 0,
    }

    // Add to assignments store (triggers React re-render)
    addAssignment(newAssignment)

    showSuccessToast("Assignment created successfully!")
    handleClose()
  }

  const handleClose = () => {
    setCurrentStep(1)
    setFormData({
      activityId: activity.id,
      activityName: activity.title,
      bookName: book.title,
      selectedStudents: [],
      selectedClasses: [],
      assignmentName: `${activity.title} - Assignment`,
      instructions: "",
      dueDate: "",
      timeLimit: activity.duration_minutes?.toString() || "",
    })
    setValidationErrors([])
    onClose()
  }

  const toggleStudent = (studentId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter((id) => id !== studentId)
        : [...prev.selectedStudents, studentId],
    }))
  }

  const toggleClass = (classId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter((id) => id !== classId)
        : [...prev.selectedClasses, classId],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Assignment - Step {currentStep}/4</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={cn(
                  "h-2 flex-1 rounded transition-colors",
                  step === currentStep
                    ? "bg-teal-500"
                    : step < currentStep
                      ? "bg-teal-300"
                      : "bg-gray-200",
                )}
                aria-label={`Step ${step} ${step === currentStep ? "active" : step < currentStep ? "completed" : "pending"}`}
              />
            ))}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3 space-y-1">
              {validationErrors.map((error, idx) => (
                <p key={idx} className="text-sm text-red-800">
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Step Content */}
          {currentStep === 1 && <Step1ReviewActivity activity={activity} book={book} />}
          {currentStep === 2 && (
            <Step2SelectStudents
              selectedStudents={formData.selectedStudents}
              selectedClasses={formData.selectedClasses}
              onToggleStudent={toggleStudent}
              onToggleClass={toggleClass}
            />
          )}
          {currentStep === 3 && (
            <Step3Configure
              formData={formData}
              onChange={(updates) =>
                setFormData((prev) => ({ ...prev, ...updates }))
              }
            />
          )}
          {currentStep === 4 && <Step4Review formData={formData} />}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <div className="space-x-2">
              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
              {currentStep < 4 ? (
                <Button onClick={handleNext} className="bg-teal-600 hover:bg-teal-700">
                  Next
                </Button>
              ) : (
                <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700">
                  Create Assignment
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Step 1: Review Activity
function Step1ReviewActivity({ activity, book }: { activity: Activity; book: Book }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Review Activity</h3>
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div>
          <span className="text-sm font-semibold text-muted-foreground">Book:</span>
          <p className="text-base">{book.title}</p>
        </div>
        <div>
          <span className="text-sm font-semibold text-muted-foreground">Activity:</span>
          <p className="text-base">{activity.title}</p>
        </div>
        <div>
          <span className="text-sm font-semibold text-muted-foreground">Type:</span>
          <div className="mt-1">
            <Badge variant="outline">
              {activity.activityType.replace(/([A-Z])/g, " $1").trim()}
            </Badge>
          </div>
        </div>
        {activity.duration_minutes && (
          <div>
            <span className="text-sm font-semibold text-muted-foreground">
              Duration:
            </span>
            <p className="text-base">{activity.duration_minutes} minutes</p>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Review the activity details before proceeding to student selection.
      </p>
    </div>
  )
}

// Step 2: Select Students/Classes
function Step2SelectStudents({
  selectedStudents,
  selectedClasses,
  onToggleStudent,
  onToggleClass,
}: {
  selectedStudents: string[]
  selectedClasses: string[]
  onToggleStudent: (id: string) => void
  onToggleClass: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Students or Classes</h3>

      {/* Classes Section */}
      <div>
        <h4 className="font-medium mb-2">Classes</h4>
        <div className="space-y-2 bg-gray-50 rounded-lg p-4">
          {mockClasses.map((classItem) => (
            <div key={classItem.id} className="flex items-center space-x-2">
              <Checkbox
                id={`class-${classItem.id}`}
                checked={selectedClasses.includes(classItem.id)}
                onCheckedChange={() => onToggleClass(classItem.id)}
              />
              <label
                htmlFor={`class-${classItem.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {classItem.name} ({classItem.studentCount} students)
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Students Section */}
      <div>
        <h4 className="font-medium mb-2">Individual Students</h4>
        <div className="space-y-2 bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
          {mockStudents.map((student) => (
            <div key={student.id} className="flex items-center space-x-2">
              <Checkbox
                id={`student-${student.id}`}
                checked={selectedStudents.includes(student.id)}
                onCheckedChange={() => onToggleStudent(student.id)}
              />
              <label
                htmlFor={`student-${student.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {student.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Selected: {selectedClasses.length} class(es), {selectedStudents.length} student(s)
      </p>
    </div>
  )
}

// Step 3: Configure Assignment
function Step3Configure({
  formData,
  onChange,
}: {
  formData: WizardFormData
  onChange: (updates: Partial<WizardFormData>) => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Configure Assignment</h3>

      <div className="space-y-4">
        {/* Assignment Name */}
        <div>
          <label htmlFor="assignmentName" className="block text-sm font-medium mb-1">
            Assignment Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="assignmentName"
            value={formData.assignmentName}
            onChange={(e) => onChange({ assignmentName: e.target.value })}
            placeholder="Enter assignment name"
          />
        </div>

        {/* Instructions */}
        <div>
          <label htmlFor="instructions" className="block text-sm font-medium mb-1">
            Instructions
          </label>
          <Textarea
            id="instructions"
            value={formData.instructions}
            onChange={(e) => onChange({ instructions: e.target.value })}
            placeholder="Enter instructions for students (optional)"
            rows={4}
          />
        </div>

        {/* Due Date */}
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium mb-1">
            Due Date <span className="text-red-500">*</span>
          </label>
          <Input
            id="dueDate"
            type="datetime-local"
            value={formData.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
          />
        </div>

        {/* Time Limit */}
        <div>
          <label htmlFor="timeLimit" className="block text-sm font-medium mb-1">
            Time Limit (minutes)
          </label>
          <Input
            id="timeLimit"
            type="number"
            min="1"
            value={formData.timeLimit}
            onChange={(e) => onChange({ timeLimit: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>
    </div>
  )
}

// Step 4: Review & Create
function Step4Review({ formData }: { formData: WizardFormData }) {
  const totalRecipients = formData.selectedStudents.length +
    formData.selectedClasses.reduce((sum, classId) => {
      const classItem = mockClasses.find((c) => c.id === classId)
      return sum + (classItem?.studentCount || 0)
    }, 0)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Review & Confirm</h3>

      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div>
          <span className="text-sm font-semibold text-muted-foreground">Assignment Name:</span>
          <p className="text-base">{formData.assignmentName}</p>
        </div>

        <div>
          <span className="text-sm font-semibold text-muted-foreground">Activity:</span>
          <p className="text-base">{formData.activityName}</p>
        </div>

        <div>
          <span className="text-sm font-semibold text-muted-foreground">Book:</span>
          <p className="text-base">{formData.bookName}</p>
        </div>

        <div>
          <span className="text-sm font-semibold text-muted-foreground">Recipients:</span>
          <p className="text-base">~{totalRecipients} student(s)</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formData.selectedClasses.length} class(es), {formData.selectedStudents.length} individual student(s)
          </p>
        </div>

        {formData.instructions && (
          <div>
            <span className="text-sm font-semibold text-muted-foreground">Instructions:</span>
            <p className="text-base whitespace-pre-wrap">{formData.instructions}</p>
          </div>
        )}

        <div>
          <span className="text-sm font-semibold text-muted-foreground">Due Date:</span>
          <p className="text-base">
            {new Date(formData.dueDate).toLocaleString()}
          </p>
        </div>

        {formData.timeLimit && (
          <div>
            <span className="text-sm font-semibold text-muted-foreground">Time Limit:</span>
            <p className="text-base">{formData.timeLimit} minutes</p>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Click "Create Assignment" to finalize and notify students.
      </p>
    </div>
  )
}
