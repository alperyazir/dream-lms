/**
 * Export Button Component
 */

import { Download } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { aiUsageApi } from "@/services/aiUsageApi"
import type { DateRange } from "@/types/ai-usage"

interface ExportButtonProps {
  dateRange: DateRange
}

export function ExportButton({ dateRange }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    try {
      setIsExporting(true)

      const blob = await aiUsageApi.exportData(dateRange.from, dateRange.to)

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      // Generate filename with date range
      const fromStr = dateRange.from
        ? dateRange.from.toISOString().split("T")[0]
        : "all"
      const toStr = dateRange.to
        ? dateRange.to.toISOString().split("T")[0]
        : "now"
      link.download = `ai_usage_${fromStr}_to_${toStr}.csv`

      // Trigger download
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Usage data exported successfully",
      })
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Error",
        description: "Failed to export usage data",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={isExporting} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  )
}
