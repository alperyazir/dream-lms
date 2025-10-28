import { Calendar, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export interface AssignmentRowProps {
  name: string
  className: string
  dueDate: string
  completionRate: number
}

export function AssignmentRow({
  name,
  className,
  dueDate,
  completionRate,
}: AssignmentRowProps) {
  const getBadgeVariant = () => {
    if (completionRate >= 80) return "default"
    if (completionRate >= 50) return "secondary"
    return "outline"
  }

  const getCompletionColor = () => {
    if (completionRate >= 80) return "text-green-500"
    if (completionRate >= 50) return "text-yellow-500"
    return "text-red-500"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Card className="shadow-neuro-sm border-gray-100 dark:border-gray-800">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground mb-1">{name}</h4>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium">{className}</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Due: {formatDate(dueDate)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="min-w-[120px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  Completion
                </span>
                <span className={`text-xs font-bold ${getCompletionColor()}`}>
                  {completionRate}%
                </span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
            <Badge variant={getBadgeVariant()} className="shadow-neuro-sm">
              <TrendingUp className="w-3 h-3 mr-1" />
              {completionRate >= 80
                ? "Excellent"
                : completionRate >= 50
                  ? "Good"
                  : "Low"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
