/**
 * Report Template Card Component
 * Story 5.6: Time-Based Reporting & Trend Analysis
 *
 * Displays a predefined report template with quick-generate button
 */

import {
  CalendarDays,
  ClipboardList,
  FileText,
  Play,
  UserCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ReportTemplateInfo } from "@/types/reports"

interface ReportTemplateCardProps {
  template: ReportTemplateInfo
  onSelect: (template: ReportTemplateInfo) => void
  onQuickGenerate?: (template: ReportTemplateInfo) => void
  disabled?: boolean
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "calendar-days": CalendarDays,
  "user-circle": UserCircle,
  "clipboard-list": ClipboardList,
  "file-text": FileText,
}

export function ReportTemplateCard({
  template,
  onSelect,
  onQuickGenerate,
  disabled = false,
}: ReportTemplateCardProps) {
  const IconComponent = iconMap[template.icon] || FileText

  return (
    <Card
      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
      onClick={() => !disabled && onSelect(template)}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-primary/10 text-primary">
          <IconComponent className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm mb-1">{template.name}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.description}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
              {template.reportType}
            </span>
            <span className="text-xs text-muted-foreground">
              Default: {template.defaultPeriod}
            </span>
          </div>
        </div>

        {onQuickGenerate && (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onQuickGenerate(template)
            }}
            disabled={disabled}
          >
            <Play className="h-4 w-4 mr-1" />
            Quick
          </Button>
        )}
      </div>
    </Card>
  )
}

interface ReportTemplateGridProps {
  templates: ReportTemplateInfo[]
  onSelect: (template: ReportTemplateInfo) => void
  onQuickGenerate?: (template: ReportTemplateInfo) => void
  disabled?: boolean
}

export function ReportTemplateGrid({
  templates,
  onSelect,
  onQuickGenerate,
  disabled = false,
}: ReportTemplateGridProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Quick Templates</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((template) => (
          <ReportTemplateCard
            key={template.type}
            template={template}
            onSelect={onSelect}
            onQuickGenerate={onQuickGenerate}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

export default ReportTemplateCard
