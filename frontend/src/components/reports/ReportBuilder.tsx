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

import { zodResolver } from "@hookform/resolvers/zod"
import { ClipboardList, Search, User, Users, X } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
    format: z.literal("pdf"),
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
    },
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
  const [studentSearch, setStudentSearch] = useState("")
  const [classSearch, setClassSearch] = useState("")

  // Filter and sort students based on search query (alphabetically)
  const filteredStudents = useMemo(() => {
    const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name))
    if (!studentSearch.trim()) return sorted
    const query = studentSearch.toLowerCase()
    return sorted.filter((s) => s.name.toLowerCase().includes(query))
  }, [students, studentSearch])

  // Filter and sort classes based on search query (alphabetically)
  const filteredClasses = useMemo(() => {
    const sorted = [...classes].sort((a, b) => a.name.localeCompare(b.name))
    if (!classSearch.trim()) return sorted
    const query = classSearch.toLowerCase()
    return sorted.filter((c) => c.name.toLowerCase().includes(query))
  }, [classes, classSearch])

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
    setStudentSearch("") // Clear search when switching
    setClassSearch("")
  }

  const getTargetOptions = () => {
    if (reportType === "class") {
      return filteredClasses.map((c) => ({ id: c.id, name: c.name }))
    }
    if (reportType === "student") {
      return filteredStudents.map((s) => ({ id: s.id, name: s.name }))
    }
    // For assignment reports, use an empty target or teacher ID
    return []
  }

  const getSearchValue = () => {
    return reportType === "student" ? studentSearch : classSearch
  }

  const setSearchValue = (value: string) => {
    if (reportType === "student") {
      setStudentSearch(value)
    } else {
      setClassSearch(value)
    }
  }

  const clearSearch = () => {
    if (reportType === "student") {
      setStudentSearch("")
    } else {
      setClassSearch("")
    }
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
                      {/* Search Input inside dropdown */}
                      <div className="sticky top-0 bg-popover p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={`Search ${reportType === "student" ? "students" : "classes"}...`}
                            value={getSearchValue()}
                            onChange={(e) => {
                              e.stopPropagation()
                              setSearchValue(e.target.value)
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="pl-8 pr-8 h-8 text-sm"
                          />
                          {getSearchValue() && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                clearSearch()
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {/* Search result count */}
                        {getSearchValue() && (
                          <p className="text-xs text-muted-foreground mt-1.5 px-0.5">
                            {getTargetOptions().length} of{" "}
                            {reportType === "student"
                              ? students.length
                              : classes.length}{" "}
                            {reportType === "student" ? "students" : "classes"}
                          </p>
                        )}
                      </div>
                      {/* List of options */}
                      <div className="max-h-[200px] overflow-y-auto">
                        {getTargetOptions().length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {getSearchValue()
                              ? `No ${reportType === "student" ? "students" : "classes"} found`
                              : `No ${reportType === "student" ? "students" : "classes"} available`}
                          </div>
                        ) : (
                          getTargetOptions().map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                            </SelectItem>
                          ))
                        )}
                      </div>
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
                      ),
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

          {/* Format is always PDF - hidden field */}
          <input type="hidden" {...form.register("format")} value="pdf" />

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
