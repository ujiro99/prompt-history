import { describe, it, expect } from "vitest"
import { calculateSimilarity, findBestMatch } from "../stringSimilarity"

describe("calculateSimilarity", () => {
  it("should return 100% for exact match", () => {
    const str1 = "prompt_9eb3c927-53c9-4eea-9ba0-a344d6e95bd4"
    const str2 = "prompt_9eb3c927-53c9-4eea-9ba0-a344d6e95bd4"
    expect(calculateSimilarity(str1, str2)).toBe(100)
  })

  it("should return ~97.67% for 1 character difference in 43-char string", () => {
    const str1 = "prompt_9eb3c927-53c9-4eea-9ba0-a344d6e95bd4" // 47 chars
    const str2 = "prompt_9eb3c927-53c9-4eea-9ba0-a344c6e95bd4" // d → c
    const similarity = calculateSimilarity(str1, str2)
    // 42 matches out of 43 = ~97.67%
    expect(similarity).toBeGreaterThan(97)
    expect(similarity).toBeLessThan(98)
  })

  it("should return ~90.70% for 4 character differences", () => {
    const str1 = "prompt_9eb3c927-53c9-4eea-9ba0-a344d6e95bd4"
    const str2 = "prompt_9eb3c927-53c9-4eea-9ba0-a344c6e95xxx" // 4 chars different
    const similarity = calculateSimilarity(str1, str2)
    // 39 matches out of 43 = ~90.70%
    expect(similarity).toBeGreaterThan(90)
    expect(similarity).toBeLessThan(91)
  })

  it("should return ~88.37% for 5 character differences", () => {
    const str1 = "prompt_9eb3c927-53c9-4eea-9ba0-a344d6e95bd4"
    const str2 = "prompt_9eb3c927-53c9-4eea-9ba0-a344c6e9xxxx" // 5 chars different
    const similarity = calculateSimilarity(str1, str2)
    // 38 matches out of 43 = ~88.37%
    expect(similarity).toBeGreaterThan(88)
    expect(similarity).toBeLessThan(89)
  })

  it("should return 0% for empty strings", () => {
    expect(calculateSimilarity("", "")).toBe(0)
    expect(calculateSimilarity("test", "")).toBe(0)
    expect(calculateSimilarity("", "test")).toBe(0)
  })

  it("should handle different length strings", () => {
    const str1 = "short"
    const str2 = "short_string"
    // 5 matches out of 12 max = 41.67%
    const similarity = calculateSimilarity(str1, str2)
    expect(similarity).toBeCloseTo(41.67, 1)
  })

  it("should handle completely different strings", () => {
    const str1 = "prompt_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    const str2 = "prompt_bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    // Only "prompt_" matches (7 chars out of 43 max)
    const similarity = calculateSimilarity(str1, str2)
    // 11 matches (prompt_ + some hyphens) / 43 = ~25.58%
    expect(similarity).toBeGreaterThan(25)
    expect(similarity).toBeLessThan(26)
  })
})

describe("findBestMatch", () => {
  const candidates = [
    "prompt_9eb3c927-53c9-4eea-9ba0-a344d6e95bd4",
    "prompt_abc12345-1234-1234-1234-123456789abc",
    "prompt_def67890-5678-5678-5678-567890abcdef",
  ]

  it("should find exact match", () => {
    const target = "prompt_9eb3c927-53c9-4eea-9ba0-a344d6e95bd4"
    const result = findBestMatch(target, candidates)
    expect(result).not.toBeNull()
    expect(result?.match).toBe(target)
    expect(result?.similarity).toBe(100)
  })

  it("should find best match with 1-char difference above 90% threshold", () => {
    const target = "prompt_9eb3c927-53c9-4eea-9ba0-a344c6e95bd4" // d → c
    const result = findBestMatch(target, candidates, 90)
    expect(result).not.toBeNull()
    expect(result?.match).toBe(candidates[0])
    expect(result?.similarity).toBeGreaterThan(90)
  })

  it("should return null when no match above threshold", () => {
    const target = "prompt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    const result = findBestMatch(target, candidates, 90)
    expect(result).toBeNull()
  })

  it("should choose highest similarity when multiple matches", () => {
    const target = "prompt_9eb3c927-53c9-4eea-9ba0-a344d6e95bd4"
    const similarCandidates = [
      "prompt_9eb3c927-53c9-4eea-9ba0-a344c6e95bd4", // 1 char diff
      "prompt_9eb3c927-53c9-4eea-9ba0-a344d6e95bd4", // exact match
      "prompt_9eb3c927-53c9-4eea-9ba0-a344cce95bd4", // 2 char diff
    ]
    const result = findBestMatch(target, similarCandidates, 90)
    expect(result).not.toBeNull()
    expect(result?.match).toBe(similarCandidates[1]) // exact match
    expect(result?.similarity).toBe(100)
  })

  it("should use custom threshold", () => {
    const target = "prompt_9eb3c927-53c9-4eea-9ba0-a344d6e95xxx" // 3 chars diff
    const result = findBestMatch(target, candidates, 94) // threshold 94%
    // Actual similarity is ~93.02%, so should not match 94% threshold
    expect(result).toBeNull()
  })

  it("should work with default 90% threshold", () => {
    const target = "prompt_9eb3c927-53c9-4eea-9ba0-a344d6e95xxx" // 4 chars diff (~91%)
    const result = findBestMatch(target, candidates) // default 90%
    expect(result).not.toBeNull()
    expect(result?.match).toBe(candidates[0])
  })
})
