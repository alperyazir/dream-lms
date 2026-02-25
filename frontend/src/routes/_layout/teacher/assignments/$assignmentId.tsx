import { createFileRoute, Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Eye,
  Hourglass,
  MessageSquare,
  PieChart,
  Play,
  Users,
  XCircle,
} from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AIQuizResults } from "@/components/ActivityPlayers/AIQuizResults"
import { ReadingComprehensionResults } from "@/components/ActivityPlayers/ReadingComprehensionResults"
import { SentenceBuilderResults } from "@/components/ActivityPlayers/SentenceBuilderResults"
import { SpeakingOpenResponseResults } from "@/components/ActivityPlayers/SpeakingOpenResponseResults"
import { VocabularyQuizResults } from "@/components/ActivityPlayers/VocabularyQuizResults"
import { WordBuilderResults } from "@/components/ActivityPlayers/WordBuilderResults"
import { WritingFreeResponseResults } from "@/components/ActivityPlayers/WritingFreeResponseResults"
import { MultiActivityAnalyticsTable } from "@/components/analytics/MultiActivityAnalyticsTable"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { FeedbackModal } from "@/components/feedback"
import { GradingPanel } from "@/components/grading/GradingPanel"
import { InlineFeedback } from "@/components/grading/InlineFeedback"
import { TestModePlayer } from "@/components/preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAssignmentAnalytics } from "@/hooks/useAssignmentAnalytics"
import {
  useAssignmentResults,
  useStudentAnswers,
} from "@/hooks/useAssignmentResults"
import { useQuickAssignmentTest } from "@/hooks/usePreviewMode"
import {
  parseAIQuizResult,
  parseFreeResponseResult,
  parseReadingComprehensionResult,
  parseSentenceBuilderResult,
  parseVocabularyQuizResult,
  parseWordBuilderResult,
} from "@/lib/resultParsers"
import type {
  ActivityTypeAnalysis,
  MostMissedQuestion,
  QuestionAnalysis,
  StudentResultItem,
} from "@/types/analytics"

export const Route = createFileRoute(
  "/_layout/teacher/assignments/$assignmentId",
)({
  component: AssignmentDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    gradeStudentId: (search.gradeStudentId as string) || undefined,
    tab: (search.tab as string) || undefined,
    openGrade: search.openGrade === true || search.openGrade === "true" || undefined,
  }),
})

function AssignmentDetailPage() {
  return (
    <ErrorBoundary>
      <AssignmentDetailContent />
    </ErrorBoundary>
  )
}

type StudentStatus = "all" | "not_started" | "in_progress" | "completed"
type SortBy = "name" | "score" | "time" | "completion"
type SortDirection = "asc" | "desc"

// Colors for heatmap visualization
const HEATMAP_COLORS = {
  excellent: "#22C55E", // Green for 80-100%
  good: "#84CC16", // Lime for 60-79%
  fair: "#EAB308", // Yellow for 40-59%
  poor: "#F97316", // Orange for 20-39%
  veryPoor: "#EF4444", // Red for 0-19%
}

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return HEATMAP_COLORS.excellent
  if (percentage >= 60) return HEATMAP_COLORS.good
  if (percentage >= 40) return HEATMAP_COLORS.fair
  if (percentage >= 20) return HEATMAP_COLORS.poor
  return HEATMAP_COLORS.veryPoor
}

function CompletionOverviewCard({
  overview,
}: {
  overview: {
    completed: number
    in_progress: number
    not_started: number
    past_due: number
    total: number
  }
}) {
  const completionPercent =
    overview.total > 0 ? (overview.completed / overview.total) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Completion Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Progress</span>
            <span className="font-medium">{completionPercent.toFixed(0)}%</span>
          </div>
          <Progress value={completionPercent} className="h-3" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{overview.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hourglass className="h-5 w-5 text-yellow-500" />
            <div>
              <div className="text-2xl font-bold">{overview.in_progress}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{overview.not_started}</div>
              <div className="text-xs text-muted-foreground">Not Started</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{overview.past_due}</div>
              <div className="text-xs text-muted-foreground">Past Due</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ScoreStatisticsCard({
  stats,
}: {
  stats: {
    avg_score: number
    median_score: number
    highest_score: number
    lowest_score: number
  } | null
}) {
  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Score Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No scores available yet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Score Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-teal-600">
              {stats.avg_score.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Average</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-green-600">
              {stats.highest_score}%
            </div>
            <div className="text-xs text-muted-foreground">Highest</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-red-600">
              {stats.lowest_score}%
            </div>
            <div className="text-xs text-muted-foreground">Lowest</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MostMissedQuestionsCard({
  questions,
}: {
  questions: MostMissedQuestion[] | null | undefined
}) {
  if (!questions || questions.length === 0) {
    return null
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <XCircle className="h-5 w-5" />
          Most Missed Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.question_id}
              className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-neutral-900 border"
            >
              <Badge variant="destructive" className="mt-0.5">
                #{idx + 1}
              </Badge>
              <div className="flex-1">
                <p className="font-medium">{q.question_text}</p>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>
                    Only{" "}
                    <span className="font-medium text-red-600">
                      {q.correct_percentage.toFixed(0)}%
                    </span>{" "}
                    correct
                  </span>
                  {q.common_wrong_answer && (
                    <span>
                      Common wrong answer:{" "}
                      <span className="font-medium">
                        {q.common_wrong_answer}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function QuestionAnalysisChart({
  questions,
}: {
  questions: QuestionAnalysis[] | null | undefined
}) {
  if (!questions || questions.length === 0) {
    return null
  }

  const chartData = questions.map((q) => ({
    name:
      q.question_text.length > 20
        ? `${q.question_text.substring(0, 20)}...`
        : q.question_text,
    fullName: q.question_text,
    correctPercent: q.correct_percentage,
    total: q.total_responses,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Question Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer
          width="100%"
          height={Math.max(250, questions.length * 40)}
        >
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} unit="%" />
            <YAxis
              dataKey="name"
              type="category"
              width={150}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Correct"]}
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload?.fullName || label
              }
            />
            <Bar dataKey="correctPercent" name="Correct %">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getScoreColor(entry.correctPercent)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function ActivityTypeAnalysisSection({
  analysis,
}: {
  analysis: ActivityTypeAnalysis | null
}) {
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Question Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No question-level analysis available yet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Most Missed Questions */}
      <MostMissedQuestionsCard questions={analysis.most_missed} />

      {/* Question Performance Chart */}
      <QuestionAnalysisChart questions={analysis.questions} />

      {/* Word Matching Errors (for matchTheWords activity type) */}
      {analysis.word_matching_errors &&
        analysis.word_matching_errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Common Word Matching Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Word</TableHead>
                    <TableHead>Correct Match</TableHead>
                    <TableHead>Common Mistake</TableHead>
                    <TableHead className="text-right">Error Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.word_matching_errors.map((error) => (
                    <TableRow key={error.word}>
                      <TableCell className="font-medium">
                        {error.word}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {error.correct_match}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {error.common_incorrect_match}
                      </TableCell>
                      <TableCell className="text-right">
                        {error.error_count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      {/* Word Search Analysis */}
      {analysis.word_search && analysis.word_search.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Word Search Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Word</TableHead>
                  <TableHead className="text-right">Find Rate</TableHead>
                  <TableHead className="text-right">Found</TableHead>
                  <TableHead className="text-right">Total Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.word_search.map((word) => (
                  <TableRow key={word.word}>
                    <TableCell className="font-medium">{word.word}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          word.find_rate >= 80
                            ? "default"
                            : word.find_rate >= 60
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {word.find_rate.toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {word.found_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {word.total_attempts}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StudentResultsTable({
  students,
  assignmentId,
  assignmentName,
  activityType,
  initialGradeStudentId,
  openGrade,
}: {
  students: StudentResultItem[]
  assignmentId: string
  assignmentName: string
  activityType: string
  initialGradeStudentId?: string
  openGrade?: boolean
}) {
  // If openGrade is true but no specific student, pick the first completed student with no score
  const autoGradeStudentId = initialGradeStudentId ??
    (openGrade
      ? students.find((s) => s.status === "completed" && s.score == null)?.student_id
      : undefined)

  const [statusFilter, setStatusFilter] = useState<StudentStatus>("all")
  const [sortBy, setSortBy] = useState<SortBy>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    autoGradeStudentId ?? null,
  )
  const [feedbackStudent, setFeedbackStudent] = useState<{
    id: string
    name: string
    score: number | null
  } | null>(null)

  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students.filter((student) => {
      if (statusFilter === "all") return true
      return student.status === statusFilter
    })

    filtered = filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "score":
          comparison = (a.score || 0) - (b.score || 0)
          break
        case "time":
          comparison = a.time_spent_minutes - b.time_spent_minutes
          break
        case "completion":
          if (!a.completed_at) return 1
          if (!b.completed_at) return -1
          comparison =
            new Date(a.completed_at).getTime() -
            new Date(b.completed_at).getTime()
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return filtered
  }, [students, statusFilter, sortBy, sortDirection])

  const handleSort = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortBy(newSortBy)
      setSortDirection("asc")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case "in_progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
        )
      case "not_started":
        return <Badge className="bg-blue-100 text-blue-800">Not Started</Badge>
      default:
        return null
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>Student Results</CardTitle>
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StudentStatus)
                }
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Filter by status"
              >
                <option value="all">All Students</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing {filteredAndSortedStudents.length} of {students.length}{" "}
            students
          </p>
        </CardHeader>
        <CardContent>
          {filteredAndSortedStudents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No students found matching your filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("name")}
                    >
                      Student Name{" "}
                      {sortBy === "name" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted text-right"
                      onClick={() => handleSort("score")}
                    >
                      Score{" "}
                      {sortBy === "score" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted text-right"
                      onClick={() => handleSort("time")}
                    >
                      Time Spent{" "}
                      {sortBy === "time" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => handleSort("completion")}
                    >
                      Completed At{" "}
                      {sortBy === "completion" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedStudents.map((student) => (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/teacher/analytics/$studentId"
                          params={{ studentId: student.student_id }}
                          className="hover:underline text-teal-600"
                        >
                          {student.name}
                        </Link>
                      </TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell className="text-right">
                        {student.score !== null ? (
                          <span
                            className={`font-semibold ${
                              student.score >= 80
                                ? "text-green-600"
                                : student.score >= 60
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {student.score}%
                          </span>
                        ) : student.status === "completed" &&
                          (activityType === "writing_free_response" ||
                            activityType === "speaking_open_response") ? (
                          <Badge
                            variant="outline"
                            className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400 text-xs"
                          >
                            Waiting for Review
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          // Use time_spent_seconds for precise display
                          const totalSeconds =
                            student.time_spent_seconds ||
                            student.time_spent_minutes * 60 ||
                            0

                          if (student.status !== "completed") {
                            return (
                              <span className="text-muted-foreground">—</span>
                            )
                          }

                          if (totalSeconds === 0) {
                            return (
                              <span className="text-muted-foreground">
                                {"< 1 sec"}
                              </span>
                            )
                          }

                          const minutes = Math.floor(totalSeconds / 60)
                          const seconds = totalSeconds % 60

                          if (minutes === 0) {
                            return <span>{seconds} sec</span>
                          }

                          return (
                            <span>
                              {minutes} min {seconds} sec
                            </span>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        {student.completed_at ? (
                          <div>
                            {new Date(
                              student.completed_at,
                            ).toLocaleDateString()}
                            <div className="text-xs text-muted-foreground">
                              {new Date(
                                student.completed_at,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-teal-600"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              console.log(
                                "[ViewDetails] Button clicked for student:",
                                student.student_id,
                              )
                              setSelectedStudentId(student.student_id)
                            }}
                            disabled={student.status === "not_started"}
                          >
                            {student.status === "completed" &&
                            student.score === null &&
                            (activityType === "writing_free_response" ||
                              activityType === "speaking_open_response") ? (
                              <>
                                <ClipboardCheck className="h-4 w-4 mr-1" />
                                Grade
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant={
                              student.has_feedback ? "secondary" : "outline"
                            }
                            size="sm"
                            className={
                              student.has_feedback ? "text-green-600" : ""
                            }
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setFeedbackStudent({
                                id: student.student_id,
                                name: student.name,
                                score: student.score,
                              })
                            }}
                            disabled={student.status === "not_started"}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {student.has_feedback
                              ? "Edit Feedback"
                              : "Feedback"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Answers Dialog */}
      <StudentAnswersDialog
        assignmentId={assignmentId}
        studentId={selectedStudentId}
        activityType={activityType}
        onClose={() => setSelectedStudentId(null)}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={!!feedbackStudent}
        onClose={() => setFeedbackStudent(null)}
        assignmentId={assignmentId}
        studentId={feedbackStudent?.id || ""}
        studentName={feedbackStudent?.name || ""}
        assignmentName={assignmentName}
        score={feedbackStudent?.score}
      />
    </>
  )
}

function StudentAnswersDialog({
  assignmentId,
  studentId,
  activityType,
  onClose,
}: {
  assignmentId: string
  studentId: string | null
  activityType: string
  onClose: () => void
}) {
  const { answers, isLoading } = useStudentAnswers({
    assignmentId,
    studentId: studentId || "",
  })

  if (!studentId) {
    return null
  }

  return (
    <Dialog open={!!studentId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? "Loading..." : `${answers?.name}'s Answers`}
          </DialogTitle>
          <DialogDescription>
            View the student's submitted answers and performance details.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
            <p className="text-muted-foreground mt-4">
              Loading student answers...
            </p>
          </div>
        ) : answers ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <p className="font-medium capitalize">{answers.status}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Score</span>
                <p className="font-medium">
                  {answers.score !== null ? `${answers.score}%` : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  Time Spent
                </span>
                <p className="font-medium">
                  {(() => {
                    // Use time_spent_seconds for precise display
                    const totalSeconds =
                      answers.time_spent_seconds ||
                      answers.time_spent_minutes * 60 ||
                      0

                    if (totalSeconds === 0) {
                      return "< 1 sec"
                    }

                    const minutes = Math.floor(totalSeconds / 60)
                    const seconds = totalSeconds % 60

                    if (minutes === 0) {
                      return `${seconds} sec`
                    }

                    return `${minutes} min ${seconds} sec`
                  })()}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Completed</span>
                <p className="font-medium">
                  {answers.completed_at
                    ? new Date(answers.completed_at).toLocaleString()
                    : "Not completed"}
                </p>
              </div>
            </div>

            {answers.answers_json && (
              <div>
                <h4 className="font-medium mb-2">Detailed Answer Review</h4>
                {(() => {
                  // Try to parse and show detailed results for supported activity types
                  const responseActivityType =
                    answers.activity_type || activityType
                  const configJson = answers.config_json

                  if (configJson && answers.answers_json) {
                    // AI Quiz
                    if (responseActivityType === "ai_quiz") {
                      const parsedResult = parseAIQuizResult(
                        configJson,
                        answers.answers_json,
                        answers.score || 0,
                      )
                      if (parsedResult) {
                        return (
                          <AIQuizResults result={parsedResult} hideSummary />
                        )
                      }
                    }

                    // Vocabulary Quiz
                    if (responseActivityType === "vocabulary_quiz") {
                      const parsedResult = parseVocabularyQuizResult(
                        configJson,
                        answers.answers_json,
                        answers.score || 0,
                      )
                      if (parsedResult) {
                        return (
                          <VocabularyQuizResults
                            result={parsedResult}
                            hideSummary
                          />
                        )
                      }
                    }

                    // Reading Comprehension
                    if (responseActivityType === "reading_comprehension") {
                      const parsedResult = parseReadingComprehensionResult(
                        configJson,
                        answers.answers_json,
                        answers.score || 0,
                      )
                      if (parsedResult) {
                        return (
                          <ReadingComprehensionResults
                            result={parsedResult}
                            hideSummary
                          />
                        )
                      }
                    }

                    // Sentence Builder
                    if (responseActivityType === "sentence_builder") {
                      const parsedResult = parseSentenceBuilderResult(
                        configJson,
                        answers.answers_json,
                        answers.score || 0,
                      )
                      if (parsedResult) {
                        return (
                          <SentenceBuilderResults
                            result={parsedResult}
                            hideSummary
                          />
                        )
                      }
                    }

                    // Word Builder
                    if (responseActivityType === "word_builder") {
                      const parsedResult = parseWordBuilderResult(
                        configJson,
                        answers.answers_json,
                        answers.score || 0,
                      )
                      if (parsedResult) {
                        return (
                          <WordBuilderResults
                            result={parsedResult}
                            hideSummary
                          />
                        )
                      }
                    }

                    // Writing Free Response
                    if (responseActivityType === "writing_free_response") {
                      const parsedResult = parseFreeResponseResult(
                        configJson,
                        answers.answers_json,
                      )
                      if (parsedResult) {
                        return (
                          <WritingFreeResponseResults
                            result={parsedResult}
                            hideSummary
                            score={answers.score}
                          />
                        )
                      }
                    }

                    // Speaking Open Response
                    if (responseActivityType === "speaking_open_response") {
                      const parsedResult = parseFreeResponseResult(
                        configJson,
                        answers.answers_json,
                      )
                      if (parsedResult) {
                        return (
                          <SpeakingOpenResponseResults
                            result={parsedResult}
                            hideSummary
                            score={answers.score}
                          />
                        )
                      }
                    }
                  }

                  // Fallback: show raw JSON for unsupported types or missing config
                  return (
                    <div className="bg-muted rounded-lg p-4">
                      <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(answers.answers_json, null, 2)}
                      </pre>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Teacher Grading Panel for writing/speaking activities */}
            {(() => {
              const responseActivityType =
                answers.activity_type || activityType
              if (
                responseActivityType === "writing_free_response" ||
                responseActivityType === "speaking_open_response"
              ) {
                return (
                  <>
                    <GradingPanel
                      assignmentId={assignmentId}
                      studentId={studentId!}
                      currentScore={answers.score}
                      rubricHints={answers.rubric_hints}
                      onScoreSaved={() => {}}
                    />
                    <InlineFeedback
                      assignmentId={assignmentId}
                      studentId={studentId!}
                    />
                  </>
                )
              }
              return null
            })()}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Unable to load student answers.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AssignmentDetailContent() {
  const { assignmentId } = Route.useParams()
  const { gradeStudentId, tab, openGrade } = Route.useSearch()
  const [activeTab, setActiveTab] = useState(
    gradeStudentId || openGrade ? "students" : tab === "students" ? "students" : "results"
  )

  // Fetch assignment results from API
  const { results, isLoading, error } = useAssignmentResults({
    assignmentId,
  })

  // Fetch multi-activity analytics to check if this is a multi-activity assignment
  const { data: analytics } = useAssignmentAnalytics(assignmentId)
  const isMultiActivity = analytics && analytics.activities.length > 1

  // Story 9.7: Test mode functionality
  const {
    previewAssignment,
    isLoading: isLoadingPreview,
    isTestModeActive,
    testKey,
    startTestMode,
    exitTestMode,
    retryTestMode,
  } = useQuickAssignmentTest()

  // Handle test mode start
  const handleStartTestMode = useCallback(() => {
    startTestMode(assignmentId)
  }, [assignmentId, startTestMode])

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
          <p className="text-muted-foreground mt-4">
            Loading assignment results...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !results) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link to="/teacher/assignments">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assignments
          </Button>
        </Link>
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Error Loading Assignment</h2>
          <p className="text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Unable to load assignment details. Please try again later."}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/teacher/assignments">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assignments
        </Button>
      </Link>

      {/* Assignment Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {results.assignment_name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Badge variant="outline">{results.activity_type}</Badge>
                {results.due_date && (
                  <>
                    <span>•</span>
                    <span>
                      Due: {new Date(results.due_date).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Story 9.7: Preview Assignment button (not for AI content) */}
              {![
                "ai_quiz",
                "vocabulary_quiz",
                "reading_comprehension",
                "sentence_builder",
                "word_builder",
                "vocabulary_matching",
              ].includes(results.activity_type) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartTestMode}
                  disabled={isLoadingPreview}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isLoadingPreview ? "Loading..." : "Preview"}
                </Button>
              )}
              <Badge className="bg-teal-100 text-teal-800">
                {results.completion_overview.total > 0
                  ? (
                      (results.completion_overview.completed /
                        results.completion_overview.total) *
                      100
                    ).toFixed(0)
                  : 0}
                % Complete
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Story 9.7: Test Mode Player */}
      {isTestModeActive && previewAssignment && (
        <TestModePlayer
          key={testKey}
          assignment={previewAssignment}
          onExit={exitTestMode}
          onRetry={retryTestMode}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className={`grid w-full ${isMultiActivity ? "grid-cols-3" : "grid-cols-2"} max-w-md`}
        >
          <TabsTrigger value="results" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
          {isMultiActivity && (
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Activities
            </TabsTrigger>
          )}
        </TabsList>

        {/* Results Tab */}
        <TabsContent value="results" className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CompletionOverviewCard overview={results.completion_overview} />
            <ScoreStatisticsCard stats={results.score_statistics} />
          </div>

          {/* Question Analysis */}
          <ActivityTypeAnalysisSection analysis={results.question_analysis} />
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="mt-6">
          <StudentResultsTable
            students={results.student_results}
            assignmentId={assignmentId}
            assignmentName={results.assignment_name}
            activityType={results.activity_type}
            initialGradeStudentId={gradeStudentId}
            openGrade={openGrade}
          />
        </TabsContent>

        {/* Activities Tab - Multi-Activity Assignments Only */}
        {isMultiActivity && (
          <TabsContent value="activities" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Activity-Level Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MultiActivityAnalyticsTable assignmentId={assignmentId} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
