/**
 * PuzzleFindWordsPlayer - Word search puzzle
 * Story 2.5 - Phase 5, Tasks 5.1-5.6
 */

import { useState, useEffect, useMemo, useRef } from "react"
import type { PuzzleFindWordsActivity } from "@/lib/mockData"
import { generateWordSearch } from "@/lib/wordSearchGenerator"

interface PuzzleFindWordsPlayerProps {
  activity: PuzzleFindWordsActivity
  onAnswersChange: (answers: Set<string>) => void
  showResults?: boolean
  assignmentId?: string
  initialAnswers?: Set<string>
}

export function PuzzleFindWordsPlayer({
  activity,
  onAnswersChange,
  showResults = false,
  assignmentId = "default",
  initialAnswers,
}: PuzzleFindWordsPlayerProps) {
  // Generate grid (memoized for consistency)
  const { grid, placements, size } = useMemo(
    () => generateWordSearch(activity.words, assignmentId),
    [activity.words, assignmentId],
  )

  const [foundWords, setFoundWords] = useState<Set<string>>(
    initialAnswers || new Set()
  )
  const [selection, setSelection] = useState<Array<{ row: number; col: number }>>([])
  const [isSelecting, setIsSelecting] = useState(false)

  // Keyboard navigation state
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null)
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Word colors (unique for each found word)
  const wordColors = [
    "bg-blue-200 dark:bg-blue-800",
    "bg-green-200 dark:bg-green-800",
    "bg-yellow-200 dark:bg-yellow-800",
    "bg-pink-200 dark:bg-pink-800",
    "bg-purple-200 dark:bg-purple-800",
    "bg-orange-200 dark:bg-orange-800",
    "bg-teal-200 dark:bg-teal-800",
    "bg-red-200 dark:bg-red-800",
  ]

  // Get color for a found word
  const getWordColor = (word: string): string => {
    const index = Array.from(foundWords).indexOf(word)
    return wordColors[index % wordColors.length]
  }

  // Check if cell is part of a found word
  const getCellColor = (row: number, col: number): string | null => {
    for (const placement of placements) {
      if (foundWords.has(placement.word)) {
        const inWord = placement.cells.some(
          (cell) => cell.row === row && cell.col === col,
        )
        if (inWord) {
          return getWordColor(placement.word)
        }
      }
    }
    return null
  }

  // Check if cell is in current selection
  const isInSelection = (row: number, col: number): boolean => {
    return selection.some((cell) => cell.row === row && cell.col === col)
  }

  // Handle cell click (desktop)
  const handleCellClick = (row: number, col: number) => {
    if (showResults) return

    if (selection.length === 0) {
      // Start selection
      setSelection([{ row, col }])
    } else if (selection.length === 1) {
      // Complete selection
      setSelection([...selection, { row, col }])
      validateSelection([...selection, { row, col }])
    } else {
      // Reset selection
      setSelection([{ row, col }])
    }
  }

  // Handle mouse down (start selection)
  const handleMouseDown = (row: number, col: number) => {
    if (showResults) return
    setIsSelecting(true)
    setSelection([{ row, col }])
  }

  // Handle mouse enter (extend selection)
  const handleMouseEnter = (row: number, col: number) => {
    if (!isSelecting || showResults) return
    if (selection.length > 0 && !isInSelection(row, col)) {
      setSelection([...selection, { row, col }])
    }
  }

  // Handle mouse up (complete selection)
  const handleMouseUp = () => {
    if (!isSelecting || showResults) return
    setIsSelecting(false)
    if (selection.length > 1) {
      validateSelection(selection)
    }
  }

  // Validate selection against word placements
  const validateSelection = (cells: Array<{ row: number; col: number }>) => {
    for (const placement of placements) {
      if (foundWords.has(placement.word)) continue

      // Check if selection matches word placement
      if (cells.length === placement.cells.length) {
        const forward = cells.every(
          (cell, i) =>
            cell.row === placement.cells[i].row &&
            cell.col === placement.cells[i].col,
        )
        const backward = cells.every(
          (cell, i) =>
            cell.row === placement.cells[placement.cells.length - 1 - i].row &&
            cell.col === placement.cells[placement.cells.length - 1 - i].col,
        )

        if (forward || backward) {
          // Word found!
          const newFoundWords = new Set(foundWords)
          newFoundWords.add(placement.word)
          setFoundWords(newFoundWords)
          onAnswersChange(newFoundWords)
          setSelection([])
          return
        }
      }
    }

    // Invalid selection - flash red and clear
    setSelection([])
  }

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (!isSelecting) {
        setSelection([])
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [isSelecting])

  // Keyboard navigation: Handle arrow keys and Space/Enter
  const handleCellKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (showResults) return

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      handleCellClick(row, col)
    } else if (e.key === "Escape") {
      e.preventDefault()
      setSelection([])
      setFocusedCell(null)
    } else if (e.key === "ArrowUp" && row > 0) {
      e.preventDefault()
      const newCell = { row: row - 1, col }
      setFocusedCell(newCell)
      const cellKey = `${newCell.row}-${newCell.col}`
      cellRefs.current.get(cellKey)?.focus()
    } else if (e.key === "ArrowDown" && row < size - 1) {
      e.preventDefault()
      const newCell = { row: row + 1, col }
      setFocusedCell(newCell)
      const cellKey = `${newCell.row}-${newCell.col}`
      cellRefs.current.get(cellKey)?.focus()
    } else if (e.key === "ArrowLeft" && col > 0) {
      e.preventDefault()
      const newCell = { row, col: col - 1 }
      setFocusedCell(newCell)
      const cellKey = `${newCell.row}-${newCell.col}`
      cellRefs.current.get(cellKey)?.focus()
    } else if (e.key === "ArrowRight" && col < size - 1) {
      e.preventDefault()
      const newCell = { row, col: col + 1 }
      setFocusedCell(newCell)
      const cellKey = `${newCell.row}-${newCell.col}`
      cellRefs.current.get(cellKey)?.focus()
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:flex-row">
      {/* Left: Grid */}
      <div className="flex-1">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          {activity.headerText}
        </h2>

        <div
          className="inline-grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {grid.map((row, rowIndex) =>
            row.map((letter, colIndex) => {
              const cellColor = getCellColor(rowIndex, colIndex)
              const inSelection = isInSelection(rowIndex, colIndex)

              const cellKey = `${rowIndex}-${colIndex}`

              return (
                <div
                  key={cellKey}
                  ref={(el) => {
                    if (el) cellRefs.current.set(cellKey, el)
                    else cellRefs.current.delete(cellKey)
                  }}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                  onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                  onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                  tabIndex={!showResults ? 0 : -1}
                  className={`
                    flex h-8 w-8 cursor-pointer items-center justify-center rounded border text-sm font-bold transition-all duration-100 md:h-10 md:w-10 md:text-base
                    ${cellColor || (inSelection ? "bg-blue-100 dark:bg-blue-900" : "bg-white dark:bg-gray-800")}
                    ${inSelection ? "border-blue-500 shadow-md" : "border-gray-300 dark:border-gray-600"}
                    hover:shadow-md
                  `}
                  style={{
                    userSelect: "none",
                  }}
                >
                  {letter}
                </div>
              )
            }),
          )}
        </div>
      </div>

      {/* Right: Word List */}
      <div className="w-full lg:w-64">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          Words to Find
        </h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Found: {foundWords.size} / {activity.words.length}
        </p>

        <div className="space-y-2">
          {activity.words.map((word, index) => {
            const found = foundWords.has(word.toUpperCase())

            return (
              <div
                key={index}
                className={`
                  flex items-center gap-2 rounded-lg border-2 p-3 transition-all duration-200
                  ${found
                    ? `${getWordColor(word.toUpperCase())} border-transparent`
                    : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                  }
                `}
              >
                <div
                  className={`
                    flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold
                    ${found
                      ? "bg-green-500 text-white"
                      : "border-2 border-gray-400 text-gray-400"
                    }
                  `}
                >
                  {found ? "✓" : ""}
                </div>
                <span
                  className={`
                    font-semibold
                    ${found ? "text-gray-900 line-through dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}
                  `}
                >
                  {word}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
