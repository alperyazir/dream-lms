/**
 * Report type definitions for Dream LMS.
 * Story 5.6: Time-Based Reporting & Trend Analysis
 */

/**
 * Type of report to generate
 */
export type ReportType = "student" | "class" | "assignment"

/**
 * Output format for generated reports
 */
export type ReportFormat = "pdf" | "excel"

/**
 * Time period for report data
 */
export type ReportPeriod = "week" | "month" | "semester" | "custom"

/**
 * Predefined report template types
 */
export type ReportTemplateType =
  | "weekly_class_summary"
  | "student_progress_report"
  | "monthly_assignment_overview"
  | "parent_teacher_conference"

/**
 * Status of a report generation job
 */
export type ReportJobStatus = "pending" | "processing" | "completed" | "failed"

/**
 * Request to generate a new report
 */
export interface ReportGenerateRequest {
  report_type: ReportType
  period: ReportPeriod
  start_date?: string | null
  end_date?: string | null
  target_id: string
  format: ReportFormat
  template_type?: ReportTemplateType | null
}

/**
 * Response after initiating report generation
 */
export interface ReportJobResponse {
  job_id: string
  status: ReportJobStatus
  created_at: string
  estimated_completion?: string | null
}

/**
 * Response for checking report job status
 */
export interface ReportStatusResponse {
  job_id: string
  status: ReportJobStatus
  progress_percentage: number
  download_url?: string | null
  error_message?: string | null
}

/**
 * A saved report configuration template
 */
export interface SavedReportTemplate {
  id: string
  name: string
  config: ReportGenerateRequest
  created_at: string
}

/**
 * Request to save a report configuration as a template
 */
export interface SavedReportTemplateCreate {
  name: string
  config: ReportGenerateRequest
}

/**
 * A previously generated report in history
 */
export interface ReportHistoryItem {
  id: string
  job_id: string
  report_type: ReportType
  template_type: ReportTemplateType | null
  format: ReportFormat
  target_name: string
  created_at: string
  expires_at: string
  download_url: string | null
  is_expired: boolean
}

/**
 * Response containing report history list
 */
export interface ReportHistoryResponse {
  reports: ReportHistoryItem[]
}

/**
 * Template display information
 */
export interface ReportTemplateInfo {
  type: ReportTemplateType
  name: string
  description: string
  icon: string
  reportType: ReportType
  defaultPeriod: ReportPeriod
}

/**
 * Predefined templates with their metadata
 */
export const PREDEFINED_TEMPLATES: ReportTemplateInfo[] = [
  {
    type: "weekly_class_summary",
    name: "Weekly Class Summary",
    description: "Class performance overview for the selected week",
    icon: "calendar-days",
    reportType: "class",
    defaultPeriod: "week",
  },
  {
    type: "student_progress_report",
    name: "Student Progress Report",
    description: "Individual student performance for a semester or year",
    icon: "user-circle",
    reportType: "student",
    defaultPeriod: "semester",
  },
  {
    type: "monthly_assignment_overview",
    name: "Monthly Assignment Overview",
    description: "All assignments and their performance for a month",
    icon: "clipboard-list",
    reportType: "assignment",
    defaultPeriod: "month",
  },
  {
    type: "parent_teacher_conference",
    name: "Parent-Teacher Conference",
    description: "Comprehensive student report with trends and recommendations",
    icon: "file-text",
    reportType: "student",
    defaultPeriod: "semester",
  },
]

/**
 * Report type display labels
 */
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  student: "Student Report",
  class: "Class Report",
  assignment: "Assignment Overview",
}

/**
 * Report period display labels
 */
export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  week: "Last 7 Days",
  month: "Last 30 Days",
  semester: "This Semester",
  custom: "Custom Date Range",
}

/**
 * Report format display labels
 */
export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: "PDF Document",
  excel: "Excel Spreadsheet",
}
