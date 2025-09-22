/**
 * Detect if the current platform is macOS
 */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false

  // Check platform first (more reliable)
  if (navigator.platform) {
    return /Mac|iPhone|iPod|iPad/i.test(navigator.platform)
  }

  // Fallback to userAgent
  return /Mac OS X|Macintosh/i.test(navigator.userAgent)
}

/**
 * Detect if the current platform is Windows
 */
export function isWindows(): boolean {
  if (typeof navigator === 'undefined') return false

  // Check platform first (more reliable)
  if (navigator.platform) {
    return /Win/i.test(navigator.platform)
  }

  // Fallback to userAgent
  return /Windows/i.test(navigator.userAgent)
}

/**
 * Get platform-specific key combination text
 */
export function getKeyText(macKey: string, windowsKey: string): string {
  return isMac() ? macKey : windowsKey
}