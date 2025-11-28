/**
 * Step 3: Configure Settings - Story 3.7
 *
 * Form for configuring assignment settings (name, instructions, due date, time limit)
 */

import { Calendar, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AssignmentFormData } from "@/types/assignment"

interface StepConfigureSettingsProps {
  formData: AssignmentFormData
  onFormDataChange: (data: Partial<AssignmentFormData>) => void
}

export function StepConfigureSettings({
  formData,
  onFormDataChange,
}: StepConfigureSettingsProps) {
  const handleNameChange = (value: string) => {
    onFormDataChange({ name: value })
  }

  const handleInstructionsChange = (value: string) => {
    onFormDataChange({ instructions: value })
  }

  const handleDueDateChange = (value: string) => {
    // Convert empty string to null, otherwise create Date object
    onFormDataChange({ due_date: value ? new Date(value) : null })
  }

  const handleTimeLimitChange = (value: string) => {
    // Convert empty string to null, otherwise parse as integer
    const minutes = value ? parseInt(value, 10) : null
    onFormDataChange({ time_limit_minutes: minutes })
  }

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return ""
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Configure Assignment Settings</h3>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Assignment Name */}
          <div className="space-y-2">
            <Label htmlFor="assignment-name" className="text-sm font-medium">
              Assignment Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="assignment-name"
              type="text"
              placeholder="Enter assignment name..."
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Give your assignment a clear, descriptive name
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions" className="text-sm font-medium">
              Instructions <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="instructions"
              placeholder="Add any special instructions for students..."
              value={formData.instructions}
              onChange={(e) => handleInstructionsChange(e.target.value)}
              rows={4}
              className="w-full resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Provide additional context or instructions for completing this assignment
            </p>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due-date" className="text-sm font-medium">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="due-date"
              type="date"
              value={formatDateForInput(formData.due_date)}
              onChange={(e) => handleDueDateChange(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Set a deadline for students to complete this assignment
            </p>
          </div>

          {/* Time Limit */}
          <div className="space-y-2">
            <Label htmlFor="time-limit" className="text-sm font-medium">
              <Clock className="w-4 h-4 inline mr-1" />
              Time Limit <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="time-limit"
                type="number"
                placeholder="60"
                value={formData.time_limit_minutes || ""}
                onChange={(e) => handleTimeLimitChange(e.target.value)}
                min="1"
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Restrict how long students have to complete the assignment once started
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <p className="text-sm text-muted-foreground text-center">
        Review your settings and click "Next" to continue.
      </p>
    </div>
  )
}
