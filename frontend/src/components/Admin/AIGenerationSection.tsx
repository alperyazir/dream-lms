import { useQuery } from "@tanstack/react-query"
import { Sparkles } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { OpenAPI } from "@/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/dashboard/StatCard"

interface AIGenerationProps {
  period: string
}

const COLORS = [
  "#14b8a6", "#06b6d4", "#0ea5e9", "#6366f1",
  "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#f97316", "#eab308",
]

async function fetchAIUsage(period: string) {
  const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as any) : OpenAPI.TOKEN
  const res = await fetch(
    `${OpenAPI.BASE}/api/v1/admin/analytics/ai-usage?period=${period}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error("Failed to fetch AI usage")
  return res.json()
}

export function AIGenerationSection({ period }: AIGenerationProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "ai-usage", period],
    queryFn: () => fetchAIUsage(period),
    staleTime: 60000,
    refetchInterval: 60000,
  })

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading AI generation stats.
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading AI generation stats...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          icon={<Sparkles className="w-6 h-6" />}
          label="Total AI Generations"
          value={data.total_generations}
        />
        {data.most_frequent_type && (
          <StatCard
            icon={<Sparkles className="w-6 h-6" />}
            label="Most Frequent Type"
            value={data.most_frequent_type.replace(/_/g, " ")}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.by_activity_type.length > 0 && (
          <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                AI Generations by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.by_activity_type}
                    dataKey="count"
                    nameKey="activity_type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ activity_type }) =>
                      activity_type.replace(/_/g, " ")
                    }
                  >
                    {data.by_activity_type.map((_: any, i: number) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {data.generation_trend.length > 0 && (
          <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Generation Volume Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.generation_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
