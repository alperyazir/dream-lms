/**
 * Step 4: Configure Settings - Story 3.7, Story 9.6
 *
 * Form for configuring assignment settings (name, instructions, due date, time limit)
 * Story 9.6: Added scheduling option for publish immediately or schedule for later
 * Story 9.x: Time Planning mode - configure each date group separately
 */

import { format } from "date-fns"
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  Clock,
  FileText,
  Pencil,
  Send,
  Timer,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AssignmentFormData } from "@/types/assignment"

interface StepConfigureSettingsProps {
  formData: AssignmentFormData
  onFormDataChange: (data: Partial<AssignmentFormData>) => void
  activityCount?: number
}

export function StepConfigureSettings({
  formData,
  onFormDataChange,
  activityCount = 0,
}: StepConfigureSettingsProps) {
  // Track publish mode: "immediate" or "scheduled"
  const [publishMode, setPublishMode] = useState<"immediate" | "scheduled">(
    formData.scheduled_publish_date ? "scheduled" : "immediate",
  )

  // Track selected date index for Time Planning mode
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)

  // Track if we're editing a date
  const [editingDateIndex, setEditingDateIndex] = useState<number | null>(null)

  const handleNameChange = (value: string) => {
    onFormDataChange({ name: value })
  }

  const handleInstructionsChange = (value: string) => {
    onFormDataChange({ instructions: value })
  }

  const handleDueDateChange = (value: string) => {
    onFormDataChange({ due_date: value ? new Date(value) : null })
  }

  const handleTimeLimitChange = (value: string) => {
    const minutes = value ? Number.parseInt(value, 10) : null
    onFormDataChange({ time_limit_minutes: minutes })
  }

  const handlePublishModeChange = (mode: "immediate" | "scheduled") => {
    setPublishMode(mode)
    if (mode === "immediate") {
      onFormDataChange({ scheduled_publish_date: null })
    }
  }

  const handleScheduledPublishDateChange = (value: string) => {
    onFormDataChange({ scheduled_publish_date: value ? new Date(value) : null })
  }

  // Time Planning: Update date group's date
  const handleDateGroupDateChange = (index: number, newDate: Date) => {
    const newGroups = formData.date_groups.map((group, i) => {
      if (i === index) {
        return { ...group, date: newDate }
      }
      return group
    })
    onFormDataChange({ date_groups: newGroups })
    setEditingDateIndex(null)
  }

  // Time Planning: Update date group's due date
  const handleDateGroupDueDateChange = (index: number, value: string) => {
    const newGroups = formData.date_groups.map((group, i) => {
      if (i === index) {
        return { ...group, dueDate: value ? new Date(value) : null }
      }
      return group
    })
    onFormDataChange({ date_groups: newGroups })
  }

  // Time Planning: Update date group's time limit
  const handleDateGroupTimeLimitChange = (index: number, value: string) => {
    const newGroups = formData.date_groups.map((group, i) => {
      if (i === index) {
        const minutes = value ? Number.parseInt(value, 10) : null
        return { ...group, timeLimit: minutes }
      }
      return group
    })
    onFormDataChange({ date_groups: newGroups })
  }

  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return ""
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const formatDateTimeForInput = (date: Date | null): string => {
    if (!date) return ""
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const isScheduledDateValid = (): boolean => {
    if (!formData.scheduled_publish_date) return true
    if (!formData.due_date) return true
    return formData.scheduled_publish_date <= formData.due_date
  }

  const isTimePlanningMode = formData.time_planning_enabled && formData.date_groups.length > 0
  const currentGroup = isTimePlanningMode ? formData.date_groups[selectedDateIndex] : null

  // Time Planning Mode Layout
  if (isTimePlanningMode) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configure Assignment Settings</h3>

        <div className="flex gap-4 h-[500px]">
          {/* Left Column: Date List */}
          <div className="w-48 shrink-0 border rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Date Groups
            </h4>
            <ScrollArea className="h-[420px]">
              <div className="space-y-2 pr-2">
                {formData.date_groups.map((group, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-2 rounded-lg cursor-pointer transition-all border",
                      selectedDateIndex === index
                        ? "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700"
                        : "bg-white dark:bg-gray-800 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                    onClick={() => setSelectedDateIndex(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays
                          className={cn(
                            "h-4 w-4",
                            selectedDateIndex === index
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-muted-foreground"
                          )}
                        />
                        {editingDateIndex === index ? (
                          <Popover open onOpenChange={() => setEditingDateIndex(null)}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 px-1 text-xs">
                                {format(group.date, "dd MMM yyyy")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={group.date}
                                onSelect={(date) => {
                                  if (date) handleDateGroupDateChange(index, date)
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span
                            className={cn(
                              "text-sm font-medium",
                              selectedDateIndex === index
                                ? "text-blue-700 dark:text-blue-300"
                                : "text-foreground"
                            )}
                          >
                            {format(group.date, "dd MMM")}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingDateIndex(index)
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 ml-6">
                      {group.activityIds.length} activities
                    </div>
                    {group.dueDate && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1 ml-6 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Due: {format(group.dueDate, "dd MMM")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right Column: Settings for Selected Date */}
          <div className="flex-1 overflow-auto">
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Selected Date Header */}
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                    <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-lg">
                      {currentGroup && format(currentGroup.date, "EEEE, dd MMMM yyyy")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentGroup?.activityIds.length} activities assigned
                    </div>
                  </div>
                </div>

                {/* Due Date for this group */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    Due Date for this group
                  </Label>
                  <Input
                    type="date"
                    value={formatDateForInput(currentGroup?.dueDate)}
                    onChange={(e) => handleDateGroupDueDateChange(selectedDateIndex, e.target.value)}
                    min={currentGroup ? formatDateForInput(currentGroup.date) : undefined}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    When should students complete activities for {currentGroup && format(currentGroup.date, "dd MMM")}?
                  </p>
                </div>

                {/* Time Limit for this group */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Time Limit <span className="text-muted-foreground">(Optional)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={currentGroup?.timeLimit || ""}
                      onChange={(e) => handleDateGroupTimeLimitChange(selectedDateIndex, e.target.value)}
                      min="1"
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">
                    Global Settings (applies to all dates)
                  </h4>
                </div>

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
                    Base name for assignments (date will be appended)
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
                    rows={3}
                    className="w-full resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Creating {formData.date_groups.length} assignments with {activityCount} total activities
            </span>
          </div>
          <Badge variant="secondary">
            Time Planning Mode
          </Badge>
        </div>
      </div>
    )
  }

  // Normal Mode Layout (existing)
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-4 shrink-0">Configure Assignment Settings</h3>

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-6 pb-4">
          {/* Activity Summary Card */}
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {activityCount} {activityCount === 1 ? "Activity" : "Activities"} Selected
                  </div>
                  <div className="text-sm text-muted-foreground">
                    All activities will have the same due date
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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

          {/* Publishing Schedule */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              <Timer className="w-4 h-4 inline mr-1" />
              When to Publish
            </Label>
            <RadioGroup
              value={publishMode}
              onValueChange={(value) => handlePublishModeChange(value as "immediate" | "scheduled")}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="immediate" id="publish-immediate" />
                <Label htmlFor="publish-immediate" className="font-normal cursor-pointer flex items-center gap-2">
                  <Send className="w-4 h-4 text-green-500" />
                  Publish immediately
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scheduled" id="publish-scheduled" />
                <Label htmlFor="publish-scheduled" className="font-normal cursor-pointer flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-amber-500" />
                  Schedule for later
                </Label>
              </div>
            </RadioGroup>

            {publishMode === "scheduled" && (
              <div className="ml-6 mt-3 space-y-2">
                <Label htmlFor="scheduled-publish-date" className="text-sm font-medium">
                  Publish Date & Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="scheduled-publish-date"
                  type="datetime-local"
                  value={formatDateTimeForInput(formData.scheduled_publish_date)}
                  onChange={(e) => handleScheduledPublishDateChange(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-64"
                />
                <p className="text-xs text-muted-foreground">
                  Assignment will become visible to students at this date and time
                </p>
                {!isScheduledDateValid() && (
                  <p className="text-xs text-destructive">
                    Publish date must be before or equal to the due date
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due-date" className="text-sm font-medium">
              <CalendarIcon className="w-4 h-4 inline mr-1" />
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
      </ScrollArea>
    </div>
  )
}
