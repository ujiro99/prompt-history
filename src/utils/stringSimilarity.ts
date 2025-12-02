/**
 * String similarity utilities for fuzzy matching
 */

/**
 * Calculate character-level similarity between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity percentage (0-100)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 0 // Both empty
  if (!str1 || !str2) return 0 // One empty
  if (str1 === str2) return 100 // Exact match

  const maxLength = Math.max(str1.length, str2.length)
  let matches = 0

  const minLength = Math.min(str1.length, str2.length)
  for (let i = 0; i < minLength; i++) {
    if (str1[i] === str2[i]) {
      matches++
    }
  }

  return (matches / maxLength) * 100
}

/**
 * Find best matching string from candidates
 * @param target Target string to match
 * @param candidates Candidate strings
 * @param threshold Minimum similarity threshold (0-100)
 * @returns Best match or null if no match above threshold
 */
export function findBestMatch(
  target: string,
  candidates: string[],
  threshold: number = 90,
): { match: string; similarity: number } | null {
  let bestMatch: string | null = null
  let bestSimilarity = 0

  for (const candidate of candidates) {
    const similarity = calculateSimilarity(target, candidate)
    if (similarity >= threshold && similarity > bestSimilarity) {
      bestMatch = candidate
      bestSimilarity = similarity
    }
  }

  return bestMatch ? { match: bestMatch, similarity: bestSimilarity } : null
}
