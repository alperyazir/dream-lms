import { ArrowDown, ArrowUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  trend?: {
    value: number
    direction: "up" | "down"
  }
}

export function StatCard({ icon, label, value, trend }: StatCardProps) {
  return (
    <Card
      className="shadow-neuro border-teal-100 dark:border-teal-900 hover:shadow-neuro-lg transition-shadow"
      role="region"
      aria-label={`${label} statistics card`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p
              className="text-sm font-medium text-muted-foreground mb-1"
              id={`stat-label-${label.replace(/\s+/g, "-").toLowerCase()}`}
            >
              {label}
            </p>
            <h3
              className="text-3xl font-bold text-foreground"
              aria-labelledby={`stat-label-${label.replace(/\s+/g, "-").toLowerCase()}`}
              aria-live="polite"
            >
              {value}
            </h3>
            {trend && (
              <output
                className="flex items-center gap-1 mt-2"
                aria-label={`Trend: ${trend.direction === "up" ? "increasing" : "decreasing"} by ${trend.value} percent`}
              >
                {trend.direction === "up" ? (
                  <ArrowUp
                    className="w-4 h-4 text-green-500"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowDown
                    className="w-4 h-4 text-red-500"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`text-xs font-medium ${
                    trend.direction === "up" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {trend.value}%
                </span>
              </output>
            )}
          </div>
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-neuro-sm"
            aria-hidden="true"
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
