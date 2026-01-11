/**
 * LanguageIndicator - Display detected content language
 * Story 27.17: Question Generator UI - Task 5
 *
 * Shows detected language from book/material with flag icon and warning if uncertain.
 */

import { AlertTriangle, Globe } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface LanguageIndicatorProps {
  language: string | null
  isUncertain?: boolean
}

// Language code to flag emoji mapping
const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧", // English
  es: "🇪🇸", // Spanish
  fr: "🇫🇷", // French
  de: "🇩🇪", // German
  it: "🇮🇹", // Italian
  pt: "🇵🇹", // Portuguese
  ru: "🇷🇺", // Russian
  zh: "🇨🇳", // Chinese
  ja: "🇯🇵", // Japanese
  ko: "🇰🇷", // Korean
  ar: "🇸🇦", // Arabic
  tr: "🇹🇷", // Turkish
  pl: "🇵🇱", // Polish
  nl: "🇳🇱", // Dutch
}

// Language code to display name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  tr: "Turkish",
  pl: "Polish",
  nl: "Dutch",
}

/**
 * Get flag emoji for language code
 */
function getLanguageFlag(languageCode: string): string {
  const code = languageCode.toLowerCase().substring(0, 2)
  return LANGUAGE_FLAGS[code] || "🌐"
}

/**
 * Get language display name
 */
function getLanguageName(languageCode: string): string {
  const code = languageCode.toLowerCase().substring(0, 2)
  return LANGUAGE_NAMES[code] || languageCode
}

export function LanguageIndicator({
  language,
  isUncertain = false,
}: LanguageIndicatorProps) {
  // Don't show anything if language not yet detected
  if (!language) {
    return null
  }

  const flag = getLanguageFlag(language)
  const name = getLanguageName(language)

  if (isUncertain) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center gap-2">
            <span>
              Language detection uncertain: {flag} {name}
            </span>
            <Badge variant="outline">May affect quality</Badge>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert>
      <Globe className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{flag}</span>
          <div>
            <div className="font-medium">Content Language: {name}</div>
            <div className="text-xs text-muted-foreground">
              Activities will be generated in this language
            </div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
