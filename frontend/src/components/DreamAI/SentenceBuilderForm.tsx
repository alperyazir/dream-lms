/**
 * SentenceBuilderForm - Configuration form for generating sentence builder activities
 * Story 27.13: Sentence Builder Activity (Duolingo-Style)
 *
 * Allows teachers to configure sentence builder parameters: book, modules, difficulty, count, audio.
 */

import { BookOpen, Loader2, Sparkles, Volume2 } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { booksApi } from "@/services/booksApi"
import type { Book, BookStructureResponse } from "@/types/book"
import type {
  DifficultyLevel,
  SentenceBuilderRequest,
  SentenceCount,
} from "@/types/sentence-builder"
import {
  DIFFICULTY_DESCRIPTIONS,
  DIFFICULTY_LABELS,
  DIFFICULTY_LEVELS,
  SENTENCE_COUNT_OPTIONS,
} from "@/types/sentence-builder"

interface SentenceBuilderFormProps {
  /** Callback when activity generation is requested */
  onGenerate: (request: SentenceBuilderRequest) => void
  /** Whether generation is in progress */
  isGenerating?: boolean
  /** Error message to display */
  error?: string | null
}

export function SentenceBuilderForm({
  onGenerate,
  isGenerating = false,
  error = null,
}: SentenceBuilderFormProps) {
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
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium")
  const [sentenceCount, setSentenceCount] = useState<SentenceCount>(5)
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

    const request: SentenceBuilderRequest = {
      book_id: selectedBookId,
      module_ids: moduleIds,
      sentence_count: sentenceCount,
      difficulty,
      include_audio: includeAudio,
    }

    onGenerate(request)
  }, [
    selectedBookId,
    allModulesSelected,
    selectedModules,
    bookStructure,
    sentenceCount,
    difficulty,
    includeAudio,
    onGenerate,
  ])

  const isFormValid = selectedBookId !== null

  return (
    <Card className="mx-auto max-w-2xl shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Generate Sentence Builder
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

        {/* Difficulty selector */}
        <div className="space-y-3">
          <Label>Difficulty Level</Label>
          <RadioGroup
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as DifficultyLevel)}
            className="space-y-2"
          >
            {DIFFICULTY_LEVELS.map((level) => (
              <div
                key={level}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  difficulty === level
                    ? "border-purple-500 bg-purple-50 dark:border-purple-600 dark:bg-purple-950/50"
                    : "hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                onClick={() => setDifficulty(level)}
              >
                <RadioGroupItem
                  value={level}
                  id={`difficulty-${level}`}
                  className="mt-0.5"
                />
                <div>
                  <Label
                    htmlFor={`difficulty-${level}`}
                    className="cursor-pointer font-medium"
                  >
                    {DIFFICULTY_LABELS[level]}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {DIFFICULTY_DESCRIPTIONS[level]}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Sentence count selector */}
        <div className="space-y-2">
          <Label htmlFor="sentence-count">Number of Sentences</Label>
          <Select
            value={sentenceCount.toString()}
            onValueChange={(v) =>
              setSentenceCount(parseInt(v, 10) as SentenceCount)
            }
          >
            <SelectTrigger id="sentence-count">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SENTENCE_COUNT_OPTIONS.map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  {count} sentence{count > 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Audio toggle */}
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="include-audio" className="cursor-pointer">
                Include Audio
              </Label>
              <p className="text-xs text-muted-foreground">
                Generate text-to-speech for each sentence
              </p>
            </div>
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
              Generating Activity...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Sentence Builder
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export default SentenceBuilderForm
