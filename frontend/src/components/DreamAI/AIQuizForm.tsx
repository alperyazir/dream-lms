/**
 * AIQuizForm - Configuration form for generating AI MCQ quizzes
 * Story 27.9: AI Quiz Generation (MCQ)
 *
 * Allows teachers to configure quiz parameters: book, modules, difficulty, question count.
 */

import { BookOpen, Brain, Clock, Loader2, Sparkles } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { booksApi } from "@/services/booksApi"
import type { AIQuizDifficulty, AIQuizGenerationRequest } from "@/types/ai-quiz"
import {
  AI_QUIZ_DEFAULT_QUESTIONS,
  AI_QUIZ_DIFFICULTIES,
  AI_QUIZ_MAX_QUESTIONS,
  AI_QUIZ_MIN_QUESTIONS,
  getDifficultyLabel,
} from "@/types/ai-quiz"
import type { Book, BookStructureResponse } from "@/types/book"

interface AIQuizFormProps {
  /** Callback when quiz generation is requested */
  onGenerate: (request: AIQuizGenerationRequest) => void
  /** Whether generation is in progress */
  isGenerating?: boolean
  /** Error message to display */
  error?: string | null
}

export function AIQuizForm({
  onGenerate,
  isGenerating = false,
  error = null,
}: AIQuizFormProps) {
  // Books data
  const [books, setBooks] = useState<Book[]>([])
  const [loadingBooks, setLoadingBooks] = useState(true)

  // Selected book and its structure
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null)
  const [bookStructure, setBookStructure] =
    useState<BookStructureResponse | null>(null)
  const [loadingStructure, setLoadingStructure] = useState(false)

  // Form state
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())
  const [allModulesSelected, setAllModulesSelected] = useState(true)
  const [difficulty, setDifficulty] = useState<AIQuizDifficulty>("medium")
  const [questionCount, setQuestionCount] = useState(AI_QUIZ_DEFAULT_QUESTIONS)
  const [includeExplanations, setIncludeExplanations] = useState(true)

  // Load books on mount
  useEffect(() => {
    async function loadBooks() {
      try {
        setLoadingBooks(true)
        const response = await booksApi.getBooks({ limit: 100 })
        setBooks(response.items)
      } catch (err) {
        console.error("Failed to load books:", err)
      } finally {
        setLoadingBooks(false)
      }
    }
    loadBooks()
  }, [])

  // Load book structure when book is selected
  useEffect(() => {
    async function loadStructure() {
      if (!selectedBookId) {
        setBookStructure(null)
        return
      }

      try {
        setLoadingStructure(true)
        const structure = await booksApi.getBookStructure(selectedBookId)
        setBookStructure(structure)
        // Reset module selection when book changes
        setSelectedModules(new Set())
        setAllModulesSelected(true)
      } catch (err) {
        console.error("Failed to load book structure:", err)
        setBookStructure(null)
      } finally {
        setLoadingStructure(false)
      }
    }
    loadStructure()
  }, [selectedBookId])

  // Handle book selection
  const handleBookChange = useCallback((value: string) => {
    setSelectedBookId(parseInt(value, 10))
  }, [])

  // Handle all modules toggle
  const handleAllModulesToggle = useCallback((checked: boolean) => {
    setAllModulesSelected(checked)
    if (checked) {
      setSelectedModules(new Set())
    }
  }, [])

  // Handle individual module toggle
  const handleModuleToggle = useCallback(
    (moduleName: string, checked: boolean) => {
      setSelectedModules((prev) => {
        const next = new Set(prev)
        if (checked) {
          next.add(moduleName)
        } else {
          next.delete(moduleName)
        }
        return next
      })
      // If modules are manually selected, uncheck "all modules"
      if (checked) {
        setAllModulesSelected(false)
      }
    },
    [],
  )

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!selectedBookId) return

    // Get module IDs from selected module names
    let moduleIds: number[]

    if (allModulesSelected || selectedModules.size === 0) {
      // Use all module IDs
      moduleIds = bookStructure?.modules.map((_, index) => index + 1) || [1]
    } else {
      moduleIds = bookStructure?.modules
        .map((m, index) => ({ name: m.name, id: index + 1 }))
        .filter((m) => selectedModules.has(m.name))
        .map((m) => m.id) || [1]
    }

    const request: AIQuizGenerationRequest = {
      book_id: selectedBookId,
      module_ids: moduleIds,
      difficulty,
      question_count: questionCount,
      include_explanations: includeExplanations,
    }

    onGenerate(request)
  }, [
    selectedBookId,
    allModulesSelected,
    selectedModules,
    bookStructure,
    difficulty,
    questionCount,
    includeExplanations,
    onGenerate,
  ])

  const isFormValid =
    selectedBookId !== null && (allModulesSelected || selectedModules.size > 0)

  // Estimated generation time (rough estimate)
  const estimatedTime = Math.ceil(questionCount * 1.5) // ~1.5 seconds per question

  return (
    <Card className="mx-auto max-w-2xl shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Brain className="h-5 w-5 text-indigo-600" />
          Generate Quiz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Book selector */}
        <div className="space-y-2">
          <Label htmlFor="book-select" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Select Book
          </Label>
          {loadingBooks ? (
            <div className="flex h-10 items-center justify-center rounded-md border">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select onValueChange={handleBookChange}>
              <SelectTrigger id="book-select">
                <SelectValue placeholder="Choose a book..." />
              </SelectTrigger>
              <SelectContent>
                {books.map((book) => (
                  <SelectItem key={book.id} value={book.id.toString()}>
                    {book.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Module selection */}
        {selectedBookId && (
          <div className="space-y-3">
            <Label>Source Modules</Label>
            <p className="text-xs text-muted-foreground">
              Select which modules to generate questions from.
            </p>
            {loadingStructure ? (
              <div className="flex h-20 items-center justify-center rounded-md border">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : bookStructure && bookStructure.modules.length > 0 ? (
              <div className="space-y-2">
                {/* All modules toggle */}
                <div className="flex items-center gap-2 rounded-md border p-3">
                  <Checkbox
                    id="all-modules"
                    checked={allModulesSelected}
                    onCheckedChange={handleAllModulesToggle}
                  />
                  <Label
                    htmlFor="all-modules"
                    className="cursor-pointer font-medium"
                  >
                    All Modules
                  </Label>
                </div>

                {/* Individual modules */}
                {!allModulesSelected && (
                  <div className="grid grid-cols-2 gap-2">
                    {bookStructure.modules.map((module) => (
                      <div
                        key={module.name}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <Checkbox
                          id={`module-${module.name}`}
                          checked={selectedModules.has(module.name)}
                          onCheckedChange={(checked) =>
                            handleModuleToggle(module.name, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`module-${module.name}`}
                          className="cursor-pointer text-sm"
                        >
                          {module.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No modules found for this book.
              </p>
            )}
          </div>
        )}

        {/* Difficulty selector */}
        <div className="space-y-3">
          <Label>Difficulty Level</Label>
          <RadioGroup
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as AIQuizDifficulty)}
            className="flex gap-3"
          >
            {AI_QUIZ_DIFFICULTIES.map((level) => (
              <div
                key={level}
                className={cn(
                  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 transition-all",
                  difficulty === level
                    ? level === "easy"
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                      : level === "medium"
                        ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
                        : "border-red-500 bg-red-50 dark:bg-red-950/30"
                    : "hover:border-gray-400",
                )}
              >
                <RadioGroupItem value={level} id={`difficulty-${level}`} />
                <Label
                  htmlFor={`difficulty-${level}`}
                  className={cn(
                    "cursor-pointer font-medium",
                    level === "easy" && "text-green-700 dark:text-green-300",
                    level === "medium" &&
                      "text-yellow-700 dark:text-yellow-300",
                    level === "hard" && "text-red-700 dark:text-red-300",
                  )}
                >
                  {getDifficultyLabel(level)}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {difficulty === "easy"
              ? "Basic recall questions with obvious distractors."
              : difficulty === "medium"
                ? "Questions requiring understanding and some inference."
                : "Complex questions requiring analysis and synthesis."}
          </p>
        </div>

        {/* Question count slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Number of Questions</Label>
            <span className="text-sm font-medium text-indigo-600">
              {questionCount}
            </span>
          </div>
          <Slider
            value={[questionCount]}
            onValueChange={(v) => setQuestionCount(v[0])}
            min={AI_QUIZ_MIN_QUESTIONS}
            max={AI_QUIZ_MAX_QUESTIONS}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{AI_QUIZ_MIN_QUESTIONS}</span>
            <span>{AI_QUIZ_MAX_QUESTIONS}</span>
          </div>
        </div>

        {/* Include explanations toggle */}
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label htmlFor="include-explanations" className="cursor-pointer">
              Include Explanations
            </Label>
            <p className="text-xs text-muted-foreground">
              Show explanations for correct answers after submission
            </p>
          </div>
          <Switch
            id="include-explanations"
            checked={includeExplanations}
            onCheckedChange={setIncludeExplanations}
          />
        </div>

        {/* Estimated time */}
        {isFormValid && (
          <div className="flex items-center gap-2 rounded-md bg-gray-50 p-3 text-sm text-muted-foreground dark:bg-gray-800/50">
            <Clock className="h-4 w-4" />
            <span>Estimated generation time: ~{estimatedTime} seconds</span>
          </div>
        )}

        {/* Generate button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!isFormValid || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Quiz...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Quiz
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export default AIQuizForm
