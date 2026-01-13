/**
 * ReadingComprehensionForm - Configuration form for generating reading comprehension activities
 * Story 27.10: Reading Comprehension Generation
 *
 * Allows teachers to configure activity parameters: book, module, question types, difficulty.
 */

import {
  BookOpen,
  CheckSquare,
  Clock,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react"
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
import { cn } from "@/lib/utils"
import { booksApi } from "@/services/booksApi"
import type { Book, BookStructureResponse } from "@/types/book"
import type {
  ReadingComprehensionRequest,
  ReadingDifficulty,
  ReadingQuestionType,
} from "@/types/reading-comprehension"
import {
  getDifficultyLabel,
  getQuestionTypeLabel,
  READING_DEFAULT_QUESTIONS,
  READING_DIFFICULTIES,
  READING_MAX_QUESTIONS,
  READING_MIN_QUESTIONS,
  READING_QUESTION_TYPES,
} from "@/types/reading-comprehension"

interface ReadingComprehensionFormProps {
  /** Callback when activity generation is requested */
  onGenerate: (request: ReadingComprehensionRequest) => void
  /** Whether generation is in progress */
  isGenerating?: boolean
  /** Error message to display */
  error?: string | null
}

export function ReadingComprehensionForm({
  onGenerate,
  isGenerating = false,
  error = null,
}: ReadingComprehensionFormProps) {
  // Books data
  const [books, setBooks] = useState<Book[]>([])
  const [loadingBooks, setLoadingBooks] = useState(true)

  // Selected book and its structure
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null)
  const [bookStructure, setBookStructure] =
    useState<BookStructureResponse | null>(null)
  const [loadingStructure, setLoadingStructure] = useState(false)

  // Form state
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  const [questionTypes, setQuestionTypes] = useState<Set<ReadingQuestionType>>(
    new Set(["mcq", "true_false", "short_answer"]),
  )
  const [difficulty, setDifficulty] = useState<ReadingDifficulty>("auto")
  const [questionCount, setQuestionCount] = useState(READING_DEFAULT_QUESTIONS)

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
        setSelectedModuleId(null)
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

  // Handle module selection
  const handleModuleChange = useCallback((value: string) => {
    setSelectedModuleId(parseInt(value, 10))
  }, [])

  // Handle question type toggle
  const handleQuestionTypeToggle = useCallback(
    (type: ReadingQuestionType, checked: boolean) => {
      setQuestionTypes((prev) => {
        const next = new Set(prev)
        if (checked) {
          next.add(type)
        } else {
          // Ensure at least one type is selected
          if (next.size > 1) {
            next.delete(type)
          }
        }
        return next
      })
    },
    [],
  )

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!selectedBookId || selectedModuleId === null) return

    const request: ReadingComprehensionRequest = {
      book_id: selectedBookId,
      module_id: selectedModuleId,
      question_count: questionCount,
      question_types: Array.from(questionTypes),
      difficulty,
    }

    onGenerate(request)
  }, [
    selectedBookId,
    selectedModuleId,
    questionCount,
    questionTypes,
    difficulty,
    onGenerate,
  ])

  const isFormValid =
    selectedBookId !== null &&
    selectedModuleId !== null &&
    questionTypes.size > 0

  // Estimated generation time
  const estimatedTime = Math.ceil(questionCount * 2) // ~2 seconds per question

  return (
    <Card className="mx-auto max-w-2xl shadow-lg">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50">
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="h-5 w-5 text-emerald-600" />
          Generate Reading Comprehension
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

        {/* Module selector */}
        {selectedBookId && (
          <div className="space-y-2">
            <Label htmlFor="module-select" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Select Module (Passage Source)
            </Label>
            <p className="text-xs text-muted-foreground">
              The module's text will be used as the reading passage.
            </p>
            {loadingStructure ? (
              <div className="flex h-10 items-center justify-center rounded-md border">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : bookStructure && bookStructure.modules.length > 0 ? (
              <Select onValueChange={handleModuleChange}>
                <SelectTrigger id="module-select">
                  <SelectValue placeholder="Choose a module..." />
                </SelectTrigger>
                <SelectContent>
                  {bookStructure.modules.map((module, index) => (
                    <SelectItem
                      key={module.name}
                      value={(index + 1).toString()}
                    >
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No modules found for this book.
              </p>
            )}
          </div>
        )}

        {/* Question types */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Question Types
          </Label>
          <p className="text-xs text-muted-foreground">
            Select which types of questions to include.
          </p>
          <div className="flex flex-wrap gap-3">
            {READING_QUESTION_TYPES.map((type) => (
              <div
                key={type}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-3 transition-all",
                  questionTypes.has(type)
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "hover:border-gray-400",
                )}
              >
                <Checkbox
                  id={`type-${type}`}
                  checked={questionTypes.has(type)}
                  onCheckedChange={(checked) =>
                    handleQuestionTypeToggle(type, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`type-${type}`}
                  className="cursor-pointer text-sm"
                >
                  {getQuestionTypeLabel(type)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty selector */}
        <div className="space-y-3">
          <Label>Difficulty Level</Label>
          <RadioGroup
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as ReadingDifficulty)}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {READING_DIFFICULTIES.map((level) => (
              <div
                key={level}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 transition-all",
                  difficulty === level
                    ? level === "auto"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : level === "easy"
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
                    "cursor-pointer text-sm font-medium",
                    level === "auto" && "text-indigo-700 dark:text-indigo-300",
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
            {difficulty === "auto"
              ? "Difficulty will be based on the module's CEFR level."
              : difficulty === "easy"
                ? "Questions focus on explicit information in the passage."
                : difficulty === "medium"
                  ? "Questions require inference and understanding relationships."
                  : "Questions require analysis and critical thinking."}
          </p>
        </div>

        {/* Question count slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Number of Questions</Label>
            <span className="text-sm font-medium text-emerald-600">
              {questionCount}
            </span>
          </div>
          <Slider
            value={[questionCount]}
            onValueChange={(v) => setQuestionCount(v[0])}
            min={READING_MIN_QUESTIONS}
            max={READING_MAX_QUESTIONS}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{READING_MIN_QUESTIONS}</span>
            <span>{READING_MAX_QUESTIONS}</span>
          </div>
        </div>

        {/* Estimated time */}
        {isFormValid && (
          <div className="flex items-center gap-2 rounded-md bg-gray-50 p-3 text-sm text-muted-foreground dark:bg-neutral-800/50">
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
              Generating Activity...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Reading Activity
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export default ReadingComprehensionForm
