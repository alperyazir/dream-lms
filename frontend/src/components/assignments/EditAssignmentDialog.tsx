/**
 * Edit Assignment Dialog Component
 * Story 3.8: Teacher Assignment Management Dashboard
 *
 * Allows teachers to edit editable fields of existing assignments:
 * - name, instructions, due_date, time_limit_minutes
 * Immutable fields are displayed as read-only (activity, book, recipients)
 */

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { updateAssignment } from "@/services/assignmentsApi"
import type { AssignmentListItem, AssignmentUpdateRequest } from "@/types/assignment"

/**
 * Validation schema for assignment update
 */
const updateSchema = z.object({
  name: z.string().min(1, "Name is required").max(500, "Name must be 500 characters or less"),
  instructions: z.string().optional(),
  due_date: z.string().optional(),
  time_limit_minutes: z.number().int().positive("Time limit must be positive").nullable().optional(),
})

type UpdateFormData = z.infer<typeof updateSchema>

interface EditAssignmentDialogProps {
  isOpen: boolean
  onClose: () => void
  assignment: AssignmentListItem
}

export function EditAssignmentDialog({
  isOpen,
  onClose,
  assignment,
}: EditAssignmentDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: assignment.name,
      instructions: assignment.instructions || "",
      due_date: assignment.due_date ? assignment.due_date.split("T")[0] : "",
      time_limit_minutes: assignment.time_limit_minutes,
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: AssignmentUpdateRequest) =>
      updateAssignment(assignment.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      toast({
        title: "Success",
        description: "Assignment updated successfully!",
      })
      onClose()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error?.response?.data?.detail || "Failed to update assignment",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: UpdateFormData) => {
    // Convert form data to API format
    const updateData: AssignmentUpdateRequest = {
      name: data.name,
      instructions: data.instructions || null,
      due_date: data.due_date
        ? new Date(data.due_date).toISOString()
        : null,
      time_limit_minutes: data.time_limit_minutes || null,
    }

    updateMutation.mutate(updateData)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>
            Update the assignment details. Activity and recipients cannot be changed after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Assignment Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Assignment Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Enter assignment name"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions (optional)</Label>
            <Textarea
              id="instructions"
              {...register("instructions")}
              placeholder="Add special instructions for students"
              rows={4}
            />
            {errors.instructions && (
              <p className="text-sm text-red-500">{errors.instructions.message}</p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date (optional)</Label>
            <Input
              id="due_date"
              type="date"
              {...register("due_date")}
              min={format(new Date(), "yyyy-MM-dd")}
            />
            {errors.due_date && (
              <p className="text-sm text-red-500">{errors.due_date.message}</p>
            )}
          </div>

          {/* Time Limit */}
          <div className="space-y-2">
            <Label htmlFor="time_limit_minutes">Time Limit (minutes, optional)</Label>
            <Input
              id="time_limit_minutes"
              type="number"
              {...register("time_limit_minutes", { valueAsNumber: true })}
              placeholder="e.g., 30"
              min="1"
            />
            {errors.time_limit_minutes && (
              <p className="text-sm text-red-500">
                {errors.time_limit_minutes.message}
              </p>
            )}
          </div>

          {/* Read-only fields */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Read-Only Information
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Book</Label>
                <p className="text-sm">{assignment.book_title}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Activity</Label>
                <p className="text-sm">{assignment.activity_title}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Activity Type</Label>
                <p className="text-sm capitalize">{assignment.activity_type}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Students Assigned</Label>
                <p className="text-sm">{assignment.total_students} students</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
