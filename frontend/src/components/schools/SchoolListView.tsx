import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface School {
  id: string
  name: string
  address?: string | null
  teacher_count?: number
  student_count?: number
  book_count?: number
}

interface SchoolListViewProps {
  schools: School[]
  onEdit?: (school: School) => void
  onViewDetails?: (school: School) => void
}

export function SchoolListView({
  schools,
  onEdit,
  onViewDetails,
}: SchoolListViewProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="text-center">Teachers</TableHead>
            <TableHead className="text-center">Students</TableHead>
            <TableHead className="text-center">Books</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schools.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground py-8"
              >
                No schools found
              </TableCell>
            </TableRow>
          ) : (
            schools.map((school) => (
              <TableRow key={school.id}>
                <TableCell className="font-medium">{school.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {school.address || "-"}
                </TableCell>
                <TableCell className="text-center">
                  {school.teacher_count ?? 0}
                </TableCell>
                <TableCell className="text-center">
                  {school.student_count ?? 0}
                </TableCell>
                <TableCell className="text-center">
                  {school.book_count ?? 0}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(school)}
                    >
                      View
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(school)}
                    >
                      Edit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
