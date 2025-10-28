import { MessageSquare, Star } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export interface FeedbackItemProps {
  assignmentName: string
  teacherName: string
  comment: string
  score: number
  date: string
}

export function FeedbackItem({
  assignmentName,
  teacherName,
  comment,
  score,
  date,
}: FeedbackItemProps) {
  const getScoreColor = () => {
    if (score >= 90) return "bg-green-500"
    if (score >= 80) return "bg-teal-500"
    if (score >= 70) return "bg-yellow-500"
    return "bg-red-500"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <Card className="shadow-neuro-sm border-teal-100 dark:border-teal-900">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10 shadow-neuro-sm">
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-sm font-medium">
              {getInitials(teacherName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="font-semibold text-foreground text-sm">
                  {assignmentName}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {teacherName} • {formatDate(date)}
                </p>
              </div>
              <Badge
                className={`${getScoreColor()} text-white shadow-neuro-sm`}
              >
                <Star className="w-3 h-3 mr-1 fill-current" />
                {score}%
              </Badge>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">{comment}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
