/**
 * Edit Activities Dialog Component - Story 9.8
 *
 * Allows teachers to modify activities in an existing assignment:
 * - Add new activities from the same book
 * - Remove existing activities
 * - Reorder activities via drag and drop
 * - Shows warning if removing activities with student progress
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { updateAssignment } from "@/services/assignmentsApi"
import { booksApi } from "@/services/booksApi"
import type { ActivityInfo, AssignmentUpdateRequest } from "@/types/assignment"
import type { Activity } from "@/types/book"

interface EditActivitiesDialogProps {
  isOpen: boolean
  onClose: () => void
  assignmentId: string
  assignmentName: string
  bookId: string
  bookTitle: string
  currentActivities: ActivityInfo[]
}

/**
 * Get activity type display name
 */
function getActivityTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    circle: "Circle",
    match_the_words: "Match Words",
    fill_in_the_blanks: "Fill Blanks",
    multiple_choice: "Multiple Choice",
    drag_and_drop: "Drag & Drop",
  }
  return typeMap[type] || type
}

/**
 * Activity list item with drag handle and remove button
 */
interface ActivityItemProps {
  activity: ActivityInfo
  index: number
  onRemove: (id: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  isFirst: boolean
  isLast: boolean
  canRemove: boolean
}

function ActivityItem({
  activity,
  index,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  canRemove,
}: ActivityItemProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-card border rounded-lg group">
      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => onMoveUp(index)}
          disabled={isFirst}
        >
          <span className="text-xs">^</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => onMoveDown(index)}
          disabled={isLast}
        >
          <span className="text-xs">v</span>
        </Button>
      </div>

      {/* Drag handle */}
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

      {/* Activity info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {index + 1}.
          </span>
          <span className="font-medium truncate">
            {activity.title || `Activity ${index + 1}`}
          </span>
        </div>
        <Badge variant="outline" className="text-xs mt-1">
          {getActivityTypeLabel(activity.activity_type)}
        </Badge>
      </div>

      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(activity.id)}
        disabled={!canRemove}
        title={canRemove ? "Remove activity" : "Cannot remove - at least one activity required"}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

/**
 * Available activity item to add
 */
interface AvailableActivityItemProps {
  activity: Activity
  onAdd: (activity: Activity) => void
  isSelected: boolean
}

function AvailableActivityItem({
  activity,
  onAdd,
  isSelected,
}: AvailableActivityItemProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? "border-primary bg-primary/5 cursor-not-allowed opacity-60"
          : "hover:border-primary/50 hover:bg-muted/50"
      }`}
      onClick={() => !isSelected && onAdd(activity)}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate text-sm">
          {activity.title || `Activity`}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {getActivityTypeLabel(activity.activity_type)}
          </Badge>
        </div>
      </div>
      {isSelected ? (
        <Badge variant="secondary" className="text-xs">
          Added
        </Badge>
      ) : (
        <Plus className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  )
}

export function EditActivitiesDialog({
  isOpen,
  onClose,
  assignmentId,
  assignmentName,
  bookId,
  bookTitle,
  currentActivities,
}: EditActivitiesDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Local state for edited activities
  const [activities, setActivities] = useState<ActivityInfo[]>([])
  const [showAddPanel, setShowAddPanel] = useState(false)

  // Initialize activities when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActivities([...currentActivities].sort((a, b) => a.order_index - b.order_index))
      setShowAddPanel(false)
    }
  }, [isOpen, currentActivities])

  // Fetch all activities from the book for adding
  const { data: bookActivities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ["book-activities", bookId],
    queryFn: () => booksApi.getBookActivities(bookId),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen && showAddPanel,
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: AssignmentUpdateRequest) =>
      updateAssignment(assignmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["assignment", assignmentId] })
      toast({
        title: "Success",
        description: "Activities updated successfully!",
      })
      onClose()
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update activities",
        variant: "destructive",
      })
    },
  })

  // Handlers
  const handleRemove = useCallback((activityId: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== activityId))
  }, [])

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return
    setActivities((prev) => {
      const newList = [...prev]
      ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
      return newList
    })
  }, [])

  const handleMoveDown = useCallback((index: number) => {
    setActivities((prev) => {
      if (index >= prev.length - 1) return prev
      const newList = [...prev]
      ;[newList[index], newList[index + 1]] = [newList[index + 1], newList[index]]
      return newList
    })
  }, [])

  const handleAddActivity = useCallback((activity: Activity) => {
    const newActivity: ActivityInfo = {
      id: activity.id,
      title: activity.title,
      activity_type: activity.activity_type,
      order_index: 0, // Will be recalculated on save
    }
    setActivities((prev) => [...prev, newActivity])
  }, [])

  const handleSave = () => {
    if (activities.length === 0) {
      toast({
        title: "Error",
        description: "Assignment must have at least one activity",
        variant: "destructive",
      })
      return
    }

    const activityIds = activities.map((a) => a.id)
    updateMutation.mutate({ activity_ids: activityIds })
  }

  const handleClose = () => {
    if (!updateMutation.isPending) {
      onClose()
    }
  }

  // Check if there are changes
  const hasChanges =
    activities.length !== currentActivities.length ||
    activities.some(
      (a, i) => a.id !== currentActivities.sort((x, y) => x.order_index - y.order_index)[i]?.id
    )

  // Get IDs of currently selected activities for the add panel
  const selectedActivityIds = new Set(activities.map((a) => a.id))

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Activities</DialogTitle>
          <DialogDescription>
            Modify activities for "{assignmentName}" from {bookTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Warning about student progress */}
        {currentActivities.length > 0 && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              Removing activities that students have already started may affect their progress.
              Reordering activities is safe.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* Current Activities List */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">
                Current Activities ({activities.length})
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddPanel(!showAddPanel)}
              >
                {showAddPanel ? (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Close
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>

            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-2">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No activities selected</p>
                    <p className="text-sm">Click "Add" to add activities</p>
                  </div>
                ) : (
                  activities.map((activity, index) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      index={index}
                      onRemove={handleRemove}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      isFirst={index === 0}
                      isLast={index === activities.length - 1}
                      canRemove={activities.length > 1}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Add Activities Panel */}
          {showAddPanel && (
            <div className="w-64 flex flex-col min-h-0 border-l pl-4">
              <h4 className="text-sm font-semibold mb-2">Available Activities</h4>
              <ScrollArea className="flex-1 pr-2">
                {isLoadingActivities ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : bookActivities && bookActivities.length > 0 ? (
                  <div className="space-y-2">
                    {bookActivities.map((activity) => (
                      <AvailableActivityItem
                        key={activity.id}
                        activity={activity}
                        onAdd={handleAddActivity}
                        isSelected={selectedActivityIds.has(activity.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No activities available
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !hasChanges || activities.length === 0}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
