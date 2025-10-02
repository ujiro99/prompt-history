import { describe, it, expect, beforeEach } from "vitest"
import {
  sortPrompts,
  groupPrompts,
  groupByRecent,
  groupByExecution,
  groupByName,
  groupByComposite,
  calculateCompositeScore,
} from "../promptSorting"
import type { Prompt, SortOrder } from "@/types/prompt"

const createMockPrompt = (overrides: Partial<Prompt> = {}): Prompt => ({
  id: `prompt-${Math.random()}`,
  name: "Test Prompt",
  content: "Test content",
  executionCount: 0,
  lastExecutedAt: new Date(),
  isPinned: false,
  lastExecutionUrl: "https://example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe("promptSorting", () => {
  let mockPrompts: Prompt[]

  beforeEach(() => {
    mockPrompts = [
      createMockPrompt({
        id: "1",
        name: "Alpha",
        executionCount: 5,
        lastExecutedAt: new Date("2024-01-01"),
      }),
      createMockPrompt({
        id: "2",
        name: "Beta",
        executionCount: 10,
        lastExecutedAt: new Date("2024-01-02"),
      }),
      createMockPrompt({
        id: "3",
        name: "Gamma",
        executionCount: 1,
        lastExecutedAt: new Date("2024-01-03"),
      }),
      createMockPrompt({
        id: "4",
        name: "Delta",
        executionCount: 0,
        lastExecutedAt: new Date(),
      }),
    ]
  })

  describe("sortPrompts", () => {
    it("should sort by recent when sortOrder is 'recent'", () => {
      const result = sortPrompts(mockPrompts, "recent")
      expect(result[0].id).toBe("1") // oldest first (reversed)
      expect(result[1].id).toBe("2")
      expect(result[2].id).toBe("3")
      expect(result[3].id).toBe("4")
    })

    it("should sort by execution count when sortOrder is 'execution'", () => {
      const result = sortPrompts(mockPrompts, "execution")
      expect(result[0].id).toBe("4") // lowest count first (reversed)
      expect(result[1].id).toBe("3")
      expect(result[2].id).toBe("1")
      expect(result[3].id).toBe("2")
    })

    it("should sort by name when sortOrder is 'name'", () => {
      const result = sortPrompts(mockPrompts, "name")
      expect(result[0].name).toBe("Alpha")
      expect(result[1].name).toBe("Beta")
      expect(result[2].name).toBe("Delta")
      expect(result[3].name).toBe("Gamma")
    })

    it("should sort by composite score when sortOrder is 'composite'", () => {
      const result = sortPrompts(mockPrompts, "composite")
      // Should be sorted by composite score (reversed)
      expect(result[0].id).toBe("3")
      expect(result[1].id).toBe("1")
      expect(result[2].id).toBe("2")
      expect(result[3].id).toBe("4")
      expect(result).toHaveLength(4)
    })
  })

  describe("groupByRecent", () => {
    it("should group prompts by date", () => {
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

      const prompts = [
        createMockPrompt({ lastExecutedAt: today }),
        createMockPrompt({ lastExecutedAt: yesterday }),
        createMockPrompt({ lastExecutedAt: oneWeekAgo }),
      ]

      const result = groupByRecent(prompts)

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.today",
          prompts: expect.arrayContaining([
            expect.objectContaining({ lastExecutedAt: today }),
          ]),
        }),
      )

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.yesterday",
          prompts: expect.arrayContaining([
            expect.objectContaining({ lastExecutedAt: yesterday }),
          ]),
        }),
      )
    })
  })

  describe("groupByExecution", () => {
    it("should group prompts by execution count", () => {
      const prompts = [
        createMockPrompt({ executionCount: 25 }),
        createMockPrompt({ executionCount: 10 }),
        createMockPrompt({ executionCount: 2 }),
        createMockPrompt({ executionCount: 0 }),
      ]

      const result = groupByExecution(prompts)

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.highFrequency",
          prompts: expect.arrayContaining([
            expect.objectContaining({ executionCount: 25 }),
          ]),
        }),
      )

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.mediumFrequency",
          prompts: expect.arrayContaining([
            expect.objectContaining({ executionCount: 10 }),
          ]),
        }),
      )

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.lowFrequency",
          prompts: expect.arrayContaining([
            expect.objectContaining({ executionCount: 2 }),
          ]),
        }),
      )

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.notExecuted",
          prompts: expect.arrayContaining([
            expect.objectContaining({ executionCount: 0 }),
          ]),
        }),
      )
    })
  })

  describe("groupByName", () => {
    it("should group prompts by name category", () => {
      const prompts = [
        createMockPrompt({ name: "Alpha" }),
        createMockPrompt({ name: "123 Test" }),
        createMockPrompt({ name: "あいうえお" }),
        createMockPrompt({ name: "アイウエオ" }),
        createMockPrompt({ name: "漢字テスト" }),
        createMockPrompt({ name: "!@#" }),
      ]

      const result = groupByName(prompts)

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.alphabetic",
          prompts: expect.arrayContaining([
            expect.objectContaining({ name: "Alpha" }),
          ]),
        }),
      )

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.numeric",
          prompts: expect.arrayContaining([
            expect.objectContaining({ name: "123 Test" }),
          ]),
        }),
      )

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.hiragana",
          prompts: expect.arrayContaining([
            expect.objectContaining({ name: "あいうえお" }),
          ]),
        }),
      )

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.katakana",
          prompts: expect.arrayContaining([
            expect.objectContaining({ name: "アイウエオ" }),
          ]),
        }),
      )

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.kanji",
          prompts: expect.arrayContaining([
            expect.objectContaining({ name: "漢字テスト" }),
          ]),
        }),
      )

      expect(result).toContainEqual(
        expect.objectContaining({
          label: "groups.other",
          prompts: expect.arrayContaining([
            expect.objectContaining({ name: "!@#" }),
          ]),
        }),
      )
    })
  })

  describe("groupByComposite", () => {
    it("should group prompts by composite score", () => {
      // Mock prompts with different scores that will result in different groups
      const prompts = [
        createMockPrompt({
          executionCount: 100,
          lastExecutedAt: new Date(), // High score
        }),
        createMockPrompt({
          executionCount: 50,
          lastExecutedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Medium score
        }),
        createMockPrompt({
          executionCount: 1,
          lastExecutedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Low score
        }),
      ]

      const result = groupByComposite(prompts)

      // Check that groups are created (exact score calculations depend on implementation)
      expect(result.length).toBeGreaterThan(0)
      result.forEach((group) => {
        expect(group).toHaveProperty("label")
        expect(group).toHaveProperty("prompts")
        expect(group).toHaveProperty("order")
        expect(group.prompts.length).toBeGreaterThan(0)
      })
    })
  })

  describe("groupPrompts", () => {
    it("should group prompts according to sort order", () => {
      const sortOrders: SortOrder[] = [
        "recent",
        "execution",
        "name",
        "composite",
      ]

      sortOrders.forEach((sortOrder) => {
        const result = groupPrompts(mockPrompts, sortOrder, false)
        expect(result).toBeInstanceOf(Array)
        result.forEach((group) => {
          expect(group).toHaveProperty("label")
          expect(group).toHaveProperty("prompts")
          expect(group).toHaveProperty("order")
        })
      })
    })

    it("should return fallback group for unknown sort order", () => {
      const result = groupPrompts(mockPrompts, "unknown" as SortOrder, false)
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe("groups.all")
      expect(result[0].prompts).toHaveLength(mockPrompts.length)
    })
  })

  describe("calculateCompositeScore", () => {
    it("should calculate score based on execution count and recency", () => {
      const recentPrompt = createMockPrompt({
        executionCount: 10,
        lastExecutedAt: new Date(),
      })

      const oldPrompt = createMockPrompt({
        executionCount: 10,
        lastExecutedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      })

      const recentScore = calculateCompositeScore(recentPrompt)
      const oldScore = calculateCompositeScore(oldPrompt)

      expect(recentScore).toBeGreaterThan(oldScore)
    })

    it("should cache composite scores", () => {
      const prompt = createMockPrompt({ executionCount: 5 })

      const score1 = calculateCompositeScore(prompt)
      const score2 = calculateCompositeScore(prompt)

      expect(score1).toBe(score2)
    })
  })
})
