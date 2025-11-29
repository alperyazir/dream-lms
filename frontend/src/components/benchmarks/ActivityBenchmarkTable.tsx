/**
 * Activity Benchmark Table Component
 * Story 5.7: Performance Comparison & Benchmarking
 *
 * Displays table comparing class performance vs benchmarks by activity type
 */

import React, { useMemo } from "react"
import { ArrowUpRight, ArrowDownRight, Minus, Layers } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ActivityTypeBenchmark } from "@/types/benchmarks"

export interface ActivityBenchmarkTableProps {
  activityBenchmarks: ActivityTypeBenchmark[]
  showSchoolBenchmark?: boolean
}

/**
 * Get color classes based on difference percentage
 */
function getDifferenceColors(difference: number): {
  textColor: string
  bgColor: string
} {
  if (difference > 5) {
    return {
      textColor: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    }
  } else if (difference < -5) {
    return {
      textColor: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    }
  }
  return {
    textColor: "text-muted-foreground",
    bgColor: "bg-muted/50",
  }
}

/**
 * Get icon component based on difference
 */
function DifferenceIcon({ difference }: { difference: number }) {
  if (difference > 5) {
    return <ArrowUpRight className="w-4 h-4" />
  } else if (difference < -5) {
    return <ArrowDownRight className="w-4 h-4" />
  }
  return <Minus className="w-4 h-4" />
}

export const ActivityBenchmarkTable = React.memo(
  ({
    activityBenchmarks,
    showSchoolBenchmark = true,
  }: ActivityBenchmarkTableProps) => {
    // Sort by absolute difference (largest gaps first)
    const sortedBenchmarks = useMemo(() => {
      return [...activityBenchmarks].sort(
        (a, b) =>
          Math.abs(b.difference_percent) - Math.abs(a.difference_percent),
      )
    }, [activityBenchmarks])

    if (activityBenchmarks.length === 0) {
      return (
        <Card className="shadow-neuro border-amber-100 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              Performance by Activity Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No activity type data available yet
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="shadow-neuro border-amber-100 dark:border-amber-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            Performance by Activity Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity Type</TableHead>
                  <TableHead className="text-right">Your Class</TableHead>
                  {showSchoolBenchmark && (
                    <TableHead className="text-right">Benchmark</TableHead>
                  )}
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBenchmarks.map((benchmark) => {
                  const { textColor, bgColor } = getDifferenceColors(
                    benchmark.difference_percent,
                  )
                  return (
                    <TableRow key={benchmark.activity_type}>
                      <TableCell className="font-medium">
                        {benchmark.activity_label}
                      </TableCell>
                      <TableCell className="text-right">
                        {Math.round(benchmark.class_average)}%
                      </TableCell>
                      {showSchoolBenchmark && (
                        <TableCell className="text-right text-muted-foreground">
                          {Math.round(benchmark.benchmark_average)}%
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${textColor} ${bgColor}`}
                        >
                          <DifferenceIcon
                            difference={benchmark.difference_percent}
                          />
                          {benchmark.difference_percent > 0 ? "+" : ""}
                          {Math.round(benchmark.difference_percent)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              Above benchmark (&gt;5%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              Below benchmark (&lt;-5%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-400" />
              At benchmark (±5%)
            </span>
          </div>
        </CardContent>
      </Card>
    )
  },
)

ActivityBenchmarkTable.displayName = "ActivityBenchmarkTable"
