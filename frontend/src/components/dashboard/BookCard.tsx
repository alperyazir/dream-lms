import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export interface BookCardProps {
  title: string
  coverUrl: string
  activityCount: number
  grade: string
}

export function BookCard({
  title,
  coverUrl,
  activityCount,
  grade,
}: BookCardProps) {
  return (
    <Card className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-all hover:scale-105 overflow-hidden">
      <div className="aspect-[2/3] relative bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950">
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground text-sm mb-2 line-clamp-2">
          {title}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-xs">
            Grade {grade}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>{activityCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
