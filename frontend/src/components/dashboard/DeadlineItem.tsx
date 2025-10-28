import { BookOpen, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export interface DeadlineItemProps {
  assignmentName: string
  className: string
  dueDate: string
}

export function DeadlineItem({
  assignmentName,
  className,
  dueDate,
}: DeadlineItemProps) {
  const [timeLeft, setTimeLeft] = useState<string>("")

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now()
      const due = new Date(dueDate).getTime()
      const diff = due - now

      if (diff <= 0) {
        setTimeLeft("Past Due")
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      )
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`)
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`)
      } else {
        setTimeLeft(`${minutes}m`)
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [dueDate])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="shadow-neuro-sm border-teal-100 dark:border-teal-900">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground mb-1">
              {assignmentName}
            </h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="w-3 h-3" />
              <span>{className}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDate(dueDate)}
            </p>
          </div>
          <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-neuro-sm">
            <Clock className="w-3 h-3 mr-1" />
            {timeLeft}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
