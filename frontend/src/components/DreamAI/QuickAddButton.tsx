/**
 * Quick Add Button Component
 * Story 27.18: Vocabulary Explorer with Audio Player
 *
 * Button to add/remove vocabulary words from quiz cart.
 */

import { Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useQuizCart } from "@/hooks/useQuizCart"
import type { VocabularyWord } from "@/types/vocabulary-explorer"

export interface QuickAddButtonProps {
  word: VocabularyWord
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "outline" | "ghost"
}

/**
 * Quick Add to Quiz Button
 *
 * Toggles word in quiz cart for bulk quiz generation.
 * Shows different icon when word is already added.
 */
export function QuickAddButton({
  word,
  size = "sm",
  variant = "outline",
}: QuickAddButtonProps) {
  const { addWord, removeWord, hasWord } = useQuizCart()
  const isAdded = hasWord(word.id)

  const handleClick = () => {
    if (isAdded) {
      removeWord(word.id)
    } else {
      addWord(word)
    }
  }

  return (
    <Button
      variant={isAdded ? "default" : variant}
      size={size}
      onClick={handleClick}
      className={isAdded ? "bg-emerald-600 hover:bg-emerald-700" : ""}
      aria-label={
        isAdded ? `Remove ${word.word} from quiz` : `Add ${word.word} to quiz`
      }
    >
      {isAdded ? (
        <>
          <Check className="h-4 w-4 mr-1" />
          Added
        </>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </>
      )}
    </Button>
  )
}
