import { useQuery } from "@tanstack/react-query"
import { ExternalLink, HeartPulse } from "lucide-react"
import { OpenAPI } from "@/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

async function fetchHealth() {
  const res = await fetch(`${OpenAPI.BASE}/api/v1/health`)
  if (!res.ok) throw new Error("Health check failed")
  return res.json()
}

export function SystemHealthSection() {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 1,
  })

  const statusColor =
    data?.status === "healthy"
      ? "bg-green-500"
      : data?.status === "degraded"
        ? "bg-yellow-500"
        : data
          ? "bg-red-500"
          : "bg-gray-400"

  const statusLabel = data?.status ?? "unknown"

  return (
    <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-teal-500" />
          System Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block w-3 h-3 rounded-full ${statusColor}`}
            aria-label={`System status: ${statusLabel}`}
          />
          <span className="text-sm font-medium capitalize">{statusLabel}</span>
          {data?.services && (
            <span className="text-xs text-muted-foreground">
              DB: {data.services.database} | Redis: {data.services.redis}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Monitor uptime, latency, and availability of all services using Uptime
          Kuma.
        </p>
        <Button variant="outline" asChild>
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open Uptime Kuma
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
