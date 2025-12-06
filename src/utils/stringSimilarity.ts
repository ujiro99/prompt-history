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
 * Calculate Levenshtein distance (edit distance) between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Minimum number of single-character edits (insertions, deletions, or substitutions)
 */
export function calculateLevenshteinDistance(
  str1: string,
  str2: string,
): number {
  if (!str1) return str2.length
  if (!str2) return str1.length

  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Calculate similarity based on Levenshtein distance
 * Better for handling insertions/deletions compared to position-based similarity
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity percentage (0-100)
 */
export function calculateLevenshteinSimilarity(
  str1: string,
  str2: string,
): number {
  if (!str1 && !str2) return 0
  if (!str1 || !str2) return 0
  if (str1 === str2) return 100

  const distance = calculateLevenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)
  return ((maxLength - distance) / maxLength) * 100
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

/**
 * Find best matching string using Levenshtein distance
 * Better for handling character insertions/deletions (e.g., 1-char missing pattern)
 * @param target Target string to match
 * @param candidates Candidate strings
 * @param threshold Minimum similarity threshold (0-100)
 * @returns Best match or null if no match above threshold
 */
export function findBestMatchLevenshtein(
  target: string,
  candidates: string[],
  threshold: number = 90,
): { match: string; similarity: number } | null {
  let bestMatch: string | null = null
  let bestSimilarity = 0

  for (const candidate of candidates) {
    const similarity = calculateLevenshteinSimilarity(target, candidate)
    if (similarity >= threshold && similarity > bestSimilarity) {
      bestMatch = candidate
      bestSimilarity = similarity
    }
  }

  return bestMatch ? { match: bestMatch, similarity: bestSimilarity } : null
}
