/**
 * Vocabulary Table Component
 * Story 27.18: Vocabulary Explorer with Audio Player
 *
 * Displays vocabulary words in a table with audio and CEFR badges.
 * Includes pagination controls.
 */

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { VocabularyWord } from "@/types/vocabulary-explorer"
import { CEFRBadge } from "./CEFRBadge"
import { WordAudioButton } from "./WordAudioButton"

export interface VocabularyTableProps {
  words: VocabularyWord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  isLoading?: boolean
}

const PAGE_SIZE_OPTIONS = [25, 50, 100]

/**
 * Vocabulary Table with Pagination
 *
 * Displays vocabulary in a responsive table format:
 * - Desktop: Full table with all columns
 * - Mobile: Card layout (responsive design)
 *
 * Features:
 * - Audio playback for each word
 * - CEFR level badges
 * - Pagination with page size selector
 */
export function VocabularyTable({
  words,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}: VocabularyTableProps) {
  const startIndex = (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, total)

  const handlePrevious = () => {
    if (page > 1) {
      onPageChange(page - 1)
    }
  }

  const handleNext = () => {
    if (page < totalPages) {
      onPageChange(page + 1)
    }
  }

  if (words.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No vocabulary words found.</p>
        <p className="text-sm mt-2">
          Try adjusting your filters or search term.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]" />
              <TableHead className="w-[150px]">Word</TableHead>
              <TableHead className="w-[150px]">Translation</TableHead>
              <TableHead>Definition</TableHead>
              <TableHead className="w-[80px]">Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading vocabulary...
                </TableCell>
              </TableRow>
            ) : (
              words.map((word) => (
                <TableRow key={word.id}>
                  <TableCell>
                    {word.has_audio ? (
                      <WordAudioButton
                        bookId={word.book_id}
                        wordId={word.id}
                        word={word.word}
                      />
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{word.word}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {word.translation}
                  </TableCell>
                  <TableCell className="text-sm">{word.definition}</TableCell>
                  <TableCell>
                    <CEFRBadge level={word.cefr_level} size="sm" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading vocabulary...
          </div>
        ) : (
          words.map((word) => (
            <div key={word.id} className="p-4 rounded-lg border space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  {word.has_audio && (
                    <WordAudioButton
                      bookId={word.book_id}
                      wordId={word.id}
                      word={word.word}
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{word.word}</h3>
                    <p className="text-sm text-muted-foreground">
                      {word.translation}
                    </p>
                  </div>
                </div>
                <CEFRBadge level={word.cefr_level} size="sm" />
              </div>

              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Definition:
                </span>
                <p className="text-sm">{word.definition}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex}-{endIndex} of {total} words
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={page === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={page >= totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
