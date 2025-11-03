import React, { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface ActivityHistoryEntry {
  date: string
  activity_name: string
  activity_type: string
  score: number
  time_spent_minutes: number
  status: "completed" | "in_progress" | "not_started"
  assignment_id: string
}

export interface ActivityHistoryTableProps {
  entries: ActivityHistoryEntry[]
  itemsPerPage?: number
  onRowClick?: (assignmentId: string) => void
}

/**
 * Activity History Table
 * Shows student's activity history with pagination
 */
export const ActivityHistoryTable = React.memo(
  ({ entries, itemsPerPage = 10, onRowClick }: ActivityHistoryTableProps) => {
    const [currentPage, setCurrentPage] = useState(1)

    // Sort entries by date (newest first)
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

    // Calculate pagination
    const totalPages = Math.ceil(sortedEntries.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentEntries = sortedEntries.slice(startIndex, endIndex)

    // Activity type display names
    const getActivityTypeName = (activityType: string): string => {
      const nameMap: Record<string, string> = {
        dragdroppicture: "Drag & Drop",
        dragdroppicturegroup: "Group Sort",
        matchTheWords: "Matching",
        circle: "Circle",
        markwithx: "Mark with X",
        puzzleFindWords: "Word Search",
      }
      return nameMap[activityType] || activityType
    }

    // Status badge color
    const getStatusColor = (status: string): string => {
      const colorMap: Record<string, string> = {
        completed:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        in_progress:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        not_started:
          "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
      }
      return (
        colorMap[status] ||
        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
      )
    }

    // Score color
    const getScoreColor = (score: number): string => {
      if (score >= 90) return "text-green-600 dark:text-green-400 font-bold"
      if (score >= 80) return "text-teal-600 dark:text-teal-400 font-semibold"
      if (score >= 70)
        return "text-yellow-600 dark:text-yellow-400 font-semibold"
      return "text-red-600 dark:text-red-400 font-semibold"
    }

    return (
      <div className="space-y-4">
        {/* Table */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="w-[100px]">Score</TableHead>
                  <TableHead className="w-[120px]">Time Spent</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentEntries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500"
                    >
                      No activity history found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentEntries.map((entry, index) => (
                    <TableRow
                      key={index}
                      className={
                        onRowClick
                          ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          : ""
                      }
                      onClick={() => onRowClick?.(entry.assignment_id)}
                      tabIndex={onRowClick ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (
                          onRowClick &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault()
                          onRowClick(entry.assignment_id)
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {entry.activity_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {getActivityTypeName(entry.activity_type)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.status === "completed" ? (
                          <span className={getScoreColor(entry.score)}>
                            {entry.score}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.status === "completed" ? (
                          <span className="text-gray-700 dark:text-gray-300">
                            {entry.time_spent_minutes} min
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(entry.status)}>
                          {entry.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {startIndex + 1}-
              {Math.min(endIndex, sortedEntries.length)} of{" "}
              {sortedEntries.length} activities
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  },
)

ActivityHistoryTable.displayName = "ActivityHistoryTable"
