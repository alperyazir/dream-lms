import { createFileRoute } from "@tanstack/react-router"
import { Building2, MapPin, Users } from "lucide-react"
import { useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import useCustomToast from "@/hooks/useCustomToast"
import { publisherDashboardData } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/publisher/schools")({
  component: () => (
    <ErrorBoundary>
      <PublisherSchoolsPage />
    </ErrorBoundary>
  ),
})

function PublisherSchoolsPage() {
  const { schools } = publisherDashboardData
  const [searchQuery, setSearchQuery] = useState("")
  const { showSuccessToast } = useCustomToast()

  const handleAddSchool = () => {
    showSuccessToast("Add School feature coming soon!")
  }

  const filteredSchools = schools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Schools</h1>
        <p className="text-muted-foreground">
          Manage schools that use your published books
        </p>
      </div>

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search schools by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          onClick={handleAddSchool}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Add School
        </Button>
      </div>

      {/* Schools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSchools.map((school) => (
          <Card
            key={school.id}
            className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {school.name}
                  </h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-1" />
                    {school.location}
                  </div>
                </div>
                <Building2 className="w-8 h-8 text-teal-500" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Teachers:</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {school.teacherCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Students:</span>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    {school.studentCount}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSchools.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-muted-foreground">No schools found</p>
        </div>
      )}
    </div>
  )
}
