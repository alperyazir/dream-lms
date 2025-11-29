/**
 * Report Builder Component
 * Story 5.6: Time-Based Reporting & Trend Analysis
 *
 * Form for configuring and generating reports with:
 * - Report type selection
 * - Time period selection
 * - Target selection (class/student)
 * - Format selection (PDF/Excel)
 */

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  FileText,
  FileSpreadsheet,
  Users,
  User,
  ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type {
  ReportGenerateRequest,
  ReportTemplateType,
  ReportType,
} from "@/types/reports"
import { REPORT_PERIOD_LABELS } from "@/types/reports"

// Form validation schema
const reportFormSchema = z
  .object({
    report_type: z.enum(["student", "class", "assignment"]),
    period: z.enum(["week", "month", "semester", "custom"]),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    target_id: z.string().min(1, "Please select a target"),
    format: z.enum(["pdf", "excel"]),
    template_type: z
      .enum([
        "weekly_class_summary",
        "student_progress_report",
        "monthly_assignment_overview",
        "parent_teacher_conference",
      ])
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.period === "custom") {
        return data.start_date && data.end_date
      }
      return true
    },
    {
      message: "Start and end dates are required for custom period",
      path: ["start_date"],
    }
  )

type ReportFormData = z.infer<typeof reportFormSchema>

interface ClassOption {
  id: string
  name: string
}

interface StudentOption {
  id: string
  name: string
}

interface ReportBuilderProps {
  classes: ClassOption[]
  students: StudentOption[]
  onGenerate: (config: ReportGenerateRequest) => void
  isGenerating?: boolean
  selectedTemplate?: ReportTemplateType | null
}

export function ReportBuilder({
  classes,
  students,
  onGenerate,
  isGenerating = false,
  selectedTemplate = null,
}: ReportBuilderProps) {
  const [reportType, setReportType] = useState<ReportType>("student")

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      report_type: "student",
      period: "month",
      format: "pdf",
      target_id: "",
      template_type: selectedTemplate,
    },
  })

  const currentPeriod = form.watch("period")

  const handleSubmit = (data: ReportFormData) => {
    const config: ReportGenerateRequest = {
      report_type: data.report_type,
      period: data.period,
      target_id: data.target_id,
      format: data.format,
      start_date: data.period === "custom" ? data.start_date : null,
      end_date: data.period === "custom" ? data.end_date : null,
      template_type: data.template_type,
    }
    onGenerate(config)
  }

  const handleReportTypeChange = (value: ReportType) => {
    setReportType(value)
    form.setValue("report_type", value)
    form.setValue("target_id", "") // Reset target when type changes
  }

  const getTargetOptions = () => {
    if (reportType === "class") {
      return classes.map((c) => ({ id: c.id, name: c.name }))
    }
    if (reportType === "student") {
      return students.map((s) => ({ id: s.id, name: s.name }))
    }
    // For assignment reports, use an empty target or teacher ID
    return []
  }

  const getTargetLabel = () => {
    switch (reportType) {
      case "class":
        return "Select Class"
      case "student":
        return "Select Student"
      default:
        return "Select Target"
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Configure Report</h3>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Report Type Selection */}
          <FormField
            control={form.control}
            name="report_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Report Type</FormLabel>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={field.value === "student" ? "default" : "outline"}
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => handleReportTypeChange("student")}
                  >
                    <User className="h-5 w-5" />
                    <span className="text-xs">Student</span>
                  </Button>
                  <Button
                    type="button"
                    variant={field.value === "class" ? "default" : "outline"}
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => handleReportTypeChange("class")}
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-xs">Class</span>
                  </Button>
                  <Button
                    type="button"
                    variant={
                      field.value === "assignment" ? "default" : "outline"
                    }
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => handleReportTypeChange("assignment")}
                  >
                    <ClipboardList className="h-5 w-5" />
                    <span className="text-xs">Assignment</span>
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Target Selection (for student and class reports) */}
          {reportType !== "assignment" && (
            <FormField
              control={form.control}
              name="target_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTargetLabel()}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={getTargetLabel()} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getTargetOptions().map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Time Period Selection */}
          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time Period</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(REPORT_PERIOD_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Custom Date Range */}
          {currentPeriod === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Format Selection */}
          <FormField
            control={form.control}
            name="format"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Output Format</FormLabel>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={field.value === "pdf" ? "default" : "outline"}
                    className="flex items-center gap-2"
                    onClick={() => form.setValue("format", "pdf")}
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    type="button"
                    variant={field.value === "excel" ? "default" : "outline"}
                    className="flex items-center gap-2"
                    onClick={() => form.setValue("format", "excel")}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Generate Button */}
          <Button type="submit" className="w-full" disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </form>
      </Form>
    </Card>
  )
}

export default ReportBuilder
