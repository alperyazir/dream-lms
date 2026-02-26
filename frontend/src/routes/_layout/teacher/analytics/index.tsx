import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BarChart3, ChevronRight, GraduationCap, Users } from "lucide-react"
import { useState } from "react"
import { FiBarChart2 } from "react-icons/fi"
import { type ClassResponse, type StudentPublic, TeachersService } from "@/client"
import { ClassAnalyticsPanel } from "@/components/analytics/ClassAnalyticsPanel"
import { StudentAnalyticsPanel } from "@/components/analytics/StudentAnalyticsPanel"
import { PageHeader } from "@/components/Common/PageContainer"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const Route = createFileRoute("/_layout/teacher/analytics/")({
  component: AnalyticsHub,
})

function AnalyticsHub() {
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string
    name: string
  } | null>(null)
  const [selectedClass, setSelectedClass] = useState<{
    id: string
    name: string
  } | null>(null)

  const { data: students = [], isLoading: studentsLoading } = useQuery<
    StudentPublic[]
  >({
    queryKey: ["myStudents"],
    queryFn: () => TeachersService.listMyStudents(),
  })

  const { data: classes = [], isLoading: classesLoading } = useQuery<
    ClassResponse[]
  >({
    queryKey: ["myClasses"],
    queryFn: () => TeachersService.listMyClasses(),
  })

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <PageHeader
        icon={FiBarChart2}
        title="Analytics"
        description="View student and classroom performance at a glance"
      />

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="classrooms" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Classrooms
          </TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students" className="mt-6">
          <Card>
            <CardContent className="p-0">
              {studentsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-r-transparent" />
                </div>
              ) : students.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Student</TableHead>
                      <TableHead className="font-semibold">Grade</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const initials = (student.user_full_name || "?")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                      return (
                        <TableRow
                          key={student.id}
                          className="cursor-pointer hover:bg-primary/5 transition-colors"
                          onClick={() =>
                            setSelectedStudent({
                              id: student.id,
                              name: student.user_full_name,
                            })
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-teal-600/10 text-teal-700 dark:text-teal-400 text-xs font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {student.user_full_name || "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-medium">
                              {student.grade_level || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mb-3 opacity-40" />
                  <p>No students found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classrooms Tab */}
        <TabsContent value="classrooms" className="mt-6">
          <Card>
            <CardContent className="p-0">
              {classesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-r-transparent" />
                </div>
              ) : classes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Classroom</TableHead>
                      <TableHead className="font-semibold">Grade</TableHead>
                      <TableHead className="font-semibold">Students</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((cls) => {
                      return (
                        <TableRow
                          key={cls.id}
                          className="cursor-pointer hover:bg-primary/5 transition-colors"
                          onClick={() =>
                            setSelectedClass({ id: cls.id, name: cls.name })
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <GraduationCap className="h-4 w-4" />
                              </div>
                              <span className="font-medium">{cls.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-medium">
                              {cls.grade_level || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span className="font-medium text-foreground">
                                {cls.student_count ?? 0}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mb-3 opacity-40" />
                  <p>No classrooms found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Student Analytics Side Panel */}
      <StudentAnalyticsPanel
        studentId={selectedStudent?.id ?? null}
        studentName={selectedStudent?.name}
        open={!!selectedStudent}
        onOpenChange={(open) => {
          if (!open) setSelectedStudent(null)
        }}
      />

      {/* Class Analytics Side Panel */}
      <ClassAnalyticsPanel
        classId={selectedClass?.id ?? null}
        className={selectedClass?.name}
        open={!!selectedClass}
        onOpenChange={(open) => {
          if (!open) setSelectedClass(null)
        }}
      />
    </div>
  )
}
