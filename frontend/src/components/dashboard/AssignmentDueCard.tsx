import { BookOpen, Clock, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { useCountdown } from "@/hooks/useCountdown"

export interface AssignmentDueCardProps {
  id: string
  name: string
  subject: string
  dueDate: string
  status: "due-today" | "due-week" | "upcoming"
}

export function AssignmentDueCard({
  name,
  subject,
  dueDate,
  status,
}: AssignmentDueCardProps) {
  const { timeLeft, isPastDue } = useCountdown(dueDate)

  const getStatusBadge = () => {
    if (isPastDue) {
      return (
        <Badge variant="destructive" className="shadow-neuro-sm">
          Past Due
        </Badge>
      )
    }
    switch (status) {
      case "due-today":
        return (
          <Badge variant="destructive" className="shadow-neuro-sm">
            Due Today
          </Badge>
        )
      case "due-week":
        return (
          <Badge
            variant="secondary"
            className="shadow-neuro-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
          >
            Due This Week
          </Badge>
        )
      case "upcoming":
        return (
          <Badge
            variant="secondary"
            className="shadow-neuro-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
          >
            Upcoming
          </Badge>
        )
    }
  }

  const handleStart = () => {
    toast({
      title: "Start Assignment",
      description: `Starting "${name}" - Assignment player coming soon!`,
    })
  }

  return (
    <Card
      className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-all"
      role="article"
      aria-label={`Assignment: ${name} for ${subject}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle
            className="text-lg font-bold text-foreground"
            id={`assignment-${name.replace(/\s+/g, "-").toLowerCase()}`}
          >
            {name}
          </CardTitle>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          <span>{subject}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Time remaining until assignment due: ${timeLeft}`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-500" aria-hidden="true" />
            <span className="text-sm font-medium text-muted-foreground">
              Time Left:
            </span>
          </div>
          <span
            className={`text-lg font-bold ${isPastDue ? "text-red-500" : "text-teal-500"}`}
          >
            {timeLeft}
          </span>
        </div>
        <Button
          onClick={handleStart}
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
          aria-label={`Start assignment: ${name}`}
        >
          <Play className="w-4 h-4 mr-2" aria-hidden="true" />
          Start Assignment
        </Button>
      </CardContent>
    </Card>
  )
}
