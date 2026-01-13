import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { AlertCircle, BookOpen, School, Users } from "lucide-react"
import { FiHome } from "react-icons/fi"
import { PublishersService } from "@/client"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { StatCard } from "@/components/dashboard/StatCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Route = createFileRoute("/_layout/publisher/dashboard")({
  component: () => (
    <ErrorBoundary>
      <PublisherDashboard />
    </ErrorBoundary>
  ),
})

function PublisherDashboard() {
  // Fetch publisher profile for logo and name display
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["publisherProfile"],
    queryFn: () => PublishersService.getMyProfile(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 403 or 404 errors
      if (error?.status === 403 || error?.status === 404) {
        return false
      }
      return failureCount < 3
    },
  })

  // Fetch real stats from API
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["publisherStats"],
    queryFn: () => PublishersService.getMyStats(),
    staleTime: 30000, // Cache for 30 seconds
    enabled: !profileError, // Only fetch stats if profile loaded successfully
  })

  // Handle account not linked to DCS publisher (403)
  if ((profileError as any)?.status === 403) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Account Not Linked</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your account is not linked to a publisher organization. Please
            contact an administrator to set up your publisher access.
          </p>
        </div>
      </PageContainer>
    )
  }

  // Handle DCS publisher not found (404)
  if ((profileError as any)?.status === 404) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Publisher Not Found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your linked publisher organization was not found in Dream Central
            Storage. Please contact an administrator for assistance.
          </p>
        </div>
      </PageContainer>
    )
  }

  // Handle other profile errors
  if (profileError) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Unable to load your publisher profile. Please try again later.
          </p>
        </div>
      </PageContainer>
    )
  }

  const isLoading = profileLoading || statsLoading

  return (
    <PageContainer>
      <PageHeader
        icon={FiHome}
        title={profileLoading ? "Loading..." : `${profile?.name || "Publisher Dashboard"} 👋`}
        description={profile?.user_full_name
          ? `Welcome, ${profile.user_full_name}`
          : "Overview of your organization's schools, books, and teachers"}
      />

      {/* Stats Cards */}
      {statsError ? (
        <div className="text-center py-8 text-red-500">
          Error loading statistics. Please try again later.
        </div>
      ) : isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading statistics...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={<School className="w-6 h-6" />}
            label="Total Schools"
            value={stats?.schools_count ?? 0}
          />
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            label="Total Books"
            value={stats?.books_count ?? 0}
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Teachers"
            value={stats?.teachers_count ?? 0}
          />
        </div>
      )}

      {/* Quick Actions */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button
            asChild
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
          >
            <Link
              to="/publisher/library"
              search={{ q: "", publisher: "", activity: "" }}
            >
              View Library
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/publisher/schools">Manage Schools</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/publisher/teachers">Manage Teachers</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/publisher/book-assignments">Book Assignments</Link>
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
