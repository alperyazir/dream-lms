/**
 * Benchmark Card Component
 * Story 5.7: Performance Comparison & Benchmarking
 *
 * Displays class average, school average, and publisher average side by side
 */

import { BarChart3, Building2, Info, School, Users } from "lucide-react"
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { BenchmarkData, ClassMetrics } from "@/types/benchmarks"

export interface BenchmarkCardProps {
  classMetrics: ClassMetrics
  schoolBenchmark: BenchmarkData | null
  publisherBenchmark: BenchmarkData | null
}

interface BenchmarkItemProps {
  label: string
  value: number
  icon: React.ElementType
  iconColor: string
  bgColor: string
  sampleSize?: number
  isAvailable?: boolean
}

const BenchmarkItem = ({
  label,
  value,
  icon: Icon,
  iconColor,
  bgColor,
  sampleSize,
  isAvailable = true,
}: BenchmarkItemProps) => (
  <div className={`p-4 rounded-lg ${bgColor}`}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-5 h-5 ${iconColor}`} />
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {sampleSize !== undefined && isAvailable && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3 h-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Based on {sampleSize} classes</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    {isAvailable ? (
      <>
        <p className="text-3xl font-bold text-foreground mb-2">
          {Math.round(value)}%
        </p>
        <Progress value={value} className="h-2" />
      </>
    ) : (
      <p className="text-sm text-muted-foreground italic">
        Not enough data yet
      </p>
    )}
  </div>
)

export const BenchmarkCard = React.memo(
  ({
    classMetrics,
    schoolBenchmark,
    publisherBenchmark,
  }: BenchmarkCardProps) => {
    return (
      <Card className="shadow-neuro border-blue-100 dark:border-blue-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Class Average */}
            <BenchmarkItem
              label="Your Class"
              value={classMetrics.average_score}
              icon={Users}
              iconColor="text-blue-500"
              bgColor="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
            />

            {/* School Average */}
            <BenchmarkItem
              label="School Average"
              value={schoolBenchmark?.average_score ?? 0}
              icon={School}
              iconColor="text-green-500"
              bgColor="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
              sampleSize={schoolBenchmark?.sample_size}
              isAvailable={schoolBenchmark?.is_available ?? false}
            />

            {/* Publisher Average */}
            <BenchmarkItem
              label="Publisher Average"
              value={publisherBenchmark?.average_score ?? 0}
              icon={Building2}
              iconColor="text-purple-500"
              bgColor="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
              sampleSize={publisherBenchmark?.sample_size}
              isAvailable={publisherBenchmark?.is_available ?? false}
            />
          </div>

          {/* Additional class stats */}
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {classMetrics.active_students} active students
            </span>
            <span>{classMetrics.total_assignments} assignments</span>
            <span>
              {Math.round(classMetrics.completion_rate)}% completion rate
            </span>
          </div>
        </CardContent>
      </Card>
    )
  },
)

BenchmarkCard.displayName = "BenchmarkCard"
