/**
 * AIGeneratingAnimation - Modern AI generation loading state
 * Story 27.17: Question Generator UI
 *
 * Animated loading screen with orbiting particles, rotating status messages,
 * and a pulsing neural-network inspired aesthetic.
 */

import { Brain, Sparkles, Zap, BookOpen, Pen } from "lucide-react"
import { useEffect, useState, useMemo } from "react"

interface AIGeneratingAnimationProps {
  /** Activity type being generated */
  activityType?: string | null
  /** Custom message to display */
  message?: string
}

const STATUS_MESSAGES = [
  "Analyzing module content",
  "Crafting questions",
  "Balancing difficulty levels",
  "Generating distractors",
  "Validating answers",
  "Polishing output",
]

const MIX_MESSAGES = [
  "Analyzing content for skill coverage",
  "Distributing across skill areas",
  "Generating vocabulary questions",
  "Building grammar exercises",
  "Creating reading comprehension",
  "Assembling multi-skill activity",
]

export function AIGeneratingAnimation({
  activityType,
  message,
}: AIGeneratingAnimationProps) {
  const [messageIdx, setMessageIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  const isMix = activityType === "mix_mode" || activityType === "mix"

  const messages = useMemo(() => {
    if (message) return [message]
    if (isMix) return MIX_MESSAGES
    return STATUS_MESSAGES
  }, [message, isMix])

  // Rotate status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIdx((prev) => (prev + 1) % messages.length)
    }, 2800)
    return () => clearInterval(interval)
  }, [messages])

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const getTitle = () => {
    switch (activityType) {
      case "ai_quiz":
      case "vocabulary_quiz":
        return "Generating Quiz"
      case "reading_comprehension":
        return "Building Passages"
      case "grammar_fill_blank":
        return "Creating Exercises"
      case "mix_mode":
      case "mix":
        return "Mixing Skills"
      default:
        return "Generating Content"
    }
  }

  return (
    <div className="h-full flex-1 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/[0.07] dark:bg-purple-500/[0.04] rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-1/3 w-[200px] h-[200px] bg-violet-500/[0.05] rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-[200px] h-[200px] bg-fuchsia-500/[0.05] rounded-full blur-[80px] animate-pulse [animation-delay:1s]" />
      </div>

      {/* Orbiting ring system */}
      <div className="relative mb-8">
        {/* Outer orbit */}
        <div className="absolute inset-[-40px] animate-[spin_8s_linear_infinite]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-violet-400/40 shadow-[0_0_6px_rgba(139,92,246,0.4)]" />
        </div>

        {/* Middle orbit */}
        <div className="absolute inset-[-24px] animate-[spin_5s_linear_infinite_reverse]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-fuchsia-400/50 shadow-[0_0_6px_rgba(232,121,249,0.5)]" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-purple-300/40" />
        </div>

        {/* Orbit rings (decorative) */}
        <div className="absolute inset-[-40px] rounded-full border border-purple-500/10 dark:border-purple-400/[0.07]" />
        <div className="absolute inset-[-24px] rounded-full border border-violet-500/[0.08] dark:border-violet-400/[0.05]" />

        {/* Core icon */}
        <div className="relative">
          <div className="absolute inset-[-4px] bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500 rounded-2xl blur-md opacity-50 animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Brain className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent mb-2">
        {getTitle()}
      </h3>

      {/* Rotating status message */}
      <div className="h-6 relative overflow-hidden mb-6">
        <p
          key={messageIdx}
          className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          {messages[messageIdx]}...
        </p>
      </div>

      {/* Animated progress track */}
      <div className="w-56 space-y-3">
        <div className="h-1 rounded-full bg-purple-500/10 dark:bg-purple-500/[0.07] overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500 animate-[shimmer_2s_ease-in-out_infinite]" />
        </div>

        {/* Skill pills for mix mode */}
        {isMix && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {[
              { icon: BookOpen, label: "Reading", delay: "0s" },
              { icon: Pen, label: "Writing", delay: "0.2s" },
              { icon: Zap, label: "Grammar", delay: "0.4s" },
              { icon: Sparkles, label: "Vocab", delay: "0.6s" },
            ].map(({ icon: Icon, label, delay }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-purple-500/20 text-purple-400 bg-purple-500/5 animate-pulse"
                style={{ animationDelay: delay }}
              >
                <Icon className="w-2.5 h-2.5" />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Elapsed time */}
      <p className="mt-6 text-xs text-muted-foreground/50 tabular-nums">
        {elapsed}s elapsed
      </p>
    </div>
  )
}
