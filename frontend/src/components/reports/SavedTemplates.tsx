/**
 * Saved Templates Component
 * Story 5.6: Time-Based Reporting & Trend Analysis
 *
 * Lists and manages saved report configurations
 */

import { useState } from "react"
import { Plus, Play, Trash2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  ReportGenerateRequest,
  SavedReportTemplate,
} from "@/types/reports"
import { REPORT_PERIOD_LABELS, REPORT_TYPE_LABELS } from "@/types/reports"

interface SavedTemplatesProps {
  templates: SavedReportTemplate[]
  isLoading?: boolean
  isSaving?: boolean
  isDeleting?: boolean
  onUseTemplate: (config: ReportGenerateRequest) => void
  onSaveTemplate: (name: string, config: ReportGenerateRequest) => void
  onDeleteTemplate: (templateId: string) => void
  currentConfig?: ReportGenerateRequest | null
}

export function SavedTemplates({
  templates,
  isLoading = false,
  isSaving = false,
  isDeleting = false,
  onUseTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  currentConfig,
}: SavedTemplatesProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")

  const handleSave = () => {
    if (templateName.trim() && currentConfig) {
      onSaveTemplate(templateName.trim(), currentConfig)
      setTemplateName("")
      setSaveDialogOpen(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(new Date(dateString))
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Saved Templates</h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Saved Templates</h3>

        {currentConfig && (
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Save Current
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Report Template</DialogTitle>
                <DialogDescription>
                  Save your current report configuration for quick access later.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Weekly Class Report"
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!templateName.trim() || isSaving}
                >
                  {isSaving ? "Saving..." : "Save Template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No saved templates</p>
          <p className="text-sm mt-1">
            Configure a report and save it for quick reuse
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{template.name}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>
                    {REPORT_TYPE_LABELS[template.config.report_type]}
                  </span>
                  <span>•</span>
                  <span>{REPORT_PERIOD_LABELS[template.config.period]}</span>
                  <span>•</span>
                  <span>Created {formatDate(template.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUseTemplate(template.config)}
                >
                  <Play className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={isDeleting}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{template.name}". This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteTemplate(template.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default SavedTemplates
