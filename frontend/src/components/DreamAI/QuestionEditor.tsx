/**
 * Question Editor Component (Story 27.19)
 *
 * Inline editor for AI-generated quiz questions.
 * Allows editing question text, options, correct answer, and explanation.
 */

import { Check } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

import { RegenerateButton } from "./RegenerateButton"

export interface QuestionData {
  question_id: string
  question_text: string
  options: string[]
  correct_answer: string
  correct_index: number
  explanation?: string | null
  source_module_id?: number
  difficulty?: string
}

export interface QuestionEditorProps {
  question: QuestionData
  questionNumber: number
  onUpdate: (updates: Partial<QuestionData>) => void
  onDelete: () => void
  onRegenerate: () => void
  isRegenerating?: boolean
  showActions?: boolean
}

export function QuestionEditor({
  question,
  questionNumber,
  onUpdate,
  onDelete,
  onRegenerate,
  isRegenerating = false,
  showActions = true,
}: QuestionEditorProps) {
  const [isEditingQuestion, setIsEditingQuestion] = useState(false)
  const [isEditingOptions, setIsEditingOptions] = useState<number | null>(null)
  const [isEditingExplanation, setIsEditingExplanation] = useState(false)

  const [tempQuestionText, setTempQuestionText] = useState(
    question.question_text,
  )
  const [tempOptions, setTempOptions] = useState([...question.options])
  const [tempExplanation, setTempExplanation] = useState(
    question.explanation || "",
  )

  const handleQuestionBlur = () => {
    if (tempQuestionText !== question.question_text) {
      onUpdate({ question_text: tempQuestionText })
    }
    setIsEditingQuestion(false)
  }

  const handleOptionBlur = (index: number) => {
    if (tempOptions[index] !== question.options[index]) {
      onUpdate({ options: tempOptions })
      // If this was the correct option, update correct_answer
      if (index === question.correct_index) {
        onUpdate({
          options: tempOptions,
          correct_answer: tempOptions[index],
        })
      }
    }
    setIsEditingOptions(null)
  }

  const handleCorrectAnswerChange = (index: number) => {
    onUpdate({
      correct_index: index,
      correct_answer: question.options[index],
    })
  }

  const handleExplanationBlur = () => {
    if (tempExplanation !== (question.explanation || "")) {
      onUpdate({ explanation: tempExplanation })
    }
    setIsEditingExplanation(false)
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Question {questionNumber}</h3>
          {showActions && (
            <div className="flex gap-2">
              <RegenerateButton
                onClick={onRegenerate}
                isLoading={isRegenerating}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-destructive hover:text-destructive"
                aria-label="Delete question"
              >
                🗑️
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Question Text */}
        <div className="space-y-2">
          <Label htmlFor={`question-${question.question_id}`}>Question:</Label>
          {isEditingQuestion ? (
            <Textarea
              id={`question-${question.question_id}`}
              value={tempQuestionText}
              onChange={(e) => setTempQuestionText(e.target.value)}
              onBlur={handleQuestionBlur}
              className="min-h-[80px]"
              autoFocus
            />
          ) : (
            <div
              onClick={() => setIsEditingQuestion(true)}
              className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 cursor-text hover:border-ring transition-colors"
            >
              {question.question_text}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3">
          <Label>Options:</Label>
          <RadioGroup
            value={question.correct_index.toString()}
            onValueChange={(value) => handleCorrectAnswerChange(Number(value))}
          >
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center gap-3">
                <RadioGroupItem
                  value={index.toString()}
                  id={`option-${question.question_id}-${index}`}
                />
                <div className="flex-1">
                  {isEditingOptions === index ? (
                    <Textarea
                      value={tempOptions[index]}
                      onChange={(e) => {
                        const newOptions = [...tempOptions]
                        newOptions[index] = e.target.value
                        setTempOptions(newOptions)
                      }}
                      onBlur={() => handleOptionBlur(index)}
                      className="min-h-[60px]"
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => setIsEditingOptions(index)}
                      className="min-h-[60px] rounded-md border border-input bg-background px-3 py-2 cursor-text hover:border-ring transition-colors flex items-center justify-between"
                    >
                      <span>
                        {String.fromCharCode(65 + index)}) {option}
                      </span>
                      {index === question.correct_index && (
                        <span className="text-green-600 font-semibold flex items-center gap-1">
                          <Check className="h-4 w-4" /> Correct
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Explanation */}
        {(question.explanation || isEditingExplanation) && (
          <div className="space-y-2">
            <Label htmlFor={`explanation-${question.question_id}`}>
              Explanation:
            </Label>
            {isEditingExplanation ? (
              <Textarea
                id={`explanation-${question.question_id}`}
                value={tempExplanation}
                onChange={(e) => setTempExplanation(e.target.value)}
                onBlur={handleExplanationBlur}
                className="min-h-[80px]"
                autoFocus
              />
            ) : (
              <div
                onClick={() => setIsEditingExplanation(true)}
                className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 cursor-text hover:border-ring transition-colors"
              >
                {question.explanation || "Click to add explanation"}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
