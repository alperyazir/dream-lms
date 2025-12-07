/**
 * Achievement Badges Component
 * Story 5.5: Student Progress Tracking & Personal Analytics
 *
 * Displays earned achievements/badges
 */

import {
  Award,
  Crown,
  Flame,
  Medal,
  Rocket,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react"
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Achievement } from "@/types/analytics"

export interface AchievementBadgesProps {
  achievements: Achievement[]
}

// Map icon names to Lucide icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  fire: Flame,
  star: Star,
  trophy: Trophy,
  target: Target,
  medal: Medal,
  rocket: Rocket,
  crown: Crown,
  sparkles: Sparkles,
  "trending-up": TrendingUp,
}

// Get gradient colors based on achievement type
const getGradient = (type: string): string => {
  switch (type) {
    case "perfect_score":
      return "from-amber-400 to-yellow-500"
    case "streak":
      return "from-orange-400 to-red-500"
    case "milestone":
      return "from-purple-400 to-pink-500"
    case "improvement":
      return "from-green-400 to-emerald-500"
    case "first_complete":
      return "from-teal-400 to-cyan-500"
    case "performance":
      return "from-blue-400 to-indigo-500"
    default:
      return "from-teal-400 to-cyan-500"
  }
}

export const AchievementBadges = React.memo(
  ({ achievements }: AchievementBadgesProps) => {
    if (achievements.length === 0) {
      return (
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-teal-500" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <Trophy className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Complete assignments to earn badges!
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    const formatDate = (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }

    return (
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-500" />
            Achievements
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {achievements.length} earned
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {achievements.map((achievement) => {
              const IconComponent = iconMap[achievement.icon] || Award
              const gradient = getGradient(achievement.type)

              return (
                <div
                  key={achievement.id}
                  className="group relative p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all hover:scale-105 cursor-default"
                  title={achievement.description}
                >
                  {/* Badge icon */}
                  <div
                    className={`w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-neuro-sm group-hover:shadow-neuro`}
                  >
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>

                  {/* Badge info */}
                  <p className="text-sm font-medium text-center text-foreground truncate">
                    {achievement.title}
                  </p>
                  <p className="text-xs text-center text-muted-foreground">
                    {formatDate(achievement.earned_at)}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  },
)

AchievementBadges.displayName = "AchievementBadges"
