/**
 * Skills API Service (Epic 30 - Story 30.9)
 *
 * Fetches skill categories and their available activity formats.
 */

import type {
  AssignmentSkillBreakdownResponse,
  ClassSkillHeatmapResponse,
  SkillWithFormats,
  StudentSkillProfileResponse,
  StudentSkillTrendsResponse,
} from "@/types/skill"
import { OpenAPI } from "@/client/core/OpenAPI"

const BASE_URL = OpenAPI.BASE || ""

export async function getSkills(): Promise<SkillWithFormats[]> {
  const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as any) : OpenAPI.TOKEN
  const response = await fetch(`${BASE_URL}/api/v1/skills/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch skills: ${response.statusText}`)
  }
  return response.json()
}

export async function getAssignmentSkillBreakdown(
  assignmentId: string,
): Promise<AssignmentSkillBreakdownResponse> {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({} as any)
      : OpenAPI.TOKEN
  const response = await fetch(
    `${BASE_URL}/api/v1/assignments/${assignmentId}/skill-breakdown`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch skill breakdown: ${response.statusText}`)
  }
  return response.json()
}

export async function getMySkillProfile(): Promise<StudentSkillProfileResponse> {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({} as any)
      : OpenAPI.TOKEN
  const response = await fetch(
    `${BASE_URL}/api/v1/students/me/skill-profile`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch skill profile: ${response.statusText}`)
  }
  return response.json()
}

export async function getStudentSkillProfile(
  studentId: string,
): Promise<StudentSkillProfileResponse> {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({} as any)
      : OpenAPI.TOKEN
  const response = await fetch(
    `${BASE_URL}/api/v1/students/${studentId}/skill-profile`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch student skill profile: ${response.statusText}`)
  }
  return response.json()
}

export async function getClassSkillHeatmap(
  classId: string,
): Promise<ClassSkillHeatmapResponse> {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({} as any)
      : OpenAPI.TOKEN
  const response = await fetch(
    `${BASE_URL}/api/v1/classes/${classId}/skill-heatmap`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch class skill heatmap: ${response.statusText}`)
  }
  return response.json()
}

export async function getMySkillTrends(
  period: string = "3m",
): Promise<StudentSkillTrendsResponse> {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({} as any)
      : OpenAPI.TOKEN
  const response = await fetch(
    `${BASE_URL}/api/v1/students/me/skill-trends?period=${period}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch skill trends: ${response.statusText}`)
  }
  return response.json()
}

export async function getStudentSkillTrends(
  studentId: string,
  period: string = "3m",
): Promise<StudentSkillTrendsResponse> {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({} as any)
      : OpenAPI.TOKEN
  const response = await fetch(
    `${BASE_URL}/api/v1/students/${studentId}/skill-trends?period=${period}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch student skill trends: ${response.statusText}`)
  }
  return response.json()
}
