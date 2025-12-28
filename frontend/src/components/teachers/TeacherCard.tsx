import { BookOpen, Building2, Trash2, Users } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

interface TeacherCardProps {
  teacher: {
    id: string
    user_full_name: string
    user_email: string
    school_name?: string | null
    books_assigned?: number
    classroom_count?: number
  }
  onEdit?: () => void
  onViewDetails?: () => void
  onDelete?: () => void
}

export function TeacherCard({
  teacher,
  onEdit,
  onViewDetails,
  onDelete,
}: TeacherCardProps) {
  const initials = teacher.user_full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{teacher.user_full_name}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {teacher.user_email}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {teacher.school_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="truncate">{teacher.school_name}</span>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>{teacher.books_assigned ?? 0} books</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{teacher.classroom_count ?? 0} classes</span>
            </div>
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
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
