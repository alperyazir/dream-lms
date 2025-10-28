import { GraduationCap, MapPin, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface SchoolCardProps {
  name: string
  location: string
  teacherCount: number
  studentCount: number
}

export function SchoolCard({
  name,
  location,
  teacherCount,
  studentCount,
}: SchoolCardProps) {
  return (
    <Card className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-all hover:scale-105">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-foreground">
          {name}
        </CardTitle>
        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="shadow-neuro-sm">
              <GraduationCap className="w-3 h-3 mr-1" />
              {teacherCount} Teachers
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="shadow-neuro-sm">
              <Users className="w-3 h-3 mr-1" />
              {studentCount} Students
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
