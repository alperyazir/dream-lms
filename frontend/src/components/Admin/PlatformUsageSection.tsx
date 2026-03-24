import { useQuery } from "@tanstack/react-query"
import { Activity, TrendingUp, Users } from "lucide-react"
import {
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

interface PlatformUsageProps {
  period: string
}

async function fetchPlatformUsage(period: string) {
  const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as any) : OpenAPI.TOKEN
  const res = await fetch(
    `${OpenAPI.BASE}/api/v1/admin/analytics/platform-usage?period=${period}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error("Failed to fetch platform usage")
  return res.json()
}

export function PlatformUsageSection({ period }: PlatformUsageProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "platform-usage", period],
    queryFn: () => fetchPlatformUsage(period),
    staleTime: 60000,
    refetchInterval: 60000,
  })

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading platform usage data.
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading platform usage...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Daily Active Users"
          value={data.dau.total}
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Weekly Active Users"
          value={data.wau.total}
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Monthly Active Users"
          value={data.mau.total}
        />
      </div>

      {data.login_trend.length > 0 && (
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Activity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.login_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
