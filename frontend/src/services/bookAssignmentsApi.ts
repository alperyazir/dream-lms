/**
 * Book Assignments API Service - Story 9.4
 *
 * Provides API functions for managing book assignments to schools/teachers.
 */

import {
  type BookAssignmentCreate,
  type BookAssignmentListResponse,
  type BookAssignmentPublic,
  type BookAssignmentResponse,
  BookAssignmentsService,
  type BulkBookAssignmentCreate,
} from "@/client"

/**
 * Create a single book assignment
 */
export async function createBookAssignment(
  data: BookAssignmentCreate,
): Promise<BookAssignmentPublic> {
  return BookAssignmentsService.createBookAssignment({
    requestBody: data,
  })
}

/**
 * Create bulk book assignments (entire school or specific teachers)
 */
export async function createBulkBookAssignments(
  data: BulkBookAssignmentCreate,
): Promise<BookAssignmentPublic[]> {
  return BookAssignmentsService.createBulkBookAssignments({
    requestBody: data,
  })
}

/**
 * List book assignments with optional filters
 */
export async function listBookAssignments(params: {
  bookId?: string
  schoolId?: string
  skip?: number
  limit?: number
}): Promise<BookAssignmentListResponse> {
  return BookAssignmentsService.listBookAssignments({
    bookId: params.bookId,
    schoolId: params.schoolId,
    skip: params.skip,
    limit: params.limit,
  })
}

/**
 * Get all assignments for a specific book
 */
export async function getBookAssignments(
  bookId: number,
): Promise<BookAssignmentResponse[]> {
  return BookAssignmentsService.getBookAssignments({
    bookId,
  })
}

/**
 * Delete a book assignment
 */
export async function deleteBookAssignment(
  assignmentId: string,
): Promise<void> {
  return BookAssignmentsService.deleteBookAssignment({
    assignmentId,
  })
}

// Re-export types for convenience
export type {
  BookAssignmentCreate,
  BookAssignmentListResponse,
  BookAssignmentPublic,
  BookAssignmentResponse,
  BulkBookAssignmentCreate,
}
