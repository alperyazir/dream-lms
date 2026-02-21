/**
 * VocabularyMatchingPlayerAdapter - Two-column word-definition matching
 *
 * Students see words (left column) and shuffled definitions (right column).
 * Click a word to select it, then click a definition to match.
 * Scoring: correct when def_id === pair_id for the matched word.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, RotateCw, Volume2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ActivityConfig, VocabularyMatchingActivity } from "@/lib/mockData"

interface MatchingContent {
  activity_id: string
  words: Array<{
    pair_id: string
    word: string
    audio_url?: string | null
    cefr_level?: string
  }>
  definitions: Array<{
    def_id: string
    definition: string
  }>
  pairs?: Array<{
    pair_id: string
    word: string
    definition: string
    audio_url?: string | null
    cefr_level?: string
  }>
  pair_count: number
}

interface VocabularyMatchingPlayerAdapterProps {
  activity: ActivityConfig
  onAnswersChange: (answers: Map<string, string>) => void
  showResults: boolean
  correctAnswers: Set<string>
  initialAnswers?: Map<string, string>
  showCorrectAnswers?: boolean
}

// Predefined colors for matched pairs
const MATCH_COLORS = [
  "bg-blue-100 border-blue-400 dark:bg-blue-900/30 dark:border-blue-500",
  "bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-500",
  "bg-purple-100 border-purple-400 dark:bg-purple-900/30 dark:border-purple-500",
  "bg-orange-100 border-orange-400 dark:bg-orange-900/30 dark:border-orange-500",
  "bg-pink-100 border-pink-400 dark:bg-pink-900/30 dark:border-pink-500",
  "bg-teal-100 border-teal-400 dark:bg-teal-900/30 dark:border-teal-500",
  "bg-indigo-100 border-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-500",
  "bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-500",
  "bg-cyan-100 border-cyan-400 dark:bg-cyan-900/30 dark:border-cyan-500",
  "bg-rose-100 border-rose-400 dark:bg-rose-900/30 dark:border-rose-500",
]

export function VocabularyMatchingPlayerAdapter({
  activity,
  onAnswersChange,
  showResults,
  correctAnswers: _correctAnswers,
  initialAnswers,
  showCorrectAnswers = false,
}: VocabularyMatchingPlayerAdapterProps) {
  const content = (activity as VocabularyMatchingActivity)
    .content as MatchingContent

  // Build words + definitions from either public format or pairs format
  const words = content.words || (content.pairs || []).map((p) => ({
    pair_id: p.pair_id,
    word: p.word,
    audio_url: p.audio_url,
    cefr_level: p.cefr_level,
  }))

  const [definitions] = useState(() => {
    if (content.definitions) return content.definitions
    // If we have pairs (from edit/preview), shuffle definitions
    const defs = (content.pairs || []).map((p) => ({
      def_id: p.pair_id,
      definition: p.definition,
    }))
    // Shuffle
    for (let i = defs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[defs[i], defs[j]] = [defs[j], defs[i]]
    }
    return defs
  })

  // matches: pair_id -> def_id
  const [matches, setMatches] = useState<Map<string, string>>(() => {
    if (initialAnswers && initialAnswers.size > 0) return new Map(initialAnswers)
    return new Map()
  })

  // Currently selected word (pair_id)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)

  // Track match order for color assignment
  const [matchOrder, setMatchOrder] = useState<string[]>(() => {
    if (initialAnswers && initialAnswers.size > 0) return Array.from(initialAnswers.keys())
    return []
  })

  const onAnswersChangeRef = useRef(onAnswersChange)
  onAnswersChangeRef.current = onAnswersChange

  useEffect(() => {
    onAnswersChangeRef.current(matches)
  }, [matches])

  const handleWordClick = useCallback(
    (pairId: string) => {
      if (showResults) return
      // If already matched, unmatch it
      if (matches.has(pairId)) {
        setMatches((prev) => {
          const next = new Map(prev)
          next.delete(pairId)
          return next
        })
        setMatchOrder((prev) => prev.filter((id) => id !== pairId))
        setSelectedWord(null)
        return
      }
      setSelectedWord((prev) => (prev === pairId ? null : pairId))
    },
    [showResults, matches],
  )

  const handleDefinitionClick = useCallback(
    (defId: string) => {
      if (showResults || !selectedWord) return

      // Check if this definition is already used
      const alreadyUsedBy = Array.from(matches.entries()).find(
        ([, d]) => d === defId,
      )
      if (alreadyUsedBy) {
        // Unmatch the previous word that used this definition
        setMatches((prev) => {
          const next = new Map(prev)
          next.delete(alreadyUsedBy[0])
          return next
        })
        setMatchOrder((prev) => prev.filter((id) => id !== alreadyUsedBy[0]))
      }

      // Make the match
      setMatches((prev) => {
        const next = new Map(prev)
        next.set(selectedWord, defId)
        return next
      })
      setMatchOrder((prev) => [...prev.filter((id) => id !== selectedWord), selectedWord])
      setSelectedWord(null)
    },
    [showResults, selectedWord, matches],
  )

  const handleReset = useCallback(() => {
    setMatches(new Map())
    setMatchOrder([])
    setSelectedWord(null)
  }, [])

  const getColorForPairId = (pairId: string): string => {
    const idx = matchOrder.indexOf(pairId)
    if (idx === -1) return ""
    return MATCH_COLORS[idx % MATCH_COLORS.length]
  }

  const getDefColorByDefId = (defId: string): string => {
    const entry = Array.from(matches.entries()).find(([, d]) => d === defId)
    if (!entry) return ""
    return getColorForPairId(entry[0])
  }

  const isDefMatched = (defId: string): boolean => {
    return Array.from(matches.values()).includes(defId)
  }

  // For results: check correctness (correct when pair_id === def_id)
  const isMatchCorrect = (pairId: string): boolean | null => {
    const defId = matches.get(pairId)
    if (!defId) return null
    return defId === pairId
  }

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl)
    audio.play().catch(() => {})
  }

  const totalPairs = words.length
  const matchedCount = matches.size
  const correctCount = Array.from(matches.entries()).filter(
    ([pairId, defId]) => pairId === defId,
  ).length

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Match Words to Definitions</h2>
          <p className="text-sm text-muted-foreground">
            Click a word, then click its matching definition.{" "}
            {matchedCount}/{totalPairs} matched
          </p>
        </div>
        {!showResults && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCw className="mr-1 h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {/* Results banner */}
      {showResults && (
        <div
          className={`mb-6 rounded-lg p-4 text-center font-medium ${
            correctCount === totalPairs
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
          }`}
        >
          {correctCount === totalPairs
            ? "Perfect! All matches are correct!"
            : `${correctCount} of ${totalPairs} correct`}
        </div>
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Words column */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Words
          </h3>
          <div className="space-y-2">
            {words.map((w) => {
              const isSelected = selectedWord === w.pair_id
              const isMatched = matches.has(w.pair_id)
              const colorClass = isMatched ? getColorForPairId(w.pair_id) : ""
              const result = showResults ? isMatchCorrect(w.pair_id) : null

              return (
                <button
                  key={w.pair_id}
                  type="button"
                  onClick={() => handleWordClick(w.pair_id)}
                  disabled={showResults && !showCorrectAnswers}
                  className={`
                    w-full rounded-lg border-2 p-3 text-left transition-all
                    ${isSelected ? "border-primary bg-primary/10 ring-2 ring-primary/30" : ""}
                    ${isMatched && !isSelected ? `${colorClass} border-2` : ""}
                    ${!isSelected && !isMatched ? "border-border bg-card hover:border-primary/50 hover:bg-accent" : ""}
                    ${showResults && result === true ? "!border-green-500 !bg-green-50 dark:!bg-green-900/20" : ""}
                    ${showResults && result === false ? "!border-red-500 !bg-red-50 dark:!bg-red-900/20" : ""}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{w.word}</span>
                      {w.cefr_level && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {w.cefr_level}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {w.audio_url && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            playAudio(w.audio_url!)
                          }}
                          className="rounded p-1 hover:bg-muted"
                        >
                          <Volume2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                      {showResults && result === true && (
                        <Check className="h-5 w-5 text-green-600" />
                      )}
                      {showResults && result === false && (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Definitions column */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Definitions
          </h3>
          <div className="space-y-2">
            {definitions.map((d) => {
              const matched = isDefMatched(d.def_id)
              const colorClass = matched ? getDefColorByDefId(d.def_id) : ""
              const isSelectable = selectedWord !== null && !showResults

              // In results mode, find which word was matched to this definition
              let resultCorrect: boolean | null = null
              if (showResults) {
                const matchEntry = Array.from(matches.entries()).find(
                  ([, defId]) => defId === d.def_id,
                )
                if (matchEntry) {
                  resultCorrect = matchEntry[0] === d.def_id
                }
              }

              return (
                <button
                  key={d.def_id}
                  type="button"
                  onClick={() => handleDefinitionClick(d.def_id)}
                  disabled={!isSelectable}
                  className={`
                    w-full rounded-lg border-2 p-3 text-left transition-all
                    ${matched ? `${colorClass} border-2` : "border-border bg-card"}
                    ${isSelectable && !matched ? "hover:border-primary/50 hover:bg-accent cursor-pointer" : ""}
                    ${!isSelectable && !matched ? "opacity-70" : ""}
                    ${showResults && resultCorrect === true ? "!border-green-500 !bg-green-50 dark:!bg-green-900/20" : ""}
                    ${showResults && resultCorrect === false ? "!border-red-500 !bg-red-50 dark:!bg-red-900/20" : ""}
                  `}
                >
                  <p className="text-sm">{d.definition}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Show correct answers in review mode */}
      {showResults && showCorrectAnswers && (
        <div className="mt-6 rounded-lg border bg-muted/50 p-4">
          <h3 className="mb-3 font-medium">Correct Answers</h3>
          <div className="space-y-2">
            {words.map((w) => {
              const correctDef = definitions.find((d) => d.def_id === w.pair_id)
              return (
                <div
                  key={w.pair_id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="font-medium">{w.word}</span>
                  <span className="text-muted-foreground">→</span>
                  <span>{correctDef?.definition}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
