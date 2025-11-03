import { createFileRoute } from "@tanstack/react-router"
import { Calendar as CalendarIcon } from "lucide-react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Card, CardContent } from "@/components/ui/card"

export const Route = createFileRoute("/_layout/student/calendar")({
  component: () => (
    <ErrorBoundary>
      <StudentCalendarPage />
    </ErrorBoundary>
  ),
})

function StudentCalendarPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Calendar</h1>
        <p className="text-muted-foreground">
          Track your assignments and important dates
        </p>
      </div>

      {/* Placeholder Content */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardContent className="p-12 text-center">
          <CalendarIcon className="w-16 h-16 mx-auto text-teal-500 mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Calendar Coming Soon
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The calendar feature is under development. Soon you'll be able to
            view all your assignments, deadlines, and important events in one
            convenient place.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
