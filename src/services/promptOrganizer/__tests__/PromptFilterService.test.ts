import { describe, it, expect } from "vitest"
import { PromptFilterService } from "../PromptFilterService"
import type { Prompt } from "@/types/prompt"
import type { PromptOrganizerSettings } from "@/types/promptOrganizer"

describe("PromptFilterService", () => {
  const service = new PromptFilterService()

  const createPrompt = (overrides: Partial<Prompt>): Prompt => ({
    id: crypto.randomUUID(),
    name: "Test Prompt",
    content: "Test content",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    lastExecutedAt: new Date("2025-01-15"),
    executionCount: 5,
    isPinned: false,
    isAIGenerated: false,
    ...overrides,
  })

  const defaultSettings: PromptOrganizerSettings = {
    filterPeriodDays: 30,
    filterMinExecutionCount: 2,
    filterMaxPrompts: 100,
    organizationPrompt: "Test prompt",
  }

  describe("filterPrompts", () => {
    it("should filter prompts by all criteria", () => {
      const now = new Date("2025-01-20")
      vi.setSystemTime(now)

      const prompts: Prompt[] = [
        createPrompt({
          id: "1",
          name: "Valid 1",
          executionCount: 10,
          lastExecutedAt: new Date("2025-01-19"),
        }),
        createPrompt({
          id: "2",
          name: "Valid 2",
          executionCount: 5,
          lastExecutedAt: new Date("2025-01-18"),
        }),
        createPrompt({
          id: "3",
          name: "Low execution",
          executionCount: 1,
          lastExecutedAt: new Date("2025-01-19"),
        }),
        createPrompt({
          id: "4",
          name: "Old prompt",
          executionCount: 10,
          lastExecutedAt: new Date("2024-12-01"),
        }),
        createPrompt({
          id: "5",
          name: "AI Generated",
          executionCount: 10,
          lastExecutedAt: new Date("2025-01-19"),
          isAIGenerated: true,
        }),
      ]

      const filtered = service.filterPrompts(prompts, defaultSettings)

      expect(filtered).toHaveLength(2)
      expect(filtered[0]).toMatchObject({
        id: "1",
        name: "Valid 1",
        content: "Test content",
        executionCount: 10,
      })
      expect(filtered[1]).toMatchObject({
        id: "2",
        name: "Valid 2",
        executionCount: 5,
      })

      vi.useRealTimers()
    })

    it("should exclude AI-generated prompts", () => {
      const now = new Date("2025-01-20")
      vi.setSystemTime(now)

      const prompts: Prompt[] = [
        createPrompt({
          id: "1",
          isAIGenerated: false,
          lastExecutedAt: new Date("2025-01-19"),
        }),
        createPrompt({
          id: "2",
          isAIGenerated: true,
          lastExecutedAt: new Date("2025-01-19"),
        }),
      ]

      const filtered = service.filterPrompts(prompts, defaultSettings)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe("1")

      vi.useRealTimers()
    })

    it("should filter by period", () => {
      const now = new Date("2025-02-01")
      vi.setSystemTime(now)

      const prompts: Prompt[] = [
        createPrompt({
          id: "1",
          lastExecutedAt: new Date("2025-01-31"), // 1 day ago
        }),
        createPrompt({
          id: "2",
          lastExecutedAt: new Date("2025-01-15"), // 17 days ago
        }),
        createPrompt({
          id: "3",
          lastExecutedAt: new Date("2024-12-01"), // 62 days ago
        }),
      ]

      const settings: PromptOrganizerSettings = {
        ...defaultSettings,
        filterPeriodDays: 30,
      }

      const filtered = service.filterPrompts(prompts, settings)

      expect(filtered).toHaveLength(2)
      expect(filtered.map((p) => p.id)).toEqual(["1", "2"])

      vi.useRealTimers()
    })

    it("should filter by execution count", () => {
      const now = new Date("2025-01-20")
      vi.setSystemTime(now)

      const prompts: Prompt[] = [
        createPrompt({
          id: "1",
          executionCount: 10,
          lastExecutedAt: new Date("2025-01-19"),
        }),
        createPrompt({
          id: "2",
          executionCount: 2,
          lastExecutedAt: new Date("2025-01-19"),
        }),
        createPrompt({
          id: "3",
          executionCount: 1,
          lastExecutedAt: new Date("2025-01-19"),
        }),
      ]

      const settings: PromptOrganizerSettings = {
        ...defaultSettings,
        filterMinExecutionCount: 2,
      }

      const filtered = service.filterPrompts(prompts, settings)

      expect(filtered).toHaveLength(2)
      expect(filtered.map((p) => p.id)).toEqual(["1", "2"])

      vi.useRealTimers()
    })

    it("should sort by execution count (descending)", () => {
      const now = new Date("2025-01-20")
      vi.setSystemTime(now)

      const prompts: Prompt[] = [
        createPrompt({
          id: "1",
          executionCount: 5,
          lastExecutedAt: new Date("2025-01-19"),
        }),
        createPrompt({
          id: "2",
          executionCount: 20,
          lastExecutedAt: new Date("2025-01-19"),
        }),
        createPrompt({
          id: "3",
          executionCount: 10,
          lastExecutedAt: new Date("2025-01-19"),
        }),
      ]

      const filtered = service.filterPrompts(prompts, defaultSettings)

      expect(filtered.map((p) => p.executionCount)).toEqual([20, 10, 5])

      vi.useRealTimers()
    })

    it("should limit to max prompts", () => {
      const now = new Date("2025-01-20")
      vi.setSystemTime(now)

      const prompts: Prompt[] = Array.from({ length: 10 }, (_, i) =>
        createPrompt({
          id: String(i),
          executionCount: 10 - i,
          lastExecutedAt: new Date("2025-01-19"),
        }),
      )

      const settings: PromptOrganizerSettings = {
        ...defaultSettings,
        filterMaxPrompts: 5,
      }

      const filtered = service.filterPrompts(prompts, settings)

      expect(filtered).toHaveLength(5)
      expect(filtered.map((p) => p.executionCount)).toEqual([10, 9, 8, 7, 6])

      vi.useRealTimers()
    })

    it("should convert to PromptForOrganization format", () => {
      const now = new Date("2025-01-20")
      vi.setSystemTime(now)

      const prompts: Prompt[] = [
        createPrompt({
          id: "test-id",
          name: "Test Name",
          content: "Test Content",
          executionCount: 10,
          lastExecutedAt: new Date("2025-01-19"),
          isPinned: true,
          variables: { foo: "bar" },
        }),
      ]

      const filtered = service.filterPrompts(prompts, defaultSettings)

      expect(filtered).toHaveLength(1)
      expect(filtered[0]).toEqual({
        id: "test-id",
        name: "Test Name",
        content: "Test Content",
        executionCount: 10,
      })
      expect(filtered[0]).not.toHaveProperty("isPinned")
      expect(filtered[0]).not.toHaveProperty("variables")
      expect(filtered[0]).not.toHaveProperty("lastExecutedAt")

      vi.useRealTimers()
    })

    it("should return empty array when no prompts match", () => {
      const now = new Date("2025-01-20")
      vi.setSystemTime(now)

      const prompts: Prompt[] = [
        createPrompt({
          executionCount: 1,
          lastExecutedAt: new Date("2024-01-01"),
        }),
      ]

      const filtered = service.filterPrompts(prompts, defaultSettings)

      expect(filtered).toEqual([])

      vi.useRealTimers()
    })
  })

  describe("getFilteredCount", () => {
    it("should return correct count", () => {
      const now = new Date("2025-01-20")
      vi.setSystemTime(now)

      const prompts: Prompt[] = [
        createPrompt({
          id: "1",
          executionCount: 10,
          lastExecutedAt: new Date("2025-01-19"),
        }),
        createPrompt({
          id: "2",
          executionCount: 5,
          lastExecutedAt: new Date("2025-01-19"),
        }),
        createPrompt({
          id: "3",
          executionCount: 1,
          lastExecutedAt: new Date("2025-01-19"),
        }),
      ]

      const count = service.getFilteredCount(prompts, defaultSettings)

      expect(count).toBe(2)

      vi.useRealTimers()
    })

    it("should return 0 when no prompts match", () => {
      const now = new Date("2025-01-20")
      vi.setSystemTime(now)

      const prompts: Prompt[] = [
        createPrompt({
          executionCount: 1,
          lastExecutedAt: new Date("2024-01-01"),
        }),
      ]

      const count = service.getFilteredCount(prompts, defaultSettings)

      expect(count).toBe(0)

      vi.useRealTimers()
    })
  })
})
