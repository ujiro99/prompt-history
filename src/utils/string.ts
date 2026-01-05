/**
 * Truncate string to max length
 *
 * @param str - Input string
 * @param maxLength - Maximum length (default: 1000)
 * @returns Truncated string
 */
export function truncate(str: string, maxLength = 1000): string {
  return str.length > maxLength ? str.slice(0, maxLength) : str
}

/**
 * Check if a string is empty (null, undefined, or only whitespace)
 */
export function isEmpty(str: string | null | undefined): boolean {
  return str == null || str.trim().length === 0
}
