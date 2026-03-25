import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Users,
} from "lucide-react";
import { useState } from "react";
import { FiBarChart2 } from "react-icons/fi";
import {
  type ClassResponse,
  type StudentPublic,
  TeachersService,
} from "@/client";
import { getMyStudentsPaginated } from "@/services/teachersApi";
import { ClassAnalyticsPanel } from "@/components/analytics/ClassAnalyticsPanel";
import { StudentAnalyticsPanel } from "@/components/analytics/StudentAnalyticsPanel";
import { PageHeader } from "@/components/Common/PageContainer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_layout/teacher/analytics/")({
  component: AnalyticsHub,
});

const PAGE_SIZE = 20;

function AnalyticsHub() {
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedClass, setSelectedClass] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [classPage, setClassPage] = useState(1);

  const { data: students = [], isLoading: studentsLoading } = useQuery<
    StudentPublic[]
  >({
    queryKey: ["teacherStudents"],
    queryFn: async () => {
      const res = await getMyStudentsPaginated(500, 0);
      return res.items;
    },
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery<
    ClassResponse[]
  >({
    queryKey: ["teacherClasses"],
    queryFn: () => TeachersService.listMyClasses(),
  });

  // Filtered students
  const filteredStudents = students.filter((student) => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (
      student.user_full_name?.toLowerCase().includes(q) ||
      student.user_username?.toLowerCase().includes(q)
    );
  });
  const totalStudentPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const paginatedStudents = filteredStudents.slice(
    (studentPage - 1) * PAGE_SIZE,
    studentPage * PAGE_SIZE,
  );

  // Filtered classes
  const filteredClasses = classes.filter((cls) => {
    if (!classSearch) return true;
    const q = classSearch.toLowerCase();
    return (
      cls.name?.toLowerCase().includes(q) ||
      cls.subject?.toLowerCase().includes(q)
    );
  });
  const totalClassPages = Math.ceil(filteredClasses.length / PAGE_SIZE);
  const paginatedClasses = filteredClasses.slice(
    (classPage - 1) * PAGE_SIZE,
    classPage * PAGE_SIZE,
  );

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <PageHeader
        icon={FiBarChart2}
        title="Analytics"
        description="View student and classroom performance at a glance"
      />

      <Tabs
        defaultValue="students"
        className="w-full"
        onValueChange={() => {
          setStudentPage(1);
          setClassPage(1);
        }}
      >
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
        <TabsContent value="students" className="mt-6 space-y-4">
          <Input
            type="search"
            placeholder="Search students by name or username..."
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value);
              setStudentPage(1);
            }}
            className="max-w-md"
          />
          <Card>
            <CardContent className="p-0">
              {studentsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-r-transparent" />
                </div>
              ) : filteredStudents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Student</TableHead>
                      <TableHead className="font-semibold">Grade</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student) => {
                      const initials = (student.user_full_name || "?")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase();
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
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mb-3 opacity-40" />
                  <p>
                    {studentSearch
                      ? "No students match your search."
                      : "No students found."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Student Pagination */}
          {totalStudentPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(studentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(studentPage * PAGE_SIZE, filteredStudents.length)} of{" "}
                {filteredStudents.length} students
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                  disabled={studentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {studentPage} of {totalStudentPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStudentPage((p) => p + 1)}
                  disabled={studentPage >= totalStudentPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Classrooms Tab */}
        <TabsContent value="classrooms" className="mt-6 space-y-4">
          <Input
            type="search"
            placeholder="Search classrooms by name or subject..."
            value={classSearch}
            onChange={(e) => {
              setClassSearch(e.target.value);
              setClassPage(1);
            }}
            className="max-w-md"
          />
          <Card>
            <CardContent className="p-0">
              {classesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-r-transparent" />
                </div>
              ) : filteredClasses.length > 0 ? (
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
                    {paginatedClasses.map((cls) => {
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
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mb-3 opacity-40" />
                  <p>
                    {classSearch
                      ? "No classrooms match your search."
                      : "No classrooms found."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Classroom Pagination */}
          {totalClassPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(classPage - 1) * PAGE_SIZE + 1}–
                {Math.min(classPage * PAGE_SIZE, filteredClasses.length)} of{" "}
                {filteredClasses.length} classrooms
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClassPage((p) => Math.max(1, p - 1))}
                  disabled={classPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {classPage} of {totalClassPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClassPage((p) => p + 1)}
                  disabled={classPage >= totalClassPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Student Analytics Side Panel */}
      <StudentAnalyticsPanel
        studentId={selectedStudent?.id ?? null}
        studentName={selectedStudent?.name}
        open={!!selectedStudent}
        onOpenChange={(open) => {
          if (!open) setSelectedStudent(null);
        }}
      />

      {/* Class Analytics Side Panel */}
      <ClassAnalyticsPanel
        classId={selectedClass?.id ?? null}
        className={selectedClass?.name}
        open={!!selectedClass}
        onOpenChange={(open) => {
          if (!open) setSelectedClass(null);
        }}
      />
    </div>
  );
}
