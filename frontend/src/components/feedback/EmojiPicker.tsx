/**
 * EmojiPicker Component - Story 6.5
 *
 * Allows teachers to select a single emoji reaction (AC: 4, 5, 6).
 * Single selection only - clicking new emoji deselects previous.
 * Clicking selected emoji deselects it.
 */

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { AVAILABLE_EMOJI_REACTIONS } from "@/types/feedback"

interface EmojiPickerProps {
  selectedEmoji: string | null
  onEmojiChange: (emoji: string | null) => void
  disabled?: boolean
}

export function EmojiPicker({
  selectedEmoji,
  onEmojiChange,
  disabled = false,
}: EmojiPickerProps) {
  const handleEmojiClick = (slug: string) => {
    if (disabled) return
    // Toggle selection - click again to deselect
    if (selectedEmoji === slug) {
      onEmojiChange(null)
    } else {
      onEmojiChange(slug)
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Add Reaction</Label>
      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          {AVAILABLE_EMOJI_REACTIONS.map((emojiInfo) => (
            <Tooltip key={emojiInfo.slug}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className={cn(
                    "h-12 w-12 text-2xl transition-all",
                    selectedEmoji === emojiInfo.slug &&
                      "ring-2 ring-primary bg-primary/10 border-primary",
                    disabled && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={() => handleEmojiClick(emojiInfo.slug)}
                  disabled={disabled}
                >
                  {emojiInfo.emoji}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="capitalize">{emojiInfo.slug.replace("_", " ")}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
      {selectedEmoji && (
        <p className="text-xs text-muted-foreground">
          Click the emoji again to remove it
        </p>
      )}
    </div>
  )
}
