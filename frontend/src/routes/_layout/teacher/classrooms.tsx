import { createFileRoute } from "@tanstack/react-router"
import { Plus, TrendingUp, Users } from "lucide-react"
import { useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import useCustomToast from "@/hooks/useCustomToast"
import { teacherDashboardData } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/teacher/classrooms")({
  component: () => (
    <ErrorBoundary>
      <TeacherClassroomsPage />
    </ErrorBoundary>
  ),
})

function TeacherClassroomsPage() {
  const { classes } = teacherDashboardData
  const [searchQuery, setSearchQuery] = useState("")
  const { showSuccessToast } = useCustomToast()

  const handleCreateClass = () => {
    showSuccessToast("Create Class feature coming soon!")
  }

  const filteredClasses = classes.filter(
    (classItem) =>
      classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classItem.subject.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Classrooms</h1>
        <p className="text-muted-foreground">
          Manage your classes and monitor student performance
        </p>
      </div>

      {/* Search and Create */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search classes by name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          onClick={handleCreateClass}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Class
        </Button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((classItem) => (
          <Card
            key={classItem.id}
            className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {classItem.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className="bg-teal-50 text-teal-700 text-xs"
                  >
                    {classItem.subject}
                  </Badge>
                </div>
                <TrendingUp className="w-8 h-8 text-teal-500" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Students:
                  </span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {classItem.studentCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average Score:</span>
                  <Badge
                    variant="outline"
                    className={
                      classItem.averageScore >= 80
                        ? "bg-green-50 text-green-700"
                        : classItem.averageScore >= 60
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-red-50 text-red-700"
                    }
                  >
                    {classItem.averageScore}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground">No classes found</p>
        </div>
      )}
    </div>
  )
}
