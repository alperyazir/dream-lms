/**
 * Report Builder Component
 * Story 5.6: Time-Based Reporting & Trend Analysis
 *
 * Stepped form for configuring and generating reports.
 */

import { zodResolver } from "@hookform/resolvers/zod"
import {
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Search,
  User,
  Users,
  X,
} from "lucide-react"
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
import { cn } from "@/lib/utils"
import type {
  ReportGenerateRequest,
  ReportTemplateType,
  ReportType,
} from "@/types/reports"
import { REPORT_PERIOD_LABELS } from "@/types/reports"

const reportFormSchema = z
  .object({
    report_type: z.enum(["student", "class"]),
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

interface NamedOption {
  id: string
  name: string
}

interface ReportBuilderProps {
  classes: NamedOption[]
  students: NamedOption[]
  onGenerate: (config: ReportGenerateRequest) => void
  isGenerating?: boolean
  selectedTemplate?: ReportTemplateType | null
}

const reportTypes: {
  value: "student" | "class"
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    value: "student",
    label: "Student",
    description: "Individual performance",
    icon: User,
  },
  {
    value: "class",
    label: "Class",
    description: "Classroom overview",
    icon: Users,
  },
]

export function ReportBuilder({
  classes,
  students,
  onGenerate,
  isGenerating = false,
  selectedTemplate = null,
}: ReportBuilderProps) {
  const [reportType, setReportType] = useState<ReportType>("student")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredOptions = useMemo(() => {
    const source = reportType === "student" ? students : classes
    const sorted = [...source].sort((a, b) => a.name.localeCompare(b.name))
    if (!searchQuery.trim()) return sorted
    const q = searchQuery.toLowerCase()
    return sorted.filter((item) => item.name.toLowerCase().includes(q))
  }, [reportType, students, classes, searchQuery])

  const totalCount = reportType === "student" ? students.length : classes.length

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
  const currentTargetId = form.watch("target_id")

  const isStep2Complete = !!currentTargetId
  const isStep3Complete = !!currentPeriod

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

  const handleReportTypeChange = (value: "student" | "class") => {
    setReportType(value)
    form.setValue("report_type", value)
    form.setValue("target_id", "")
    setSearchQuery("")
  }

  const targetLabel =
    reportType === "student" ? "Select Student" : "Select Class"

  const searchPlaceholder =
    reportType === "student" ? "Search students..." : "Search classes..."

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Step 1 - Report Type */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </div>
            <h3 className="font-semibold">Choose report type</h3>
          </div>

          <FormField
            control={form.control}
            name="report_type"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-3">
                  {reportTypes.map((type) => {
                    const isActive = field.value === type.value
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleReportTypeChange(type.value)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                          isActive
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40 hover:bg-muted/50",
                        )}
                      >
                        {isActive && (
                          <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                        )}
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <type.icon className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isActive && "text-primary",
                            )}
                          >
                            {type.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            {type.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>

        {/* Step 2 - Target Selection */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                isStep2Complete
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isStep2Complete ? <CheckCircle2 className="h-4 w-4" /> : "2"}
            </div>
            <h3 className="font-semibold">{targetLabel}</h3>
          </div>

          <FormField
            control={form.control}
            name="target_id"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={targetLabel} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <div className="sticky top-0 bg-popover p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={searchPlaceholder}
                          value={searchQuery}
                          onChange={(e) => {
                            e.stopPropagation()
                            setSearchQuery(e.target.value)
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="pl-8 pr-8 h-8 text-sm"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSearchQuery("")
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {searchQuery && (
                        <p className="text-xs text-muted-foreground mt-1.5 px-0.5">
                          {filteredOptions.length} of {totalCount} results
                        </p>
                      )}
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {filteredOptions.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          {searchQuery
                            ? "No results found"
                            : "No options available"}
                        </div>
                      ) : (
                        filteredOptions.map((option) => (
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
        </Card>

        {/* Step 3 - Time Period */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                isStep3Complete
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isStep3Complete ? <CheckCircle2 className="h-4 w-4" /> : "3"}
            </div>
            <h3 className="font-semibold">Time period</h3>
          </div>

          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(REPORT_PERIOD_LABELS).map(
                    ([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all",
                          field.value === value
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground",
                        )}
                      >
                        <Calendar className="h-4 w-4 shrink-0" />
                        {label}
                      </button>
                    ),
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {currentPeriod === "custom" && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
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
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </Card>

        <input type="hidden" {...form.register("format")} value="pdf" />

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}

export default ReportBuilder
