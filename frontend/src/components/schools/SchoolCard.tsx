import { BookOpen, Building2, GraduationCap, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

interface SchoolCardProps {
  school: {
    id: string
    name: string
    address?: string | null
    teacher_count?: number
    student_count?: number
    book_count?: number
  }
  onEdit?: () => void
  onViewDetails?: () => void
}

export function SchoolCard({ school, onEdit, onViewDetails }: SchoolCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{school.name}</h3>
            {school.address && (
              <p className="text-sm text-muted-foreground truncate">
                {school.address}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted rounded-md">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-semibold">{school.teacher_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">Teachers</p>
          </div>
          <div className="p-2 bg-muted rounded-md">
            <GraduationCap className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-semibold">{school.student_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </div>
          <div className="p-2 bg-muted rounded-md">
            <BookOpen className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-semibold">{school.book_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">Books</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        {onViewDetails && (
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            View Details
          </Button>
        )}
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
