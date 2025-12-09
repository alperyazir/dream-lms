/**
 * Get Tour Steps for Role
 * Returns the appropriate tour steps based on user role
 */

import type { UserRole } from "@/client"
import type { TourStep } from "@/types/tour"
import { publisherTourSteps } from "./publisherTourSteps"
import { studentTourSteps } from "./studentTourSteps"
import { teacherTourSteps } from "./teacherTourSteps"

/**
 * Returns tour steps appropriate for the given user role
 * @param role - The user's role (admin, publisher, teacher, student)
 * @returns Array of TourStep objects, empty for admin role
 */
export function getTourStepsForRole(role: UserRole): TourStep[] {
  switch (role) {
    case "teacher":
      return teacherTourSteps
    case "student":
      return studentTourSteps
    case "publisher":
      return publisherTourSteps
    case "admin":
      // Admins don't see the onboarding tour (power users)
      return []
    default:
      return []
  }
}
