/**
 * VocabularyQuizForm - Configuration form for generating vocabulary quizzes
 * Story 27.8: Vocabulary Quiz Generation (Definition-Based)
 *
 * Allows teachers to configure quiz parameters: book, modules, length, CEFR levels.
 */

import { BookOpen, Loader2, Sparkles } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { booksApi } from "@/services/booksApi"
import type { Book, BookStructureResponse } from "@/types/book"
import type {
  CEFRLevel,
  QuizLength,
  VocabularyQuizGenerationRequest,
} from "@/types/vocabulary-quiz"
import { CEFR_LEVELS, QUIZ_LENGTH_OPTIONS } from "@/types/vocabulary-quiz"

interface VocabularyQuizFormProps {
  /** Callback when quiz generation is requested */
  onGenerate: (request: VocabularyQuizGenerationRequest) => void
  /** Whether generation is in progress */
  isGenerating?: boolean
  /** Error message to display */
  error?: string | null
}

export function VocabularyQuizForm({
  onGenerate,
  isGenerating = false,
  error = null,
}: VocabularyQuizFormProps) {
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
  const [quizLength, setQuizLength] = useState<QuizLength>(10)
  const [selectedCefrLevels, setSelectedCefrLevels] = useState<Set<CEFRLevel>>(
    new Set(),
  )
  const [includeAudio, setIncludeAudio] = useState(true)

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

  // Handle CEFR level toggle
  const handleCefrToggle = useCallback((level: CEFRLevel, checked: boolean) => {
    setSelectedCefrLevels((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(level)
      } else {
        next.delete(level)
      }
      return next
    })
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!selectedBookId) return

    // Get module IDs from selected module names
    const moduleIds: number[] | undefined =
      allModulesSelected || selectedModules.size === 0
        ? undefined // All modules
        : bookStructure?.modules
            .filter((m) => selectedModules.has(m.name))
            .map((_, index) => index + 1) // Using 1-based index as module ID

    const request: VocabularyQuizGenerationRequest = {
      book_id: selectedBookId,
      module_ids: moduleIds,
      quiz_length: quizLength,
      cefr_levels:
        selectedCefrLevels.size > 0
          ? Array.from(selectedCefrLevels)
          : undefined,
      include_audio: includeAudio,
    }

    onGenerate(request)
  }, [
    selectedBookId,
    allModulesSelected,
    selectedModules,
    bookStructure,
    quizLength,
    selectedCefrLevels,
    includeAudio,
    onGenerate,
  ])

  const isFormValid = selectedBookId !== null

  return (
    <Card className="mx-auto max-w-2xl shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          Generate Vocabulary Quiz
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
            <Label>Modules</Label>
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

        {/* Quiz length selector */}
        <div className="space-y-2">
          <Label htmlFor="quiz-length">Quiz Length</Label>
          <Select
            value={quizLength.toString()}
            onValueChange={(v) => setQuizLength(parseInt(v, 10) as QuizLength)}
          >
            <SelectTrigger id="quiz-length">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUIZ_LENGTH_OPTIONS.map((length) => (
                <SelectItem key={length} value={length.toString()}>
                  {length} questions
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CEFR level filter */}
        <div className="space-y-2">
          <Label>CEFR Levels (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Filter vocabulary by difficulty level. Leave empty for all levels.
          </p>
          <div className="flex flex-wrap gap-2">
            {CEFR_LEVELS.map((level) => (
              <div
                key={level}
                className="flex items-center gap-1.5 rounded-md border px-3 py-1.5"
              >
                <Checkbox
                  id={`cefr-${level}`}
                  checked={selectedCefrLevels.has(level)}
                  onCheckedChange={(checked) =>
                    handleCefrToggle(level, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`cefr-${level}`}
                  className="cursor-pointer text-sm font-medium"
                >
                  {level}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Include audio toggle */}
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label htmlFor="include-audio" className="cursor-pointer">
              Include Audio
            </Label>
            <p className="text-xs text-muted-foreground">
              Add pronunciation audio for each word
            </p>
          </div>
          <Switch
            id="include-audio"
            checked={includeAudio}
            onCheckedChange={setIncludeAudio}
          />
        </div>

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

export default VocabularyQuizForm
