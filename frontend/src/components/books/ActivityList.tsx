/**
 * ActivityList Component - Story 3.6
 *
 * Displays a list of activities from a book with:
 * - Activity title
 * - Activity type badge (color-coded)
 * - Preview button (disabled - coming in Epic 4)
 * - Assign button (placeholder for Story 3.7)
 */

import { Eye, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Activity } from "@/types/book"
import { ACTIVITY_TYPE_CONFIG } from "@/types/book"

export interface ActivityListProps {
  activities: Activity[]
  onAssign?: (activity: Activity) => void
}

/**
 * ActivityList Component
 *
 * Renders activities in a table format with action buttons.
 */
export function ActivityList({ activities, onAssign }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No activities available for this book.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Activity Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity, index) => {
            const typeConfig = ACTIVITY_TYPE_CONFIG[activity.activity_type]

            return (
              <TableRow key={activity.id}>
                <TableCell className="font-medium text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="font-medium">
                  {activity.title || `Activity ${index + 1}`}
                </TableCell>
                <TableCell>
                  <Badge variant={typeConfig.badgeVariant}>
                    {typeConfig.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {/* Preview button - disabled, coming in Epic 4 */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            aria-label="Preview activity"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Preview coming in Epic 4</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Assign button - functional in Story 3.7 */}
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700"
                      onClick={() => onAssign?.(activity)}
                      aria-label={`Assign ${activity.title || "activity"} to students`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
