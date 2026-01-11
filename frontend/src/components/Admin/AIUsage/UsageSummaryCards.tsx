/**
 * Usage Summary Cards Component
 */

import { Activity, CheckCircle, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { UsageSummary } from "@/types/ai-usage"

interface UsageSummaryCardsProps {
  summary: UsageSummary
  isLoading?: boolean
}

export function UsageSummaryCards({
  summary,
  isLoading,
}: UsageSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: "Total Generations",
      value: summary.total_generations.toLocaleString(),
      icon: Activity,
      description: `${summary.total_llm_generations} LLM, ${summary.total_tts_generations} TTS`,
      color: "text-blue-600",
    },
    {
      title: "Estimated Cost",
      value: `$${summary.total_cost.toFixed(2)}`,
      icon: DollarSign,
      description: `${summary.total_input_tokens.toLocaleString()} in, ${summary.total_output_tokens.toLocaleString()} out tokens`,
      color: "text-green-600",
    },
    {
      title: "Success Rate",
      value: `${summary.success_rate.toFixed(1)}%`,
      icon: summary.success_rate >= 95 ? CheckCircle : Activity,
      description: `Avg duration: ${Math.round(summary.average_duration_ms)}ms`,
      color: summary.success_rate >= 95 ? "text-green-600" : "text-yellow-600",
    },
    {
      title: "Audio Generated",
      value: summary.total_audio_characters.toLocaleString(),
      icon: Activity,
      description: "Total characters",
      color: "text-purple-600",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
