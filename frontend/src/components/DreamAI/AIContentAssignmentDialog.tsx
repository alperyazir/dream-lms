/**
 * AIContentAssignmentDialog - Assign AI-generated content to students
 * Story 27.21: Content Library UI
 *
 * Simplified assignment flow for AI-generated activities.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Clock,
  Loader2,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  getActivityTypeColorClasses,
  getActivityTypeConfig,
} from "@/lib/activityTypeConfig"
import { assignAIContent } from "@/services/contentLibraryApi"
import { getMyClasses } from "@/services/teachersApi"
import type { ContentItem } from "@/types/content-library"
import type { Class } from "@/types/teacher"

interface AIContentAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: ContentItem | null
}

export function AIContentAssignmentDialog({
  open,
  onOpenChange,
  content,
}: AIContentAssignmentDialogProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Form state
  const [name, setName] = useState("")
  const [instructions, setInstructions] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [timeLimit, setTimeLimit] = useState("")
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])

  // Fetch teacher's classes
  const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["my-classes"],
    queryFn: getMyClasses,
    enabled: open,
  })

  // Reset form when content changes
  useEffect(() => {
    if (content && open) {
      setName(content.title)
      setInstructions("")
      setDueDate("")
      setTimeLimit("")
      setSelectedClassIds([])
    }
  }, [content, open])

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: (data: {
      contentId: string
      name: string
      instructions: string | null
      dueDate: string | null
      timeLimitMinutes: number | null
      classIds: string[]
    }) =>
      assignAIContent(data.contentId, {
        name: data.name,
        instructions: data.instructions,
        due_date: data.dueDate,
        time_limit_minutes: data.timeLimitMinutes,
        class_ids: data.classIds,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["contentLibrary"] })
      toast({
        title: "Assignment created",
        description: `"${name}" has been assigned successfully.`,
      })
      onOpenChange(false)
      // Navigate to the assignment
      if (data.assignment_id) {
        navigate({
          to: "/teacher/assignments/$assignmentId",
          params: { assignmentId: data.assignment_id },
        })
      }
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Assignment failed",
        description:
          err.response?.data?.detail ||
          "Failed to create assignment. Please try again.",
      })
    },
  })

  if (!content) return null

  const config = getActivityTypeConfig(content.activity_type)
  const colorClasses = getActivityTypeColorClasses(config.color)
  const IconComponent = config.icon

  const handleClassToggle = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId],
    )
  }

  const handleSelectAll = () => {
    if (classes) {
      if (selectedClassIds.length === classes.length) {
        setSelectedClassIds([])
      } else {
        setSelectedClassIds(classes.map((c) => c.id))
      }
    }
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter an assignment name.",
      })
      return
    }

    if (selectedClassIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Recipients required",
        description: "Please select at least one class.",
      })
      return
    }

    assignMutation.mutate({
      contentId: content.id,
      name: name.trim(),
      instructions: instructions.trim() || null,
      dueDate: dueDate || null,
      timeLimitMinutes: timeLimit ? parseInt(timeLimit, 10) : null,
      classIds: selectedClassIds,
    })
  }

  const totalStudents =
    classes
      ?.filter((c) => selectedClassIds.includes(c.id))
      .reduce((sum, c) => sum + (c.student_count || 0), 0) || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${colorClasses.bg}`}>
              <IconComponent className={`h-6 w-6 ${colorClasses.text}`} />
            </div>
            <div className="flex-1">
              <DialogTitle>Assign Content</DialogTitle>
              <DialogDescription>
                Create an assignment from "{content.title}"
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Content Info */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">{config.label}</Badge>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {content.item_count}{" "}
                  {content.item_count === 1 ? "item" : "items"}
                </span>
                {content.book_title && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {content.book_title}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Assignment Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Assignment Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter assignment name..."
              />
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Add instructions for students..."
                rows={3}
              />
            </div>

            {/* Due Date & Time Limit */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date (Optional)
                </Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeLimit" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Limit (Optional)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="timeLimit"
                    type="number"
                    min={1}
                    max={180}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    placeholder="Minutes"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>
            </div>

            {/* Class Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Select Classes *
                </Label>
                {classes && classes.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {selectedClassIds.length === classes.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                )}
              </div>

              {classesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !classes || classes.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You don't have any classes. Create a class first to assign
                    content.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2 rounded-lg border p-3">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-center space-x-3 rounded-md p-2 hover:bg-accent"
                    >
                      <Checkbox
                        id={`class-${cls.id}`}
                        checked={selectedClassIds.includes(cls.id)}
                        onCheckedChange={() => handleClassToggle(cls.id)}
                      />
                      <Label
                        htmlFor={`class-${cls.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <span className="font-medium">{cls.name}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({cls.student_count || 0} students)
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {selectedClassIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedClassIds.length} class
                  {selectedClassIds.length > 1 ? "es" : ""} selected (
                  {totalStudents} student{totalStudents !== 1 ? "s" : ""})
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={assignMutation.isPending || selectedClassIds.length === 0}
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              `Assign to ${selectedClassIds.length} Class${selectedClassIds.length > 1 ? "es" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
