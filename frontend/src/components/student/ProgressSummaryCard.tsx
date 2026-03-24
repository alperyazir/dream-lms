/**
 * Progress Summary Card Component
 * Story 22.1: Dashboard Layout Refactor
 * Displays key student progress metrics as stat cards
 */

import { AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface ProgressSummaryCardProps {
  completed: number
  inProgress: number
  pastDue: number
  avgScore: number
}

export function ProgressSummaryCard({
  completed,
  inProgress,
  pastDue,
  avgScore,
}: ProgressSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Completed */}
          <div className="rounded-xl bg-teal-50 p-4">
            <div className="flex flex-col items-center text-center gap-1.5">
              <CheckCircle className="h-6 w-6 text-teal-500" />
              <span className="text-2xl font-bold text-gray-900">{completed}</span>
              <span className="text-xs font-medium text-gray-500">Completed</span>
            </div>
          </div>

          {/* In Progress */}
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="flex flex-col items-center text-center gap-1.5">
              <Clock className="h-6 w-6 text-blue-500" />
              <span className="text-2xl font-bold text-gray-900">{inProgress}</span>
              <span className="text-xs font-medium text-gray-500">In Progress</span>
            </div>
          </div>

          {/* Past Due */}
          <div className="rounded-xl bg-red-50 p-4">
            <div className="flex flex-col items-center text-center gap-1.5">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <span className="text-2xl font-bold text-gray-900">{pastDue}</span>
              <span className="text-xs font-medium text-gray-500">Past Due</span>
            </div>
          </div>

          {/* Avg Score */}
          <div className="rounded-xl bg-purple-50 p-4">
            <div className="flex flex-col items-center text-center gap-1.5">
              <TrendingUp className="h-6 w-6 text-purple-500" />
              <span className="text-2xl font-bold text-gray-900">{avgScore}%</span>
              <span className="text-xs font-medium text-gray-500">Avg Score</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
