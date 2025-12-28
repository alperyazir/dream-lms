/**
 * Assignment utility functions
 * Story 20.2: Unified Edit Assignment Dialog
 */

import type {
  AssignmentForEditResponse,
  AssignmentFormData,
  AssignmentPreviewResponse,
} from "@/types/assignment"

/**
 * Maps an existing assignment (from preview endpoint) to form data
 * for use in the creation dialog's edit mode.
 *
 * @deprecated Use mapAssignmentForEditToFormData instead (Story 20.2)
 * @param assignment - Full assignment data from preview endpoint
 * @returns Form data structure for the creation dialog
 */
export function mapAssignmentToFormData(
  assignment: AssignmentPreviewResponse,
): AssignmentFormData {
  return {
    name: assignment.assignment_name,
    instructions: assignment.instructions || "",
    due_date: assignment.due_date ? new Date(assignment.due_date) : null,
    time_limit_minutes: assignment.time_limit_minutes,
    // Note: Recipients (class_ids, student_ids) need to be fetched separately
    // as they're not included in AssignmentPreviewResponse
    class_ids: [],
    student_ids: [],
    // Activity IDs from the activities array
    activity_ids: assignment.activities.map((a) => a.id),
    // Publishing/scheduling - not editable in edit mode, but preserve for form
    scheduled_publish_date: null, // Don't allow changing publish date in edit
    // Time planning - not supported in edit mode
    time_planning_enabled: false,
    date_groups: [],
    // Legacy video path
    video_path: assignment.video_path || null,
    // Additional resources
    resources: assignment.resources
      ? {
          videos: assignment.resources.videos,
          teacher_materials: assignment.resources.teacher_materials || [],
        }
      : null,
  }
}

/**
 * Maps assignment edit data to form data (Story 20.2)
 * Includes recipient information that was previously missing.
 *
 * @param assignment - Full assignment data from for-edit endpoint
 * @returns Form data structure for the creation dialog with recipients
 */
export function mapAssignmentForEditToFormData(
  assignment: AssignmentForEditResponse,
): AssignmentFormData {
  return {
    name: assignment.assignment_name,
    instructions: assignment.instructions || "",
    due_date: assignment.due_date ? new Date(assignment.due_date) : null,
    time_limit_minutes: assignment.time_limit_minutes,
    // Recipients from the assignment (Story 20.2 - CRITICAL FIX)
    class_ids: assignment.class_ids,
    student_ids: assignment.student_ids,
    // Activity IDs from the activities array
    activity_ids: assignment.activities.map((a) => a.id),
    // Time planning support (Story 20.2)
    scheduled_publish_date: assignment.scheduled_publish_date
      ? new Date(assignment.scheduled_publish_date)
      : null,
    time_planning_enabled: assignment.time_planning_enabled,
    date_groups: (assignment.date_groups as any) || [],
    // Legacy video path
    video_path: assignment.video_path || null,
    // Additional resources
    resources: assignment.resources
      ? {
          videos: assignment.resources.videos,
          teacher_materials: assignment.resources.teacher_materials || [],
        }
      : null,
  }
}
