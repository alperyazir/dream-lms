/**
 * Tests for assignment utility functions
 * Story 20.2: Unified Edit Assignment Dialog
 */

import { describe, expect, it } from "vitest"
import type { AssignmentPreviewResponse } from "@/types/assignment"
import { mapAssignmentToFormData } from "../assignment-utils"

describe("mapAssignmentToFormData", () => {
  it("should correctly map assignment preview to form data", () => {
    const mockAssignment: AssignmentPreviewResponse = {
      assignment_id: "123e4567-e89b-12d3-a456-426614174000",
      assignment_name: "Test Assignment",
      instructions: "Test instructions",
      due_date: "2024-12-31T23:59:59Z",
      time_limit_minutes: 60,
      status: "published",
      book_id: 1,
      book_title: "Test Book",
      book_name: "test-book",
      publisher_name: "Test Publisher",
      book_cover_url: null,
      activities: [
        {
          id: "act-1",
          title: "Activity 1",
          activity_type: "multiple_choice",
          config_json: {},
          order_index: 0,
        },
        {
          id: "act-2",
          title: "Activity 2",
          activity_type: "fill_blank",
          config_json: {},
          order_index: 1,
        },
      ],
      total_activities: 2,
      is_preview: true,
      video_path: null,
      resources: {
        videos: [],
        teacher_materials: [],
      },
    }

    const result = mapAssignmentToFormData(mockAssignment)

    expect(result.name).toBe("Test Assignment")
    expect(result.instructions).toBe("Test instructions")
    expect(result.due_date).toBeInstanceOf(Date)
    expect(result.time_limit_minutes).toBe(60)
    expect(result.activity_ids).toEqual(["act-1", "act-2"])
    expect(result.class_ids).toEqual([])
    expect(result.student_ids).toEqual([])
    expect(result.scheduled_publish_date).toBeNull()
    expect(result.time_planning_enabled).toBe(false)
    expect(result.date_groups).toEqual([])
  })

  it("should handle null/empty fields correctly", () => {
    const mockAssignment: AssignmentPreviewResponse = {
      assignment_id: "123e4567-e89b-12d3-a456-426614174000",
      assignment_name: "Test Assignment",
      instructions: null,
      due_date: null,
      time_limit_minutes: null,
      status: "draft",
      book_id: 1,
      book_title: "Test Book",
      book_name: "test-book",
      publisher_name: "Test Publisher",
      book_cover_url: null,
      activities: [
        {
          id: "act-1",
          title: "Activity 1",
          activity_type: "multiple_choice",
          config_json: {},
          order_index: 0,
        },
      ],
      total_activities: 1,
      is_preview: true,
      video_path: null,
      resources: null,
    }

    const result = mapAssignmentToFormData(mockAssignment)

    expect(result.name).toBe("Test Assignment")
    expect(result.instructions).toBe("")
    expect(result.due_date).toBeNull()
    expect(result.time_limit_minutes).toBeNull()
    expect(result.resources).toBeNull()
  })

  it("should map resources with teacher materials correctly", () => {
    const mockAssignment: AssignmentPreviewResponse = {
      assignment_id: "123e4567-e89b-12d3-a456-426614174000",
      assignment_name: "Test Assignment",
      instructions: null,
      due_date: null,
      time_limit_minutes: null,
      status: "published",
      book_id: 1,
      book_title: "Test Book",
      book_name: "test-book",
      publisher_name: "Test Publisher",
      book_cover_url: null,
      activities: [
        {
          id: "act-1",
          title: "Activity 1",
          activity_type: "multiple_choice",
          config_json: {},
          order_index: 0,
        },
      ],
      total_activities: 1,
      is_preview: true,
      video_path: null,
      resources: {
        videos: [
          {
            type: "video",
            path: "videos/intro.mp4",
            name: "Introduction",
            subtitles_enabled: true,
            has_subtitles: true,
          },
        ],
        teacher_materials: [
          {
            material_id: "mat-1",
            name: "Worksheet",
            material_type: "document",
            is_available: true,
            file_size: 1024,
            mime_type: "application/pdf",
            url: null,
            text_content: null,
            download_url: "http://example.com/worksheet.pdf",
          },
        ],
      },
    }

    const result = mapAssignmentToFormData(mockAssignment)

    expect(result.resources).toBeDefined()
    expect(result.resources?.videos).toHaveLength(1)
    expect(result.resources?.teacher_materials).toHaveLength(1)
    expect(result.resources?.videos[0].path).toBe("videos/intro.mp4")
    expect(result.resources?.teacher_materials[0].material_id).toBe("mat-1")
  })
})
