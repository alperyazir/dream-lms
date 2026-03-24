import { useQuery } from "@tanstack/react-query"
import { BarChart3, CheckCircle, Target } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { OpenAPI } from "@/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/dashboard/StatCard"

interface AssignmentMetricsProps {
  period: string
}

async function fetchAssignmentMetrics(period: string) {
  const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as any) : OpenAPI.TOKEN
  const res = await fetch(
    `${OpenAPI.BASE}/api/v1/admin/analytics/assignment-metrics?period=${period}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error("Failed to fetch assignment metrics")
  return res.json()
}

export function AssignmentMetricsSection({ period }: AssignmentMetricsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "assignment-metrics", period],
    queryFn: () => fetchAssignmentMetrics(period),
    staleTime: 60000,
    refetchInterval: 60000,
  })

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading assignment metrics.
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading assignment metrics...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<BarChart3 className="w-6 h-6" />}
          label="Total Assignments"
          value={data.total_assignments}
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6" />}
          label="Completion Rate"
          value={`${data.completion_rate}%`}
        />
        <StatCard
          icon={<Target className="w-6 h-6" />}
          label="Average Score"
          value={data.average_score}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.by_activity_type.length > 0 && (
          <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Completion Rate by Activity Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.by_activity_type}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="activity_type"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis unit="%" />
                  <Tooltip />
                  <Bar dataKey="completion_rate" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {data.assignment_trend.length > 0 && (
          <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Assignments Created Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.assignment_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
