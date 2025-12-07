/**
 * Report History Component
 * Story 5.6: Time-Based Reporting & Trend Analysis
 *
 * Displays table of previously generated reports with:
 * - Report type and date
 * - Download links
 * - Expiration status
 */

import { Clock, Download, FileSpreadsheet, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ReportHistoryItem } from "@/types/reports"
import { REPORT_TYPE_LABELS } from "@/types/reports"

interface ReportHistoryProps {
  reports: ReportHistoryItem[]
  isLoading?: boolean
  onDownload: (report: ReportHistoryItem) => void
}

export function ReportHistory({
  reports,
  isLoading = false,
  onDownload,
}: ReportHistoryProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d remaining`
    if (hours > 0) return `${hours}h remaining`
    return "< 1h remaining"
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Report History</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  if (reports.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Report History</h3>
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No reports generated yet</p>
          <p className="text-sm mt-1">
            Reports are available for 7 days after generation
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Report History</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">
                  {REPORT_TYPE_LABELS[report.report_type]}
                </TableCell>
                <TableCell>{report.target_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {report.format === "pdf" ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    <span className="uppercase text-xs">{report.format}</span>
                  </div>
                </TableCell>
                <TableCell>{formatDate(report.created_at)}</TableCell>
                <TableCell>
                  {report.is_expired ? (
                    <Badge variant="secondary">Expired</Badge>
                  ) : (
                    <Badge variant="outline">
                      {getTimeRemaining(report.expires_at)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!report.is_expired && report.download_url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownload(report)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

export default ReportHistory
