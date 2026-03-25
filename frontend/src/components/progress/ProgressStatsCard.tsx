/**
 * Progress Stats Card Component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 *
 * Displays summary statistics for student progress
 */

import { CheckCircle2, Target } from "lucide-react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentProgressStats } from "@/types/analytics";

export interface ProgressStatsCardProps {
  stats: StudentProgressStats;
}

export const ProgressStatsCard = React.memo(
  ({ stats }: ProgressStatsCardProps) => {
    return (
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-500" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Total Completed */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
              <div className="flex justify-center mb-2">
                <CheckCircle2 className="w-6 h-6 text-teal-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats.total_completed}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>

            {/* Average Score */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <div className="flex justify-center mb-2">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {Math.round(stats.avg_score)}%
              </p>
              <p className="text-sm text-muted-foreground">Avg Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
);

ProgressStatsCard.displayName = "ProgressStatsCard";
