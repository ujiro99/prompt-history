import type { Prompt, SortOrder, PromptGroup } from "@/types/prompt"

/**
 * Cache for composite scores to avoid recalculating
 */
const compositeScoreCache = new WeakMap<Prompt, number>()

/**
 * Calculate composite score based on execution count and recency
 */
export function calculateCompositeScore(prompt: Prompt): number {
  // Check if score is already cached
  const cachedScore = compositeScoreCache.get(prompt)
  if (cachedScore !== undefined) {
    return cachedScore
  }

  const executionWeight = 1.0
  const recencyWeight = 0.5

  // Calculate days since last execution
  const now = new Date()
  const lastExecutedAt = new Date(prompt.lastExecutedAt)
  const daysDiff = Math.floor(
    (now.getTime() - lastExecutedAt.getTime()) / (1000 * 60 * 60 * 24),
  )

  // Calculate recency score (0-100, higher is more recent)
  const recencyScore = Math.max(0, 100 - daysDiff)

  // Calculate composite score
  const score =
    prompt.executionCount * executionWeight + recencyScore * recencyWeight

  // Cache the result
  compositeScoreCache.set(prompt, score)

  return score
}

/**
 * Clear composite score cache for a specific prompt
 */
export function clearCompositeScoreCache(prompt: Prompt): void {
  compositeScoreCache.delete(prompt)
}

/**
 * Sort prompts based on the specified sort order
 */
export function sortPrompts(prompts: Prompt[], sortOrder: SortOrder): Prompt[] {
  // Create a copy to avoid mutating the original array
  const sortedPrompts = [...prompts]

  switch (sortOrder) {
    case "recent":
      return sortedPrompts
        .sort((a, b) => b.lastExecutedAt.getTime() - a.lastExecutedAt.getTime())
        .reverse()
    case "execution":
      return sortedPrompts
        .sort((a, b) => b.executionCount - a.executionCount)
        .reverse()
    case "name":
      return sortedPrompts.sort((a, b) => a.name.localeCompare(b.name))
    case "composite":
      return sortedPrompts
        .sort((a, b) => {
          const scoreA = calculateCompositeScore(a)
          const scoreB = calculateCompositeScore(b)

          // Primary sort: composite score (descending)
          if (scoreB !== scoreA) {
            return scoreB - scoreA
          }

          // Secondary sort: recent (descending)
          return b.lastExecutedAt.getTime() - a.lastExecutedAt.getTime()
        })
        .reverse()
    default:
      return sortedPrompts
  }
}

/**
 * Group prompts by recent usage (date-based)
 */
export function groupByRecent(prompts: Prompt[]): PromptGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const groups: PromptGroup[] = []
  const dateGroups = new Map<string, Prompt[]>()

  for (const prompt of prompts) {
    const lastExecuted = new Date(prompt.lastExecutedAt)

    if (lastExecuted >= today) {
      // Today
      const existing = dateGroups.get("today") || []
      dateGroups.set("today", [...existing, prompt])
    } else if (lastExecuted >= yesterday) {
      // Yesterday
      const existing = dateGroups.get("yesterday") || []
      dateGroups.set("yesterday", [...existing, prompt])
    } else if (lastExecuted >= oneWeekAgo) {
      // Within a week
      const existing = dateGroups.get("week") || []
      dateGroups.set("week", [...existing, prompt])
    } else if (lastExecuted >= oneMonthAgo) {
      // Within a month
      const existing = dateGroups.get("month") || []
      dateGroups.set("month", [...existing, prompt])
    } else {
      // More than a month ago - group by year
      const year = lastExecuted.getFullYear()
      const yearKey = `year-${year}`
      const existing = dateGroups.get(yearKey) || []
      dateGroups.set(yearKey, [...existing, prompt])
    }
  }

  // Create groups in order
  let order = 0

  if (dateGroups.has("today")) {
    groups.push({
      label: "groups.today",
      prompts: dateGroups.get("today")!,
      order: order++,
    })
  }

  if (dateGroups.has("yesterday")) {
    groups.push({
      label: "groups.yesterday",
      prompts: dateGroups.get("yesterday")!,
      order: order++,
    })
  }

  if (dateGroups.has("week")) {
    groups.push({
      label: "groups.thisWeek",
      prompts: dateGroups.get("week")!,
      order: order++,
    })
  }

  if (dateGroups.has("month")) {
    groups.push({
      label: "groups.thisMonth",
      prompts: dateGroups.get("month")!,
      order: order++,
    })
  }

  // Add year groups (sorted by year, descending)
  const yearGroups = Array.from(dateGroups.entries())
    .filter(([key]) => key.startsWith("year-"))
    .sort(([a], [b]) => {
      const yearA = parseInt(a.split("-")[1])
      const yearB = parseInt(b.split("-")[1])
      return yearB - yearA
    })

  for (const [key, prompts] of yearGroups) {
    const year = key.split("-")[1]
    groups.push({
      label: `groups.year:${year}`,
      prompts,
      order: order++,
    })
  }

  return groups
}

/**
 * Group prompts by execution count
 */
export function groupByExecution(prompts: Prompt[]): PromptGroup[] {
  const groups: PromptGroup[] = [
    { label: "groups.highFrequency", prompts: [], order: 0 },
    { label: "groups.mediumFrequency", prompts: [], order: 1 },
    { label: "groups.lowFrequency", prompts: [], order: 2 },
    { label: "groups.notExecuted", prompts: [], order: 3 },
  ]

  for (const prompt of prompts) {
    if (prompt.executionCount >= 20) {
      groups[0].prompts.push(prompt)
    } else if (prompt.executionCount >= 5) {
      groups[1].prompts.push(prompt)
    } else if (prompt.executionCount >= 1) {
      groups[2].prompts.push(prompt)
    } else {
      groups[3].prompts.push(prompt)
    }
  }

  // Filter out empty groups
  return groups.filter((group) => group.prompts.length > 0)
}

/**
 * Group prompts by name (first character)
 */
export function groupByName(prompts: Prompt[]): PromptGroup[] {
  const groups = new Map<string, Prompt[]>()

  for (const prompt of prompts) {
    const firstChar = prompt.name.charAt(0).toLowerCase()
    let groupKey: string

    if (/[a-z]/.test(firstChar)) {
      groupKey = "alphabetic"
    } else if (/[0-9]/.test(firstChar)) {
      groupKey = "numeric"
    } else if (/[あ-ん]/.test(firstChar)) {
      groupKey = "hiragana"
    } else if (/[ア-ン]/.test(firstChar)) {
      groupKey = "katakana"
    } else if (/[一-龯]/.test(firstChar)) {
      groupKey = "kanji"
    } else {
      groupKey = "other"
    }

    const existing = groups.get(groupKey) || []
    groups.set(groupKey, [...existing, prompt])
  }

  // Convert to PromptGroup array with defined order
  const groupOrder = [
    "alphabetic",
    "numeric",
    "hiragana",
    "katakana",
    "kanji",
    "other",
  ]
  const result: PromptGroup[] = []

  groupOrder.forEach((groupKey, index) => {
    if (groups.has(groupKey)) {
      result.push({
        label: `groups.${groupKey}`,
        prompts: groups.get(groupKey)!,
        order: index,
      })
    }
  })

  return result
}

/**
 * Group prompts by composite score
 */
export function groupByComposite(prompts: Prompt[]): PromptGroup[] {
  const groups: PromptGroup[] = [
    { label: "groups.highestScore", prompts: [], order: 0 },
    { label: "groups.highScore", prompts: [], order: 1 },
    { label: "groups.mediumScore", prompts: [], order: 2 },
    { label: "groups.lowScore", prompts: [], order: 3 },
    { label: "groups.lowestScore", prompts: [], order: 4 },
  ]

  for (const prompt of prompts) {
    const score = calculateCompositeScore(prompt)

    if (score >= 80) {
      groups[0].prompts.push(prompt)
    } else if (score >= 60) {
      groups[1].prompts.push(prompt)
    } else if (score >= 40) {
      groups[2].prompts.push(prompt)
    } else if (score >= 20) {
      groups[3].prompts.push(prompt)
    } else {
      groups[4].prompts.push(prompt)
    }
  }

  // Filter out empty groups
  return groups.filter((group) => group.prompts.length > 0)
}

/**
 * Group prompts based on sort order
 */
export function groupPrompts(
  prompts: Prompt[],
  sortOrder: SortOrder,
): PromptGroup[] {
  const sortedPrompts = sortPrompts(prompts, sortOrder)

  switch (sortOrder) {
    case "recent":
      return groupByRecent(sortedPrompts)
    case "execution":
      return groupByExecution(sortedPrompts)
    case "name":
      return groupByName(sortedPrompts)
    case "composite":
      return groupByComposite(sortedPrompts)
    default:
      // Fallback: return all prompts in a single group
      return [
        {
          label: "groups.all",
          prompts: sortedPrompts,
          order: 0,
        },
      ]
  }
}
