import { TrendingUp, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface ClassCardProps {
  name: string
  subject: string
  studentCount: number
  averageScore: number
}

export function ClassCard({
  name,
  subject,
  studentCount,
  averageScore,
}: ClassCardProps) {
  const scoreColor =
    averageScore >= 90
      ? "text-green-500"
      : averageScore >= 80
        ? "text-teal-500"
        : "text-yellow-500"

  return (
    <Card className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-foreground">
              {name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{subject}</p>
          </div>
          <Badge variant="secondary" className="shadow-neuro-sm">
            <Users className="w-3 h-3 mr-1" />
            {studentCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <TrendingUp className={`w-4 h-4 ${scoreColor}`} />
          <span className="text-sm font-medium text-muted-foreground">
            Average Score:
          </span>
          <span className={`text-lg font-bold ${scoreColor}`}>
            {averageScore}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
