/**
 * Teacher-related type definitions for Dream LMS.
 * Story 3.7: Assignment Creation - Classes and Students
 */

/**
 * Class model returned from API
 */
export interface Class {
  id: string
  teacher_id: string
  school_id: string
  name: string
  grade_level: string | null
  subject: string | null
  academic_year: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  student_count: number // Number of enrolled students (Story 20.5)
}

/**
 * Student model returned from API
 */
export interface Student {
  id: string
  user_id: string
  user_email: string
  user_username: string
  user_full_name: string
  grade_level: string | null
  parent_email: string | null
  created_at: string
  updated_at: string
}
