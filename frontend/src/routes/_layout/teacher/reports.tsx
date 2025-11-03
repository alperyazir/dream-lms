import { createFileRoute } from "@tanstack/react-router"
import { BarChart } from "lucide-react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Card, CardContent } from "@/components/ui/card"

export const Route = createFileRoute("/_layout/teacher/reports")({
  component: () => (
    <ErrorBoundary>
      <TeacherReportsPage />
    </ErrorBoundary>
  ),
})

function TeacherReportsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          View detailed insights and analytics for your classes
        </p>
      </div>

      {/* Placeholder Content */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardContent className="p-12 text-center">
          <BarChart className="w-16 h-16 mx-auto text-teal-500 mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Reports Coming Soon
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The reports feature is under development. Soon you'll be able to
            access detailed analytics, student performance reports, and class
            insights to help you make data-driven decisions.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
