/**
 * Export Analytics Utilities
 * Story 8.4: Multi-Activity Assignment Analytics
 *
 * Functions to export assignment analytics data to Excel format.
 */

import * as XLSX from "xlsx"
import type { MultiActivityAnalyticsResponse } from "@/types/assignment"

/**
 * Export multi-activity analytics to Excel
 *
 * @param analytics - Analytics data from the API
 * @param assignmentName - Name of the assignment (for filename)
 */
export function exportMultiActivityAnalytics(
  analytics: MultiActivityAnalyticsResponse,
  assignmentName?: string,
): void {
  const wb = XLSX.utils.book_new()

  // Summary Sheet
  const summaryData = [
    ["Multi-Activity Assignment Analytics"],
    [],
    ["Assignment Name", analytics.assignment_name],
    ["Total Students", analytics.total_students],
    ["Submitted", analytics.submitted_count],
    ["Submission Rate", `${Math.round((analytics.submitted_count / analytics.total_students) * 100)}%`],
    ["Total Activities", analytics.activities.length],
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary")

  // Activity Analytics Sheet
  const activityHeaders = [
    "Activity Title",
    "Type",
    "Page #",
    "Completed",
    "Total Assigned",
    "Completion Rate",
    "Class Average",
  ]
  const activityRows = analytics.activities.map((activity) => [
    activity.activity_title || `Activity on Page ${activity.page_number}`,
    formatActivityType(activity.activity_type),
    activity.page_number,
    activity.completed_count,
    activity.total_assigned_count,
    `${Math.round(activity.completion_rate * 100)}%`,
    activity.class_average_score !== null
      ? `${Math.round(activity.class_average_score)}%`
      : "N/A",
  ])
  const activitySheet = XLSX.utils.aoa_to_sheet([activityHeaders, ...activityRows])
  // Set column widths
  activitySheet["!cols"] = [
    { wch: 30 }, // Activity Title
    { wch: 20 }, // Type
    { wch: 8 },  // Page #
    { wch: 12 }, // Completed
    { wch: 15 }, // Total Assigned
    { wch: 15 }, // Completion Rate
    { wch: 12 }, // Class Average
  ]
  XLSX.utils.book_append_sheet(wb, activitySheet, "Activity Analytics")

  // Per-Student Details Sheet (if expanded data is available)
  if (analytics.expanded_students && analytics.expanded_students.length > 0) {
    const studentHeaders = [
      "Student Name",
      "Status",
      "Score",
      "Max Score",
      "Percentage",
      "Time Spent",
      "Completed At",
    ]
    const studentRows = analytics.expanded_students.map((student) => [
      student.student_name,
      student.status.replace("_", " "),
      student.score !== null ? student.score : "N/A",
      student.max_score,
      student.score !== null
        ? `${Math.round((student.score / student.max_score) * 100)}%`
        : "N/A",
      formatTimeSpent(student.time_spent_seconds),
      student.completed_at
        ? new Date(student.completed_at).toLocaleString()
        : "N/A",
    ])
    const studentSheet = XLSX.utils.aoa_to_sheet([studentHeaders, ...studentRows])
    studentSheet["!cols"] = [
      { wch: 25 }, // Student Name
      { wch: 12 }, // Status
      { wch: 8 },  // Score
      { wch: 10 }, // Max Score
      { wch: 12 }, // Percentage
      { wch: 12 }, // Time Spent
      { wch: 20 }, // Completed At
    ]
    XLSX.utils.book_append_sheet(wb, studentSheet, "Student Details")
  }

  // Generate filename
  const safeName = (assignmentName || analytics.assignment_name)
    .replace(/[^a-z0-9]/gi, "_")
    .substring(0, 50)
  const dateStr = new Date().toISOString().split("T")[0]
  const filename = `${safeName}_Analytics_${dateStr}.xlsx`

  // Download
  XLSX.writeFile(wb, filename)
}

/**
 * Format activity type for display
 */
function formatActivityType(type: string): string {
  const typeMap: Record<string, string> = {
    circle: "Circle",
    drag_drop_picture: "Drag & Drop Picture",
    drag_drop_word: "Drag & Drop Word",
    fill_blank: "Fill in the Blank",
    match_words: "Match the Words",
    multiple_choice: "Multiple Choice",
    coloring: "Coloring",
    drawing: "Drawing",
  }
  return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Format seconds to human-readable time
 */
function formatTimeSpent(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes === 0) {
    return `${remainingSeconds}s`
  }
  return `${minutes}m ${remainingSeconds}s`
}
