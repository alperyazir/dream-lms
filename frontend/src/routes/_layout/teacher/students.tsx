import { createFileRoute } from "@tanstack/react-router"
import { Mail, Plus, User, Users } from "lucide-react"
import { useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import useCustomToast from "@/hooks/useCustomToast"
import { mockStudents } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/teacher/students")({
  component: () => (
    <ErrorBoundary>
      <TeacherStudentsPage />
    </ErrorBoundary>
  ),
})

function TeacherStudentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const { showSuccessToast } = useCustomToast()

  const handleAddStudent = () => {
    showSuccessToast("Add Student feature coming soon!")
  }

  const filteredStudents = mockStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.className.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Students</h1>
        <p className="text-muted-foreground">
          View and manage students in your classes
        </p>
      </div>

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search students by name, email, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          onClick={handleAddStudent}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => (
          <Card
            key={student.id}
            className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {student.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className="bg-teal-50 text-teal-700 text-xs"
                  >
                    {student.className}
                  </Badge>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-neuro-sm">
                  <User className="w-6 h-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{student.email}</span>
                </div>
                {student.averageScore !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Avg Score:</span>
                    <Badge
                      variant="outline"
                      className={
                        student.averageScore >= 80
                          ? "bg-green-50 text-green-700"
                          : student.averageScore >= 60
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-red-50 text-red-700"
                      }
                    >
                      {student.averageScore}%
                    </Badge>
                  </div>
                )}
                {student.completedAssignments !== undefined &&
                  student.totalAssignments !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Assignments:
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        {student.completedAssignments}/{student.totalAssignments}
                      </Badge>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground">No students found</p>
        </div>
      )}
    </div>
  )
}
