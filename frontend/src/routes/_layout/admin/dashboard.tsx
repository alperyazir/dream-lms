import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  Building2,
  GraduationCap,
  School,
  UserCheck,
  Users,
} from "lucide-react"
import { FiHome } from "react-icons/fi"
import { AdminService } from "@/client"
import { AIGenerationSection } from "@/components/Admin/AIGenerationSection"
import { AssignmentMetricsSection } from "@/components/Admin/AssignmentMetricsSection"
import { PeriodSelector } from "@/components/Admin/PeriodSelector"
import { PlatformUsageSection } from "@/components/Admin/PlatformUsageSection"
import { SystemHealthSection } from "@/components/Admin/SystemHealthSection"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { StatCard } from "@/components/dashboard/StatCard"

export const Route = createFileRoute("/_layout/admin/dashboard")({
  component: () => (
    <ErrorBoundary>
      <AdminDashboard />
    </ErrorBoundary>
  ),
})

function AdminDashboard() {
  const [period, setPeriod] = useState("30d")

  // Fetch real stats from API
  const {
    data: stats,
    isLoading: statsLoading,
    error,
  } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      console.log("Fetching dashboard stats...")
      const result = await AdminService.getStats()
      console.log("Stats received:", result)
      return result
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: 1, // Only retry once on failure
  })

  if (error) {
    console.error("Stats error:", error)
  }

  return (
    <PageContainer>
      <PageHeader
        icon={FiHome}
        title="Admin Dashboard 👋"
        description="System overview and recent activity"
      />

      {/* Stats Cards - Comprehensive Overview */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          System Overview
        </h2>
        {error ? (
          <div className="text-center py-8 text-red-500">
            Error loading statistics. Please check console for details.
          </div>
        ) : statsLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading statistics...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Users className="w-6 h-6" />}
              label="Total Users"
              value={stats?.total_users || 0}
            />
            <StatCard
              icon={<Building2 className="w-6 h-6" />}
              label="Publishers"
              value={stats?.total_publishers || 0}
            />
            <StatCard
              icon={<UserCheck className="w-6 h-6" />}
              label="Teachers"
              value={stats?.total_teachers || 0}
            />
            <StatCard
              icon={<GraduationCap className="w-6 h-6" />}
              label="Students"
              value={stats?.total_students || 0}
            />
          </div>
        )}
      </div>

      {/* Secondary Stats */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Content & Activity
        </h2>
        {error ? (
          <div className="text-center py-8 text-red-500">
            Error loading statistics. Please check console for details.
          </div>
        ) : statsLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading statistics...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon={<School className="w-6 h-6" />}
              label="Active Schools"
              value={stats?.active_schools || 0}
            />
          </div>
        )}
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-foreground">
          Analytics
        </h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Platform Usage */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Platform Usage
        </h2>
        <PlatformUsageSection period={period} />
      </div>

      {/* Assignment Metrics */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Assignment Performance
        </h2>
        <AssignmentMetricsSection period={period} />
      </div>

      {/* AI Generation Stats */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          AI Generation Stats
        </h2>
        <AIGenerationSection period={period} />
      </div>

      {/* System Health */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          System Health
        </h2>
        <SystemHealthSection />
      </div>
    </PageContainer>
  )
}
