/**
 * Username generation utility with Turkish character support
 */

/**
 * Turkish to ASCII character mapping
 */
const TURKISH_MAP: Record<string, string> = {
  ı: "i",
  İ: "I",
  ğ: "g",
  Ğ: "G",
  ü: "u",
  Ü: "U",
  ş: "s",
  Ş: "S",
  ö: "o",
  Ö: "O",
  ç: "c",
  Ç: "C",
}

/**
 * Convert Turkish special characters to ASCII equivalents
 * @param text - Input text containing Turkish characters
 * @returns Text with Turkish characters replaced with ASCII equivalents
 */
export function turkishToAscii(text: string): string {
  return text
    .split("")
    .map((char) => TURKISH_MAP[char] ?? char)
    .join("")
}

/**
 * Generate a username from a full name
 * - Converts to lowercase
 * - Maps Turkish characters to ASCII
 * - Replaces spaces with dots
 * - Removes special characters except dots and underscores
 *
 * @param fullName - User's full name
 * @returns Generated username
 *
 * @example
 * generateUsername("Ahmet Yılmaz") // "ahmet.yilmaz"
 * generateUsername("Ömer Faruk Şahin") // "omer.faruk.sahin"
 * generateUsername("İbrahim Çelik") // "ibrahim.celik"
 */
export function generateUsername(fullName: string): string {
  if (!fullName || typeof fullName !== "string") {
    return ""
  }

  return (
    fullName
      // Trim whitespace
      .trim()
      // Apply Turkish character mapping first
      .split("")
      .map((char) => TURKISH_MAP[char] ?? char)
      .join("")
      // Convert to lowercase
      .toLowerCase()
      // Replace multiple spaces with single space
      .replace(/\s+/g, " ")
      // Replace spaces with dots
      .replace(/\s/g, ".")
      // Remove all characters except alphanumeric, dots, and underscores
      .replace(/[^a-z0-9._]/g, "")
      // Remove consecutive dots
      .replace(/\.+/g, ".")
      // Remove leading/trailing dots
      .replace(/^\.+|\.+$/g, "")
  )
}

/**
 * Check if a username is valid
 * - Only lowercase letters, numbers, dots, and underscores
 * - At least 3 characters
 * - No consecutive dots
 * - No leading/trailing dots
 *
 * @param username - Username to validate
 * @returns True if valid, false otherwise
 */
export function isValidUsername(username: string): boolean {
  if (!username || username.length < 3) {
    return false
  }

  // Only lowercase alphanumeric, dots, and underscores
  if (!/^[a-z0-9._]+$/.test(username)) {
    return false
  }

  // No consecutive dots
  if (/\.\./.test(username)) {
    return false
  }

  // No leading/trailing dots
  if (username.startsWith(".") || username.endsWith(".")) {
    return false
  }

  return true
}
