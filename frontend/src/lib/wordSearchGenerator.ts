/**
 * Word Search Grid Generator
 * Story 2.5 - Phase 5, Task 5.2
 * Generates deterministic word search grids with words placed in 4 directions
 */

export interface WordPlacement {
  word: string
  startRow: number
  startCol: number
  direction: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up"
  cells: Array<{ row: number; col: number }>
}

export interface WordSearchGrid {
  grid: string[][]
  placements: WordPlacement[]
  size: number
}

/**
 * Simple seeded random number generator for deterministic grids
 */
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

/**
 * Generate a word search grid with the given words
 * @param words - List of words to place in the grid
 * @param seed - Seed for deterministic generation (e.g., assignment ID hash)
 * @param gridSize - Size of the grid (default: auto-calculate based on word count)
 */
export function generateWordSearch(
  words: string[],
  seed: string | number = 0,
  gridSize?: number,
): WordSearchGrid {
  // Convert seed to number
  const numericSeed = typeof seed === "string" ? hashCode(seed) : seed
  const rng = new SeededRandom(numericSeed)

  // Calculate grid size if not provided
  const size =
    gridSize ||
    Math.max(
      12,
      Math.ceil(Math.sqrt(words.reduce((sum, w) => sum + w.length, 0)) * 1.5),
    )

  // Initialize empty grid
  const grid: string[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(""))

  const placements: WordPlacement[] = []
  const directions: WordPlacement["direction"][] = [
    "horizontal",
    "vertical",
    "diagonal-down",
    "diagonal-up",
  ]

  // Try to place each word
  for (const word of words) {
    const upperWord = word.toUpperCase()
    let placed = false
    let attempts = 0
    const maxAttempts = 100

    while (!placed && attempts < maxAttempts) {
      attempts++

      // Random starting position and direction
      const row = rng.nextInt(0, size - 1)
      const col = rng.nextInt(0, size - 1)
      const direction = directions[rng.nextInt(0, directions.length - 1)]

      // Try to place word
      if (canPlaceWord(grid, upperWord, row, col, direction, size)) {
        const cells = placeWord(grid, upperWord, row, col, direction)
        placements.push({
          word: upperWord,
          startRow: row,
          startCol: col,
          direction,
          cells,
        })
        placed = true
      }
    }

    // If word couldn't be placed after max attempts, skip it
    if (!placed) {
      console.warn(`Could not place word: ${word}`)
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

/**
 * Check if a word can be placed at the given position
 */
function canPlaceWord(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: WordPlacement["direction"],
  size: number,
): boolean {
  const rowDelta =
    direction === "vertical" || direction === "diagonal-down"
      ? 1
      : direction === "diagonal-up"
        ? -1
        : 0
  const colDelta =
    direction === "horizontal" ||
    direction === "diagonal-down" ||
    direction === "diagonal-up"
      ? 1
      : 0

  for (let i = 0; i < word.length; i++) {
    const row = startRow + i * rowDelta
    const col = startCol + i * colDelta

    // Check bounds
    if (row < 0 || row >= size || col < 0 || col >= size) {
      return false
    }

    // Check if cell is empty or has the same letter
    if (grid[row][col] !== "" && grid[row][col] !== word[i]) {
      return false
    }
  }

  return true
}

/**
 * Place a word in the grid and return the cells it occupies
 */
function placeWord(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: WordPlacement["direction"],
): Array<{ row: number; col: number }> {
  const rowDelta =
    direction === "vertical" || direction === "diagonal-down"
      ? 1
      : direction === "diagonal-up"
        ? -1
        : 0
  const colDelta =
    direction === "horizontal" ||
    direction === "diagonal-down" ||
    direction === "diagonal-up"
      ? 1
      : 0

  const cells: Array<{ row: number; col: number }> = []

  for (let i = 0; i < word.length; i++) {
    const row = startRow + i * rowDelta
    const col = startCol + i * colDelta
    grid[row][col] = word[i]
    cells.push({ row, col })
  }

  return cells
}

/**
 * Hash a string to a number (for seed generation)
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
