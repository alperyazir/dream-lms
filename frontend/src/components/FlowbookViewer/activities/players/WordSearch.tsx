import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { ActivityReference } from "@/types/flowbook"

interface WordSearchProps {
  activity: ActivityReference
}

interface WordPlacement {
  word: string
  cells: Array<{ row: number; col: number }>
}

interface WordSearchGrid {
  grid: string[][]
  placements: WordPlacement[]
  size: number
}

class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
}

function generateWordSearch(words: string[], seed: number): WordSearchGrid {
  const rng = new SeededRandom(seed)

  // Sort words by length (longest first) to place them more easily
  const sortedWords = [...words]
    .map((w) => w.replace(/\s/g, "").toUpperCase())
    .sort((a, b) => b.length - a.length)

  const maxWordLen = Math.max(...sortedWords.map((w) => w.length))
  // Make grid larger to ensure all words fit
  const size = Math.max(
    14,
    maxWordLen + 4,
    Math.ceil(Math.sqrt(sortedWords.reduce((sum, w) => sum + w.length, 0)) * 2),
  )

  const grid: string[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(""))

  const placements: WordPlacement[] = []
  const directions = [
    { rowDelta: 0, colDelta: 1 },   // horizontal
    { rowDelta: 1, colDelta: 0 },   // vertical
    { rowDelta: 1, colDelta: 1 },   // diagonal down-right
    { rowDelta: -1, colDelta: 1 },  // diagonal up-right
    { rowDelta: 0, colDelta: -1 },  // horizontal backwards
    { rowDelta: -1, colDelta: 0 },  // vertical up
  ]

  for (const cleanWord of sortedWords) {
    let placed = false
    let attempts = 0

    // Try more attempts for longer words
    const maxAttempts = 500

    while (!placed && attempts < maxAttempts) {
      attempts++

      const dir = directions[rng.nextInt(0, directions.length - 1)]

      // Calculate valid starting positions for this word and direction
      let minRow = 0, maxRow = size - 1, minCol = 0, maxCol = size - 1

      if (dir.rowDelta > 0) maxRow = size - cleanWord.length
      if (dir.rowDelta < 0) minRow = cleanWord.length - 1
      if (dir.colDelta > 0) maxCol = size - cleanWord.length
      if (dir.colDelta < 0) minCol = cleanWord.length - 1

      if (maxRow < minRow || maxCol < minCol) continue

      const row = rng.nextInt(minRow, maxRow)
      const col = rng.nextInt(minCol, maxCol)

      let canPlace = true
      const cells: Array<{ row: number; col: number }> = []

      for (let i = 0; i < cleanWord.length; i++) {
        const r = row + i * dir.rowDelta
        const c = col + i * dir.colDelta

        if (r < 0 || r >= size || c < 0 || c >= size) {
          canPlace = false
          break
        }
        if (grid[r][c] !== "" && grid[r][c] !== cleanWord[i]) {
          canPlace = false
          break
        }
        cells.push({ row: r, col: c })
      }

      if (canPlace) {
        for (let i = 0; i < cleanWord.length; i++) {
          grid[cells[i].row][cells[i].col] = cleanWord[i]
        }
        placements.push({ word: cleanWord, cells })
        placed = true
      }
    }

    // If word still not placed, force place it in a clear area
    if (!placed) {
      for (let row = 0; row <= size - cleanWord.length; row++) {
        for (let col = 0; col <= size - cleanWord.length; col++) {
          let canPlace = true
          const cells: Array<{ row: number; col: number }> = []

          for (let i = 0; i < cleanWord.length; i++) {
            if (grid[row][col + i] !== "" && grid[row][col + i] !== cleanWord[i]) {
              canPlace = false
              break
            }
            cells.push({ row, col: col + i })
          }

          if (canPlace) {
            for (let i = 0; i < cleanWord.length; i++) {
              grid[row][col + i] = cleanWord[i]
            }
            placements.push({ word: cleanWord, cells })
            placed = true
            break
          }
        }
        if (placed) break
      }
    }
  }

  // Fill empty cells with random letters
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === "") {
        grid[row][col] = letters[rng.nextInt(0, letters.length - 1)]
      }
    }
  }

  return { grid, placements, size }
}

const WORD_COLORS = [
  { bg: "bg-blue-200", border: "border-blue-400" },
  { bg: "bg-emerald-200", border: "border-emerald-400" },
  { bg: "bg-amber-200", border: "border-amber-400" },
  { bg: "bg-pink-200", border: "border-pink-400" },
  { bg: "bg-cyan-200", border: "border-cyan-400" },
  { bg: "bg-orange-200", border: "border-orange-400" },
  { bg: "bg-violet-200", border: "border-violet-400" },
  { bg: "bg-rose-200", border: "border-rose-400" },
]

export function WordSearch({ activity }: WordSearchProps) {
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set())
  const [selection, setSelection] = useState<
    Array<{ row: number; col: number }>
  >([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  // Use a random seed that changes on each mount/reset for shuffling
  const [seed, setSeed] = useState(() => Date.now() + Math.random() * 10000)

  const gridRef = useRef<HTMLDivElement>(null)
  const clapAudioRef = useRef<HTMLAudioElement | null>(null)

  const config = activity.config as {
    words?: string[]
    headerText?: string
  }

  const words = config.words || []

  const { grid, placements, size } = (() => {
    return generateWordSearch(words, seed)
  })()

  useEffect(() => {
    clapAudioRef.current = new Audio("/sounds/clap.mp3")
    clapAudioRef.current.volume = 0.8
    clapAudioRef.current.load()
  }, [])

  const getWordColor = (word: string): { bg: string; border: string } => {
    const index = words.findIndex(
      (w) => w.replace(/\s/g, "").toUpperCase() === word,
    )
    return WORD_COLORS[index % WORD_COLORS.length]
  }

  const getCellColor = (row: number, col: number): { bg: string; border: string } | null => {
    for (const placement of placements) {
      if (foundWords.has(placement.word)) {
        const inWord = placement.cells.some(
          (c) => c.row === row && c.col === col,
        )
        if (inWord) {
          return getWordColor(placement.word)
        }
      }
    }
    return null
  }

  const isInSelection = (row: number, col: number): boolean => {
    return selection.some((cell) => cell.row === row && cell.col === col)
  }

  const handleMouseDown = (row: number, col: number) => {
    setIsSelecting(true)
    setSelection([{ row, col }])
  }

  const handleMouseEnter = (row: number, col: number) => {
    if (!isSelecting) return

    const existingIndex = selection.findIndex(
      (c) => c.row === row && c.col === col,
    )
    if (existingIndex !== -1 && existingIndex < selection.length - 1) {
      setSelection(selection.slice(0, existingIndex + 1))
    } else if (existingIndex === -1) {
      setSelection([...selection, { row, col }])
    }
  }

  const handleMouseUp = () => {
    if (!isSelecting) return
    setIsSelecting(false)

    if (selection.length > 1) {
      validateSelection(selection)
    }
    setSelection([])
  }

  const validateSelection = (cells: Array<{ row: number; col: number }>) => {
    for (const placement of placements) {
      if (foundWords.has(placement.word)) continue

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
          const newFoundWords = new Set(foundWords)
          newFoundWords.add(placement.word)
          setFoundWords(newFoundWords)

          if (newFoundWords.size === placements.length) {
            playCelebration()
          }
          return
        }
      }
    }
  }

  const playCelebration = useCallback(() => {
    setShowCelebration(true)
    if (clapAudioRef.current) {
      clapAudioRef.current.currentTime = 0
      clapAudioRef.current.play().catch(() => {})
      setTimeout(() => {
        if (clapAudioRef.current) {
          clapAudioRef.current.pause()
          clapAudioRef.current.currentTime = 0
        }
      }, 1500)
    }
    setTimeout(() => setShowCelebration(false), 3000)
  }, [])

  const handleReset = useCallback(() => {
    setFoundWords(new Set())
    setSelection([])
    setIsSelecting(false)
    setShowCelebration(false)
    // Generate new seed to shuffle letters
    setSeed(Date.now() + Math.random() * 10000)
  }, [])

  const handleCheckAnswers = useCallback(() => {
    if (foundWords.size === placements.length) {
      playCelebration()
    }
  }, [foundWords.size, placements.length, playCelebration])

  const handleShowAnswers = useCallback(
    (show: boolean) => {
      if (show) {
        const allWords = new Set(placements.map((p) => p.word))
        setFoundWords(allWords)
      } else {
        setFoundWords(new Set())
      }
    },
    [placements],
  )

  const handleShowNextAnswer = useCallback(() => {
    for (const placement of placements) {
      if (!foundWords.has(placement.word)) {
        const newFoundWords = new Set(foundWords)
        newFoundWords.add(placement.word)
        setFoundWords(newFoundWords)
        break
      }
    }
  }, [foundWords, placements])

  useEffect(() => {
    const win = window as unknown as {
      __activityReset?: () => void
      __activityCheckAnswers?: () => void
      __activityShowAnswers?: (show: boolean) => void
      __activityShowNextAnswer?: () => void
    }
    win.__activityReset = handleReset
    win.__activityCheckAnswers = handleCheckAnswers
    win.__activityShowAnswers = handleShowAnswers
    win.__activityShowNextAnswer = handleShowNextAnswer
    return () => {
      delete win.__activityReset
      delete win.__activityCheckAnswers
      delete win.__activityShowAnswers
      delete win.__activityShowNextAnswer
    }
  }, [handleReset, handleCheckAnswers, handleShowAnswers, handleShowNextAnswer])

  if (words.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">No words configured for this activity</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full select-none bg-gradient-to-br from-slate-100 via-white to-slate-50">
      {showCelebration && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${5 + ((i * 2) % 90)}%`,
                top: "-20px",
                animationDelay: `${(i % 10) * 0.1}s`,
                animationDuration: `${2 + (i % 3) * 0.5}s`,
                backgroundColor: [
                  "#fbbf24",
                  "#34d399",
                  "#60a5fa",
                  "#f472b6",
                  "#a78bfa",
                  "#f87171",
                  "#4ade80",
                ][i % 7],
                width: `${8 + (i % 3) * 4}px`,
                height: `${8 + (i % 3) * 4}px`,
                borderRadius: i % 2 === 0 ? "50%" : "2px",
              }}
            />
          ))}
        </div>
      )}

      <div
        ref={gridRef}
        className="flex-1 flex items-center justify-center p-4"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-xl border border-slate-200">
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          >
            {grid.map((row, rowIdx) =>
              row.map((letter, colIdx) => {
                const cellColor = getCellColor(rowIdx, colIdx)
                const inSelection = isInSelection(rowIdx, colIdx)

                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                    onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                    className={cn(
                      "flex h-8 w-8 cursor-pointer items-center justify-center",
                      "rounded-lg font-mono text-sm font-bold transition-all duration-150",
                      "md:h-9 md:w-9 md:text-base border-2 shadow-sm",
                      "select-none text-slate-700",
                      cellColor?.bg,
                      cellColor?.border,
                      !cellColor && inSelection && "bg-cyan-200 border-cyan-400 scale-110 shadow-md",
                      !cellColor && !inSelection && "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:scale-105",
                    )}
                  >
                    {letter}
                  </div>
                )
              }),
            )}
          </div>
        </div>
      </div>

      <div className="w-72 flex flex-col border-l border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5">
        <div className="mb-5">
          <h3 className="text-xl font-bold text-slate-800 mb-3">Words to Find</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Progress</span>
            <span className="text-sm font-bold text-teal-600">
              {foundWords.size} / {placements.length}
            </span>
          </div>
          <div className="mt-2 h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
              style={{
                width: `${(foundWords.size / placements.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="flex-1 space-y-2.5 overflow-auto pr-1">
          {words.map((word, index) => {
            const cleanWord = word.replace(/\s/g, "").toUpperCase()
            const found = foundWords.has(cleanWord)
            const color = WORD_COLORS[index % WORD_COLORS.length]

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-3 transition-all duration-300",
                  found
                    ? `${color.bg} ${color.border} border-2 shadow-md scale-[1.02]`
                    : "bg-white border-2 border-slate-200 hover:border-slate-300",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-all",
                    found
                      ? "bg-green-500 text-white shadow-sm"
                      : "border-2 border-slate-300 text-slate-400",
                  )}
                >
                  {found ? "✓" : index + 1}
                </div>
                <span
                  className={cn(
                    "font-semibold text-base",
                    found ? "text-slate-700 line-through decoration-2" : "text-slate-700",
                  )}
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
