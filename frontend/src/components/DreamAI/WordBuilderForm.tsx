/**
 * WordBuilderForm - Configuration form for generating word builder activities
 * Story 27.14: Word Builder (Spelling Activity)
 *
 * Allows teachers to configure word builder parameters: book, modules, word count, hint type.
 */

import { BookOpen, Lightbulb, Loader2, Sparkles, Volume2 } from "lucide-react"
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
import { booksApi } from "@/services/booksApi"
import type { Book, BookStructureResponse } from "@/types/book"
import type {
  HintType,
  WordBuilderRequest,
  WordCount,
} from "@/types/word-builder"
import {
  HINT_TYPE_DESCRIPTIONS,
  HINT_TYPE_LABELS,
  HINT_TYPES,
  WORD_COUNT_OPTIONS,
} from "@/types/word-builder"

// CEFR levels for filtering
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const

interface WordBuilderFormProps {
  /** Callback when activity generation is requested */
  onGenerate: (request: WordBuilderRequest) => void
  /** Whether generation is in progress */
  isGenerating?: boolean
  /** Error message to display */
  error?: string | null
}

export function WordBuilderForm({
  onGenerate,
  isGenerating = false,
  error = null,
}: WordBuilderFormProps) {
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
  const [hintType, setHintType] = useState<HintType>("both")
  const [wordCount, setWordCount] = useState<WordCount>(10)
  const [selectedCefrLevels, setSelectedCefrLevels] = useState<Set<string>>(
    new Set(),
  )
  const [allLevelsSelected, setAllLevelsSelected] = useState(true)

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

  // Handle all CEFR levels toggle
  const handleAllLevelsToggle = useCallback((checked: boolean) => {
    setAllLevelsSelected(checked)
    if (checked) {
      setSelectedCefrLevels(new Set())
    }
  }, [])

  // Handle individual CEFR level toggle
  const handleCefrToggle = useCallback((level: string, checked: boolean) => {
    setSelectedCefrLevels((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(level)
      } else {
        next.delete(level)
      }
      return next
    })
    if (checked) {
      setAllLevelsSelected(false)
    }
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

    // Get CEFR levels
    const cefrLevels: string[] | undefined =
      allLevelsSelected || selectedCefrLevels.size === 0
        ? undefined
        : Array.from(selectedCefrLevels)

    const request: WordBuilderRequest = {
      book_id: selectedBookId,
      module_ids: moduleIds,
      word_count: wordCount,
      cefr_levels: cefrLevels,
      hint_type: hintType,
    }

    onGenerate(request)
  }, [
    selectedBookId,
    allModulesSelected,
    selectedModules,
    bookStructure,
    wordCount,
    allLevelsSelected,
    selectedCefrLevels,
    hintType,
    onGenerate,
  ])

  const isFormValid = selectedBookId !== null

  return (
    <Card className="mx-auto max-w-2xl shadow-lg">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-amber-600" />
          Generate Word Builder
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

        {/* CEFR Level selection */}
        <div className="space-y-3">
          <Label>CEFR Levels (Optional Filter)</Label>
          <div className="space-y-2">
            {/* All levels toggle */}
            <div className="flex items-center gap-2 rounded-md border p-3">
              <Checkbox
                id="all-levels"
                checked={allLevelsSelected}
                onCheckedChange={handleAllLevelsToggle}
              />
              <Label
                htmlFor="all-levels"
                className="cursor-pointer font-medium"
              >
                All Levels
              </Label>
            </div>

            {/* Individual levels */}
            {!allLevelsSelected && (
              <div className="flex flex-wrap gap-2">
                {CEFR_LEVELS.map((level) => (
                  <div
                    key={level}
                    className="flex items-center gap-2 rounded-md border px-3 py-2"
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
            )}
          </div>
        </div>

        {/* Hint type selector */}
        <div className="space-y-3">
          <Label>Hint Type</Label>
          <RadioGroup
            value={hintType}
            onValueChange={(v) => setHintType(v as HintType)}
            className="space-y-2"
          >
            {HINT_TYPES.map((type) => (
              <div
                key={type}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  hintType === type
                    ? "border-amber-500 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/50"
                    : "hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                onClick={() => setHintType(type)}
              >
                <RadioGroupItem
                  value={type}
                  id={`hint-${type}`}
                  className="mt-0.5"
                />
                <div className="flex items-start gap-2">
                  {type === "definition" && (
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                  )}
                  {type === "audio" && (
                    <Volume2 className="h-4 w-4 text-blue-500" />
                  )}
                  {type === "both" && (
                    <div className="flex gap-1">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <Volume2 className="h-4 w-4 text-blue-500" />
                    </div>
                  )}
                  <div>
                    <Label
                      htmlFor={`hint-${type}`}
                      className="cursor-pointer font-medium"
                    >
                      {HINT_TYPE_LABELS[type]}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {HINT_TYPE_DESCRIPTIONS[type]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Word count selector */}
        <div className="space-y-2">
          <Label htmlFor="word-count">Number of Words</Label>
          <Select
            value={wordCount.toString()}
            onValueChange={(v) => setWordCount(parseInt(v, 10) as WordCount)}
          >
            <SelectTrigger id="word-count">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORD_COUNT_OPTIONS.map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  {count} word{count > 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              Generate Word Builder
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export default WordBuilderForm
