/**
 * Answer matching utility for fill-blank activities
 * Story 30.11: Activity Player Updates - Task 6
 *
 * Used by Listening Fill-blank, Grammar Fill-blank, and Writing Fill-blank players.
 */

/**
 * Check if a student answer matches any of the acceptable answers.
 * Supports case-insensitive matching and whitespace trimming.
 */
export function isAnswerAcceptable(
  studentAnswer: string,
  acceptableAnswers: string[],
  options?: { caseSensitive?: boolean; trimWhitespace?: boolean },
): boolean {
  const caseSensitive = options?.caseSensitive ?? false
  const trimWhitespace = options?.trimWhitespace ?? true

  let normalized = studentAnswer
  if (trimWhitespace) normalized = normalized.trim()
  if (!caseSensitive) normalized = normalized.toLowerCase()

  return acceptableAnswers.some((acceptable) => {
    let norm = acceptable
    if (trimWhitespace) norm = norm.trim()
    if (!caseSensitive) norm = norm.toLowerCase()
    return normalized === norm
  })
}
