import { Card, CardContent } from "@/components/ui/card"

export interface AchievementBadgeProps {
  title: string
  description: string
  icon: string
  earnedDate: string
}

export function AchievementBadge({
  title,
  description,
  icon,
  earnedDate,
}: AchievementBadgeProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <Card className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg hover:scale-105 transition-all overflow-hidden group">
      <div className="h-20 bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
        <span className="text-5xl group-hover:scale-110 transition-transform">
          {icon}
        </span>
      </div>
      <CardContent className="p-4">
        <h4 className="font-bold text-foreground text-sm mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {description}
        </p>
        <p className="text-xs font-medium text-teal-500">
          Earned {formatDate(earnedDate)}
        </p>
      </CardContent>
    </Card>
  )
}
