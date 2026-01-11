/**
 * Quiz Cart Hook
 * Story 27.18: Vocabulary Explorer with Audio Player
 *
 * Manages selection of vocabulary words for quick quiz generation.
 * State persists in session for convenience.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { VocabularyWord } from "@/types/vocabulary-explorer"

interface QuizCartState {
  words: Map<string, VocabularyWord>
  addWord: (word: VocabularyWord) => void
  removeWord: (vocabularyId: string) => void
  hasWord: (vocabularyId: string) => boolean
  clearCart: () => void
  getCartWords: () => VocabularyWord[]
  getCartSize: () => number
}

/**
 * Quiz Cart Store
 *
 * Manages vocabulary words selected for quiz generation.
 * Persists to sessionStorage for convenience across page navigation.
 */
export const useQuizCart = create<QuizCartState>()(
  persist(
    (set, get) => ({
      words: new Map<string, VocabularyWord>(),

      addWord: (word: VocabularyWord) => {
        set((state) => {
          const newWords = new Map(state.words)
          newWords.set(word.id, word)
          return { words: newWords }
        })
      },

      removeWord: (vocabularyId: string) => {
        set((state) => {
          const newWords = new Map(state.words)
          newWords.delete(vocabularyId)
          return { words: newWords }
        })
      },

      hasWord: (vocabularyId: string) => {
        return get().words.has(vocabularyId)
      },

      clearCart: () => {
        set({ words: new Map() })
      },

      getCartWords: () => {
        return Array.from(get().words.values())
      },

      getCartSize: () => {
        return get().words.size
      },
    }),
    {
      name: "vocabulary-quiz-cart",
      // Custom storage to handle Map serialization
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name)
          if (!str) return null

          const { state } = JSON.parse(str)
          return {
            state: {
              ...state,
              words: new Map(Object.entries(state.words || {})),
            },
          }
        },
        setItem: (name, value) => {
          const wordsObj = Object.fromEntries(value.state.words)
          sessionStorage.setItem(
            name,
            JSON.stringify({
              state: {
                ...value.state,
                words: wordsObj,
              },
            }),
          )
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    },
  ),
)
