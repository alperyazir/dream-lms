/**
 * Class Skill Heatmap Component
 * Story 30.15: Students x Skills proficiency matrix with color coding.
 */

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ClassSkillHeatmapResponse } from "@/types/skill"

interface SkillHeatmapProps {
  data: ClassSkillHeatmapResponse
}

type SortDir = "asc" | "desc"

function getProficiencyColor(proficiency: number | null): string {
  if (proficiency === null) return "bg-gray-50 text-gray-400 dark:bg-gray-800/50"
  if (proficiency < 50) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
  if (proficiency <= 70) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
}

export function SkillHeatmap({ data }: SkillHeatmapProps) {
  const navigate = useNavigate()
  const [sortSkill, setSortSkill] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const handleSort = (slug: string) => {
    if (sortSkill === slug) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortSkill(slug)
      setSortDir("desc")
    }
  }

  const sortedStudents = useMemo(() => {
    if (!sortSkill) return data.students
    return [...data.students].sort((a, b) => {
      const aVal = a.skills[sortSkill]?.proficiency ?? -1
      const bVal = b.skills[sortSkill]?.proficiency ?? -1
      return sortDir === "asc" ? aVal - bVal : bVal - aVal
    })
  }, [data.students, sortSkill, sortDir])

  const handleCellClick = (studentId: string) => {
    navigate({ to: "/teacher/analytics/$studentId", params: { studentId } })
  }

  if (data.students.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No students enrolled in this class.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Student</TableHead>
            {data.skill_columns.map((skill) => (
              <TableHead
                key={skill.id}
                className="cursor-pointer select-none text-center"
                onClick={() => handleSort(skill.slug)}
              >
                <div className="flex items-center justify-center gap-1">
                  {skill.name}
                  {sortSkill === skill.slug ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStudents.map((student) => (
            <TableRow key={student.student_id}>
              <TableCell className="font-medium">
                {student.student_name}
              </TableCell>
              {data.skill_columns.map((skill) => {
                const cell = student.skills[skill.slug]
                return (
                  <TableCell
                    key={skill.id}
                    className={`cursor-pointer text-center font-semibold transition-colors hover:opacity-80 ${getProficiencyColor(cell?.proficiency ?? null)}`}
                    onClick={() => handleCellClick(student.student_id)}
                    title={
                      cell?.proficiency !== null && cell?.proficiency !== undefined
                        ? `${cell.proficiency}% (${cell.data_points} data points, ${cell.confidence})`
                        : "No data"
                    }
                  >
                    {cell?.proficiency !== null && cell?.proficiency !== undefined
                      ? `${cell.proficiency}%`
                      : "\u2014"}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold">Class Average</TableCell>
            {data.skill_columns.map((skill) => {
              const avg = data.class_averages[skill.slug]
              return (
                <TableCell
                  key={skill.id}
                  className={`text-center font-bold ${getProficiencyColor(avg ?? null)}`}
                >
                  {avg !== null && avg !== undefined ? `${avg}%` : "\u2014"}
                </TableCell>
              )
            })}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
