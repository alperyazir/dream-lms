/**
 * Usage By Teacher Table Component
 */

import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { UsageByTeacher } from "@/types/ai-usage"

interface UsageByTeacherTableProps {
  data: UsageByTeacher[]
  isLoading?: boolean
}

export function UsageByTeacherTable({
  data,
  isLoading,
}: UsageByTeacherTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage by Teacher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage by Teacher</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No usage data available
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage by Teacher</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead className="text-right">Generations</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Top Activity</TableHead>
              <TableHead className="text-right">Last Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((teacher) => (
              <TableRow key={teacher.teacher_id}>
                <TableCell className="font-medium">
                  {teacher.teacher_name}
                </TableCell>
                <TableCell className="text-right">
                  {teacher.total_generations}
                </TableCell>
                <TableCell className="text-right">
                  ${teacher.estimated_cost.toFixed(2)}
                </TableCell>
                <TableCell>
                  <span className="text-xs bg-muted px-2 py-1 rounded">
                    {teacher.top_activity_type || "N/A"}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {teacher.last_activity_date
                    ? formatDistanceToNow(
                        new Date(teacher.last_activity_date),
                        { addSuffix: true },
                      )
                    : "Never"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
