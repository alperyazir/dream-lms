/**
 * Report Progress Component
 * Story 5.6: Time-Based Reporting & Trend Analysis
 *
 * Shows progress during report generation with:
 * - Progress bar
 * - Status messages
 * - Download button when complete
 * - Error display with retry
 */

import {
  CheckCircle,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { ReportJobStatus } from "@/types/reports"

interface ReportProgressProps {
  status: ReportJobStatus | null
  progress: number
  errorMessage?: string | null
  onDownload: () => void
  onRetry: () => void
  onCancel: () => void
  isDownloading?: boolean
}

export function ReportProgress({
  status,
  progress,
  errorMessage,
  onDownload,
  onRetry,
  onCancel,
  isDownloading = false,
}: ReportProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-12 w-12 text-green-500" />
      case "failed":
        return <XCircle className="h-12 w-12 text-red-500" />
      case "processing":
        return <Loader2 className="h-12 w-12 text-primary animate-spin" />
      default:
        return <FileText className="h-12 w-12 text-muted-foreground" />
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case "pending":
        return "Preparing report..."
      case "processing":
        return "Generating report..."
      case "completed":
        return "Report ready!"
      case "failed":
        return "Report generation failed"
      default:
        return "Initializing..."
    }
  }

  const getProgressColor = () => {
    if (status === "failed") return "bg-red-500"
    if (status === "completed") return "bg-green-500"
    return ""
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Status Icon */}
        <div className="mb-2">{getStatusIcon()}</div>

        {/* Status Message */}
        <h3 className="text-lg font-semibold">{getStatusMessage()}</h3>

        {/* Progress Bar (only show when processing) */}
        {(status === "pending" || status === "processing") && (
          <div className="w-full max-w-xs space-y-2">
            <Progress value={progress} className={getProgressColor()} />
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {/* Error Message */}
        {status === "failed" && errorMessage && (
          <p className="text-sm text-red-600 max-w-xs">{errorMessage}</p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          {status === "completed" && (
            <Button onClick={onDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download Report
            </Button>
          )}

          {status === "failed" && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}

          {(status === "pending" ||
            status === "processing" ||
            status === "failed") && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}

          {status === "completed" && (
            <Button variant="outline" onClick={onCancel}>
              New Report
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export default ReportProgress
