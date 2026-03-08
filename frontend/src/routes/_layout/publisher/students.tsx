import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Mail,
  Search,
  User,
} from "lucide-react"
import { useEffect, useState } from "react"
import { FiUsers } from "react-icons/fi"
import { PublishersService, type PublisherStudentItem } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const Route = createFileRoute("/_layout/publisher/students")({
  component: () => (
    <ErrorBoundary>
      <PublisherStudents />
    </ErrorBoundary>
  ),
})

function PublisherStudents() {
  const PAGE_SIZE = 20
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const skip = (currentPage - 1) * PAGE_SIZE

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const {
    data: studentsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["publisherStudents", skip, PAGE_SIZE, debouncedSearch],
    queryFn: () =>
      PublishersService.listMyStudents({
        skip,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
      }),
  })

  const students = studentsResponse?.items ?? []
  const totalStudents = studentsResponse?.total ?? 0
  const totalPages = Math.ceil(totalStudents / PAGE_SIZE)

  if (error) {
    return (
      <PageContainer>
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
          Error loading students. Please try again later.
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        icon={FiUsers}
        title="Students"
        description="Students enrolled in your schools' classes"
      />

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Students Table */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-teal-500" />
            All Students ({totalStudents})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading students...
            </div>
          ) : totalStudents === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No students found matching your search"
                : "No students yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student: PublisherStudentItem) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-teal-500" />
                        {student.user_full_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.user_email ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span className="text-sm">{student.user_email}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {student.user_username}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {student.grade_level || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {student.school_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {student.classroom_count}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(student.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(currentPage * PAGE_SIZE, totalStudents)} of{" "}
            {totalStudents}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
