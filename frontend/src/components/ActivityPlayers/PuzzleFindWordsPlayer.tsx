/**
 * PuzzleFindWordsPlayer - Word search puzzle
 * Story 2.5 - Phase 5, Tasks 5.1-5.6
 */

import { useEffect, useMemo, useRef, useState } from "react"
import type { PuzzleFindWordsActivity } from "@/lib/mockData"
import { generateWordSearch } from "@/lib/wordSearchGenerator"

interface PuzzleFindWordsPlayerProps {
  activity: PuzzleFindWordsActivity
  onAnswersChange: (answers: Set<string>) => void
  showResults?: boolean
  assignmentId?: string
  initialAnswers?: Set<string>
  // Story 9.7: Show correct answers in preview mode
  showCorrectAnswers?: boolean
}

export function PuzzleFindWordsPlayer({
  activity,
  onAnswersChange,
  showResults = false,
  assignmentId = "default",
  initialAnswers,
  showCorrectAnswers = false,
}: PuzzleFindWordsPlayerProps) {
  // Create stable seed from activity and assignment
  const stableSeed = useMemo(() => {
    // Create a consistent seed based on the words (sorted) and assignmentId
    const wordsKey = [...activity.words].sort().join("-")
    return `${assignmentId}-${wordsKey}`
  }, [activity.words, assignmentId])

  // Generate grid (memoized for consistency)
  const { grid, placements, size } = useMemo(
    () => generateWordSearch(activity.words, stableSeed),
    [stableSeed, activity.words],
  )

  const [foundWords, setFoundWords] = useState<Set<string>>(
    initialAnswers || new Set(),
  )
  const [selection, setSelection] = useState<
    Array<{ row: number; col: number }>
  >([])
  const [isSelecting, setIsSelecting] = useState(false)

  // Keyboard navigation state
  const [_focusedCell, setFocusedCell] = useState<{
    row: number
    col: number
  } | null>(null)
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
    // Story 9.7: When showing correct answers, use a consistent index based on all words
    if (showCorrectAnswers) {
      const allWords = Array.from(
        new Set([...activity.words.map((w) => w.toUpperCase())]),
      )
      const index = allWords.indexOf(word)
      return index >= 0 ? wordColors[index % wordColors.length] : wordColors[0]
    }
    const index = Array.from(foundWords).indexOf(word)
    return wordColors[index % wordColors.length]
  }

  // Check if cell is part of a found word
  const getCellColor = (row: number, col: number): string | null => {
    for (const placement of placements) {
      // Story 9.7: Show all words when showCorrectAnswers is true
      if (foundWords.has(placement.word) || showCorrectAnswers) {
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
    if (showResults || showCorrectAnswers) return

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
    if (showResults || showCorrectAnswers) return
    setIsSelecting(true)
    setSelection([{ row, col }])
  }

  // Handle mouse enter (extend or deselect)
  const handleMouseEnter = (row: number, col: number) => {
    if (!isSelecting || showResults || showCorrectAnswers) return

    const existingIndex = selection.findIndex(
      (cell) => cell.row === row && cell.col === col,
    )

    // If going back over a previously selected cell, remove it and all after it
    if (existingIndex !== -1 && existingIndex < selection.length - 1) {
      setSelection(selection.slice(0, existingIndex + 1))
    }
    // If new cell, add it to selection
    else if (existingIndex === -1) {
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
  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    row: number,
    col: number,
  ) => {
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
    <div className="flex min-h-[600px] items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-8 items-center justify-center min-h-[500px]">
          {/* Grid - Centered */}
          <div className="flex flex-col items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6">
              <table
                className="border-separate border-spacing-1"
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                aria-label="Word search puzzle grid"
              >
                <tbody>
                  {grid.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((letter, colIndex) => {
                        const cellColor = getCellColor(rowIndex, colIndex)
                        const inSelection = isInSelection(rowIndex, colIndex)

                        const cellKey = `${rowIndex}-${colIndex}`

                        return (
                          <td
                            key={cellKey}
                            ref={(el) => {
                              if (el) cellRefs.current.set(cellKey, el)
                              else cellRefs.current.delete(cellKey)
                            }}
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                            onMouseDown={() =>
                              handleMouseDown(rowIndex, colIndex)
                            }
                            onMouseEnter={() =>
                              handleMouseEnter(rowIndex, colIndex)
                            }
                            onKeyDown={(e) =>
                              handleCellKeyDown(e, rowIndex, colIndex)
                            }
                            tabIndex={!showResults ? 0 : -1}
                            aria-label={`Cell ${letter} at row ${rowIndex + 1}, column ${colIndex + 1}`}
                            className={`
                              h-10 w-10 cursor-pointer text-center text-base font-bold transition-all duration-150 rounded-lg border-2
                              md:h-12 md:w-12 md:text-lg select-none
                              ${cellColor || (inSelection ? "bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600" : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600")}
                              ${inSelection ? "scale-105 shadow-lg" : "hover:scale-105 hover:shadow-md"}
                              ${!cellColor && !inSelection ? "hover:bg-gray-100 dark:hover:bg-gray-600" : ""}
                            `}
                            style={{
                              userSelect: "none",
                            }}
                          >
                            {letter}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Word List - Modern Card */}
          <div className="w-full lg:w-80">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sticky top-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Words to Find
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Progress
                  </span>
                  <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                    {foundWords.size} / {activity.words.length}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500"
                    style={{
                      width: `${(foundWords.size / activity.words.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {activity.words.map((word, index) => {
                  const found = foundWords.has(word.toUpperCase())

                  return (
                    <div
                      key={index}
                      className={`
                        flex items-center gap-3 rounded-xl p-3 transition-all duration-300 transform
                        ${
                          found
                            ? `${getWordColor(word.toUpperCase())} border-2 border-transparent shadow-md scale-105`
                            : "border-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"
                        }
                      `}
                    >
                      <div
                        className={`
                          flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-all
                          ${
                            found
                              ? "bg-green-500 text-white scale-110"
                              : "border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                          }
                        `}
                      >
                        {found ? "✓" : index + 1}
                      </div>
                      <span
                        className={`
                          font-semibold text-base
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
        </div>
      </div>
    </div>
  )
}
