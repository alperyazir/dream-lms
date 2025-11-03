/**
 * MatchTheWordsPlayer - Match words/terms with definitions/descriptions
 * Story 2.5 - Phase 3, Tasks 3.1-3.4
 */

import { useState } from "react"
import type { MatchTheWordsActivity } from "@/lib/mockData"

interface MatchTheWordsPlayerProps {
  activity: MatchTheWordsActivity
  onAnswersChange: (answers: Map<string, string>) => void
  showResults?: boolean
  correctAnswers?: Set<string>
  initialAnswers?: Map<string, string>
}

export function MatchTheWordsPlayer({
  activity,
  onAnswersChange,
  showResults = false,
  correctAnswers,
  initialAnswers,
}: MatchTheWordsPlayerProps) {
  const [matches, setMatches] = useState<Map<string, string>>(
    initialAnswers || new Map(),
  )
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)

  // Get matched items
  const matchedSentences = new Set(matches.keys())
  const matchedWords = new Set(matches.values())

  // Handle sentence click
  const handleSentenceClick = (sentence: string) => {
    if (showResults) return
    if (matchedSentences.has(sentence)) return // Already matched

    if (selectedSentence === sentence) {
      setSelectedSentence(null)
    } else {
      setSelectedSentence(sentence)
      // If word already selected, create match
      if (selectedWord) {
        createMatch(sentence, selectedWord)
      }
    }
  }

  // Handle word click
  const handleWordClick = (word: string) => {
    if (showResults) return
    if (matchedWords.has(word)) return // Already matched

    if (selectedWord === word) {
      setSelectedWord(null)
    } else {
      setSelectedWord(word)
      // If sentence already selected, create match
      if (selectedSentence) {
        createMatch(selectedSentence, word)
      }
    }
  }

  // Create match between sentence and word
  const createMatch = (sentence: string, word: string) => {
    const newMatches = new Map(matches)
    newMatches.set(sentence, word)
    setMatches(newMatches)
    onAnswersChange(newMatches)

    // Clear selections
    setSelectedSentence(null)
    setSelectedWord(null)
  }

  // Remove match
  const handleRemoveMatch = (sentence: string) => {
    if (showResults) return
    const newMatches = new Map(matches)
    newMatches.delete(sentence)
    setMatches(newMatches)
    onAnswersChange(newMatches)
  }

  // Check if match is correct (for results view)
  const isCorrect = (sentence: string): boolean => {
    if (!showResults || !correctAnswers) return false
    return correctAnswers.has(sentence)
  }

  // Calculate completion
  const completionCount = matches.size
  const totalCount = activity.sentences.length

  return (
    <div className="flex h-full flex-col p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          {activity.headerText}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Click a definition, then click the matching word
        </p>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Matched: {completionCount} / {totalCount}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 flex-col gap-4 overflow-auto md:flex-row">
        {/* Left column: Sentences/Definitions */}
        <div className="flex-1 space-y-2">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Definitions
          </h3>
          {activity.sentences.map((item, index) => {
            const matched = matchedSentences.has(item.sentence)
            const selected = selectedSentence === item.sentence
            const correct = isCorrect(item.sentence)
            const matchedWord = matches.get(item.sentence)

            return (
              <button
                type="button"
                key={index}
                onClick={() => handleSentenceClick(item.sentence)}
                className={`
                  group relative w-full cursor-pointer rounded-lg border-2 p-4 text-left shadow-neuro-sm transition-all duration-200
                  ${
                    matched
                      ? showResults
                        ? correct
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                      : selected
                        ? "border-blue-500 bg-blue-50 shadow-neuro dark:bg-blue-900/30"
                        : "border-gray-300 bg-white hover:border-gray-400 hover:shadow-neuro dark:border-gray-600 dark:bg-gray-800"
                  }
                `}
                tabIndex={!matched && !showResults ? 0 : -1}
                aria-label={`Definition ${index + 1}: ${item.sentence}${matched ? ` matched with ${matchedWord}` : ""}`}
                disabled={matched && showResults}
              >
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {item.sentence}
                </p>

                {/* Matched word indicator */}
                {matched && matchedWord && (
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`
                      rounded-full px-3 py-1 text-xs font-semibold
                      ${
                        showResults
                          ? correct
                            ? "bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100"
                            : "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100"
                          : "bg-teal-200 text-teal-900 dark:bg-teal-800 dark:text-teal-100"
                      }
                    `}
                    >
                      {matchedWord}
                    </span>
                    {showResults && (
                      <span className="text-lg">{correct ? "✓" : "✗"}</span>
                    )}
                    {!showResults && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveMatch(item.sentence)
                        }}
                        className="rounded-full bg-gray-200 p-1 text-gray-600 hover:bg-red-500 hover:text-white dark:bg-gray-700 dark:text-gray-300"
                        aria-label={`Remove match with ${matchedWord}`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Right column: Words/Terms */}
        <div className="flex-1 space-y-2">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Words
          </h3>
          {activity.match_words.map((item, index) => {
            const matched = matchedWords.has(item.word)
            const selected = selectedWord === item.word

            return (
              <button
                type="button"
                key={index}
                onClick={() => handleWordClick(item.word)}
                className={`
                  w-full cursor-pointer rounded-lg border-2 p-4 text-center shadow-neuro-sm transition-all duration-200
                  ${
                    matched
                      ? "pointer-events-none border-gray-300 bg-gray-100 opacity-50 dark:border-gray-600 dark:bg-gray-800"
                      : selected
                        ? "border-blue-500 bg-blue-50 shadow-neuro dark:bg-blue-900/30"
                        : "border-gray-300 bg-white hover:border-gray-400 hover:shadow-neuro dark:border-gray-600 dark:bg-gray-800"
                  }
                `}
                tabIndex={!matched && !showResults ? 0 : -1}
                aria-label={`Word: ${item.word}${matched ? " (already matched)" : ""}`}
                disabled={matched}
              >
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {item.word}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
