import { ArrowUpDown, Trash2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Teacher {
  id: string
  user_full_name: string
  user_email: string
  school_name?: string | null
  books_assigned?: number
  classroom_count?: number
}

interface TeacherListViewProps {
  teachers: Teacher[]
  onEdit?: (teacher: Teacher) => void
  onViewDetails?: (teacher: Teacher) => void
  onDelete?: (teacher: Teacher) => void
}

type SortKey =
  | "user_full_name"
  | "user_email"
  | "school_name"
  | "books_assigned"
  | "classroom_count"
type SortOrder = "asc" | "desc"

export function TeacherListView({
  teachers,
  onEdit,
  onViewDetails,
  onDelete,
}: TeacherListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("user_full_name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortOrder("asc")
    }
  }

  const sortedTeachers = [...teachers].sort((a, b) => {
    let aVal: string | number | null | undefined = a[sortKey]
    let bVal: string | number | null | undefined = b[sortKey]

    // Handle null/undefined values
    if (aVal === null || aVal === undefined) aVal = ""
    if (bVal === null || bVal === undefined) bVal = ""

    // Convert to lowercase for string comparison
    if (typeof aVal === "string") aVal = aVal.toLowerCase()
    if (typeof bVal === "string") bVal = bVal.toLowerCase()

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
    return 0
  })

  const SortButton = ({
    column,
    label,
  }: {
    column: SortKey
    label: string
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(column)}
    >
      {label}
      <ArrowUpDown className="ml-2 h-3 w-3" />
    </Button>
  )

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton column="user_full_name" label="Name" />
            </TableHead>
            <TableHead>
              <SortButton column="user_email" label="Email" />
            </TableHead>
            <TableHead>
              <SortButton column="school_name" label="School" />
            </TableHead>
            <TableHead className="text-center">
              <SortButton column="books_assigned" label="Books" />
            </TableHead>
            <TableHead className="text-center">
              <SortButton column="classroom_count" label="Classes" />
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTeachers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground py-8"
              >
                No teachers found
              </TableCell>
            </TableRow>
          ) : (
            sortedTeachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell className="font-medium">
                  {teacher.user_full_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {teacher.user_email}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {teacher.school_name || "-"}
                </TableCell>
                <TableCell className="text-center">
                  {teacher.books_assigned ?? 0}
                </TableCell>
                <TableCell className="text-center">
                  {teacher.classroom_count ?? 0}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(teacher)}
                    >
                      View
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(teacher)}
                    >
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(teacher)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
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
