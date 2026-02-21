/**
 * GenerationConfigPanel - Skill-aware generation configuration
 * Story 30.10: Format Selection & Configuration Step - Task 2
 *
 * Adapts options based on selected skill and format.
 */

import { Headphones } from "lucide-react"
import { useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface GenerationConfigPanelProps {
  skillSlug: string
  formatSlug: string | null
  options: Record<string, any>
  onOptionChange: (key: string, value: any) => void
  isMixMode?: boolean
}

export function GenerationConfigPanel({
  skillSlug,
  formatSlug,
  options,
  onOptionChange,
  isMixMode,
}: GenerationConfigPanelProps) {
  const difficulty = options.difficulty || "auto"
  const count = options.count || 10
  const isReading = !isMixMode && skillSlug === "reading"

  const difficultyOptions = [
    { value: "auto", label: "Auto" },
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ]

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Configuration</Label>
        <p className="text-sm text-muted-foreground">
          {isMixMode
            ? "Configure your multi-skill activity"
            : "Fine-tune generation parameters"}
        </p>
      </div>

      {/* Difficulty selector */}
      <div className="space-y-2">
        <Label>Difficulty Level</Label>
        <div className="flex gap-2">
          {difficultyOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onOptionChange("difficulty", opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium border transition-all",
                difficulty === opt.value
                  ? "bg-purple-500 text-white border-purple-500 shadow-sm"
                  : "bg-card border-muted hover:border-purple-300 text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reading: passage count + questions per passage */}
      {isReading ? (
        <ReadingOptions options={options} onOptionChange={onOptionChange} />
      ) : (
        /* Question count - preset buttons + slider */
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Question Count</Label>
            <Badge variant="secondary">{count}</Badge>
          </div>
          <div className="flex gap-2 mb-2">
            {[5, 10, 15, 20].map((n) => (
              <button
                key={n}
                onClick={() => onOptionChange("count", n)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm border transition-all",
                  count === n
                    ? "bg-purple-500 text-white border-purple-500"
                    : "bg-card border-muted hover:border-purple-300",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <Slider
            min={5}
            max={20}
            step={1}
            value={[count]}
            onValueChange={([v]) => onOptionChange("count", v)}
          />
        </div>
      )}

      {/* Skill-specific options */}
      {!isMixMode && skillSlug === "listening" && (
        <ListeningOptions options={options} onOptionChange={onOptionChange} />
      )}

    </div>
  )
}

/** Listening-specific: voice picker */
function ListeningOptions({
  options,
  onOptionChange,
}: {
  options: Record<string, any>
  onOptionChange: (key: string, value: any) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Voice</Label>
      <Select
        value={options.voice_id || ""}
        onValueChange={(v) => onOptionChange("voice_id", v)}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Default (Jenny)" />
        </SelectTrigger>
        <SelectContent>
          {NARRATOR_VOICES.map((v) => (
            <SelectItem key={v.id} value={v.id} className="text-xs">
              {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Reading: passage count + questions per passage + passage word count */
function ReadingOptions({
  options,
  onOptionChange,
}: {
  options: Record<string, any>
  onOptionChange: (key: string, value: any) => void
}) {
  // Initialize defaults on mount so form state matches what's displayed
  useEffect(() => {
    if (options.count === undefined) onOptionChange("count", 5)
    if (options.passage_count === undefined) onOptionChange("passage_count", 1)
    if (options.generate_audio === undefined) onOptionChange("generate_audio", true)
  }, [])

  const passageCount = options.passage_count ?? 1
  const questionsPerPassage = options.count ?? 5

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Number of Passages</Label>
          <Badge variant="secondary">{passageCount}</Badge>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onOptionChange("passage_count", n)}
              className={cn(
                "px-3 py-1 rounded-md text-sm border transition-all",
                passageCount === n
                  ? "bg-purple-500 text-white border-purple-500"
                  : "bg-card border-muted hover:border-purple-300",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Questions per Passage</Label>
          <Badge variant="secondary">{questionsPerPassage}</Badge>
        </div>
        <div className="flex gap-2 mb-2">
          {[5, 10, 15, 20].map((n) => (
            <button
              key={n}
              onClick={() => onOptionChange("count", n)}
              className={cn(
                "px-3 py-1 rounded-md text-sm border transition-all",
                questionsPerPassage === n
                  ? "bg-purple-500 text-white border-purple-500"
                  : "bg-card border-muted hover:border-purple-300",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <Slider
          min={5}
          max={20}
          step={1}
          value={[questionsPerPassage]}
          onValueChange={([v]) => onOptionChange("count", v)}
        />
      </div>

      {/* Audio Narration toggle */}
      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-teal-500" />
            <div>
              <Label className="text-sm font-medium">Audio Narration</Label>
              <p className="text-xs text-muted-foreground">
                Generate spoken audio with word highlighting
              </p>
            </div>
          </div>
          <Switch
            checked={!!options.generate_audio}
            onCheckedChange={(checked) => onOptionChange("generate_audio", checked)}
          />
        </div>

        {/* Voice picker — shown when audio is enabled */}
        {options.generate_audio && (
          <div className="space-y-2 pt-1">
            <Label className="text-xs">Voice</Label>
            <Select
              value={options.voice_id || ""}
              onValueChange={(v) => onOptionChange("voice_id", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default (Jenny)" />
              </SelectTrigger>
              <SelectContent>
                {NARRATOR_VOICES.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </>
  )
}

/** Curated Edge TTS voices for reading passage narration */
const NARRATOR_VOICES = [
  { id: "en-US-JennyNeural", label: "Jenny — Female, Warm (default)" },
  { id: "en-US-AriaNeural", label: "Aria — Female, Natural" },
  { id: "en-US-GuyNeural", label: "Guy — Male, Clear" },
  { id: "en-GB-SoniaNeural", label: "Sonia — Female, British" },
  { id: "en-GB-RyanNeural", label: "Ryan — Male, British" },
]

