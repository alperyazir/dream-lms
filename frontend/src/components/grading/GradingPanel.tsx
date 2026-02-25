/**
 * GradingPanel - Teacher grading UI for writing/speaking submissions
 *
 * Displays a score input with slider and save button.
 */

import { CheckCircle, ClipboardList, Lightbulb, Save } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/hooks/use-toast"
import { useTeacherGrading } from "@/hooks/useTeacherGrading"

interface GradingPanelProps {
  assignmentId: string
  studentId: string
  activityId?: string
  currentScore?: number | null
  rubricHints?: string[] | null
  onScoreSaved?: (score: number, overallScore: number | null) => void
}

export function GradingPanel({
  assignmentId,
  studentId,
  activityId,
  currentScore,
  rubricHints,
  onScoreSaved,
}: GradingPanelProps) {
  const [score, setScore] = useState<number>(currentScore ?? 0)
  const { gradeSubmission, isGrading } = useTeacherGrading({
    assignmentId,
    studentId,
  })

  const handleSliderChange = (value: number[]) => {
    setScore(value[0])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setScore(val)
    } else if (e.target.value === "") {
      setScore(0)
    }
  }

  const handleSave = async () => {
    try {
      const result = await gradeSubmission({
        score,
        activity_id: activityId,
      })
      toast({
        title: "Score saved",
        description: `Score of ${score}% has been recorded.`,
      })
      onScoreSaved?.(result.activity_score, result.overall_score)
    } catch {
      toast({
        title: "Error saving score",
        description: "Failed to save the score. Please try again.",
        variant: "destructive",
      })
    }
  }

  const scoreColor =
    score >= 80
      ? "text-green-600 dark:text-green-400"
      : score >= 60
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400"

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Teacher Grading
        </h4>
        {currentScore != null && (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
            <CheckCircle className="h-3 w-3" />
            Previously scored: {currentScore}%
          </Badge>
        )}
      </div>

      {rubricHints && rubricHints.length > 0 && (
        <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
          <span className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" />
            Rubric Criteria
          </span>
          <ul className="space-y-1 pl-5 list-disc">
            {rubricHints.map((hint, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Score (0-100)</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[score]}
            onValueChange={handleSliderChange}
            max={100}
            min={0}
            step={1}
            className="flex-1"
          />
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={handleInputChange}
              className={`w-20 text-center font-semibold ${scoreColor}`}
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={isGrading}
        className="w-full"
        size="sm"
      >
        <Save className="h-4 w-4 mr-2" />
        {isGrading ? "Saving..." : "Save Score"}
      </Button>
    </div>
  )
}
