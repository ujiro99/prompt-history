import { describe, it, expect, beforeEach, vi } from "vitest"
import { CostEstimatorService } from "../CostEstimatorService"
import type { TokenUsage } from "@/types/promptOrganizer"

// Mock pricing constants
vi.mock("../pricing", () => ({
  GEMINI_PRICING: {
    inputTokenPer1M: 0.3,
    outputTokenPer1M: 2.5,
    usdToJpy: 150,
  },
  GEMINI_CONTEXT_LIMIT: 1_000_000,
}))

// Mock all services with vi.hoisted
const {
  mockGeminiClient,
  mockPromptFilterService,
  mockTemplateGeneratorService,
  mockCategoryService,
  mockPromptsService,
  mockGenaiApiKeyStorage,
} = vi.hoisted(() => {
  const mockGeminiClient = {
    initialize: vi.fn(),
    isInitialized: vi.fn(() => true),
    estimateTokens: vi.fn(async () => 10000),
  }

  const mockPromptFilterService = {
    filterPrompts: vi.fn(() => [
      {
        id: "1",
        name: "Prompt 1",
        content: "Content 1",
        executionCount: 10,
      },
      {
        id: "2",
        name: "Prompt 2",
        content: "Content 2",
        executionCount: 5,
      },
    ]),
  }

  const mockTemplateGeneratorService = {
    buildPrompt: vi.fn(() => "System instruction + Categories + Prompts"),
  }

  const mockCategoryService = {
    getAll: vi.fn(async () => [
      { id: "cat1", name: "Category 1" },
      { id: "cat2", name: "Category 2" },
    ]),
  }

  const mockPromptsService = {
    getAllPrompts: vi.fn(async () => [
      {
        id: "1",
        name: "Prompt 1",
        content: "Content 1",
        executionCount: 10,
        lastExecutedAt: new Date("2025-01-19"),
        isAIGenerated: false,
      },
      {
        id: "2",
        name: "Prompt 2",
        content: "Content 2",
        executionCount: 5,
        lastExecutedAt: new Date("2025-01-18"),
        isAIGenerated: false,
      },
    ]),
  }

  const mockGenaiApiKeyStorage = {
    getValue: vi.fn(async () => "test-api-key"),
  }

  return {
    mockGeminiClient,
    mockPromptFilterService,
    mockTemplateGeneratorService,
    mockCategoryService,
    mockPromptsService,
    mockGenaiApiKeyStorage,
  }
})

vi.mock("@/services/genai/GeminiClient", () => ({
  GeminiClient: {
    getInstance: () => mockGeminiClient,
  },
}))

vi.mock("../PromptFilterService", () => ({
  promptFilterService: mockPromptFilterService,
}))

vi.mock("../TemplateGeneratorService", () => ({
  TemplateGeneratorService: vi.fn(() => mockTemplateGeneratorService),
}))

vi.mock("../CategoryService", () => ({
  categoryService: mockCategoryService,
}))

vi.mock("@/services/storage/prompts", () => ({
  promptsService: mockPromptsService,
}))

vi.mock("@/services/storage/definitions", () => ({
  genaiApiKeyStorage: mockGenaiApiKeyStorage,
}))

describe("CostEstimatorService", () => {
  let service: CostEstimatorService

  beforeEach(() => {
    service = new CostEstimatorService()
    vi.clearAllMocks()
  })

  describe("calculateCost", () => {
    it("should calculate cost from token usage", () => {
      const usage: TokenUsage = {
        inputTokens: 10000,
        outputTokens: 5000,
      }

      const cost = service.calculateCost(usage)

      // Input: (10000 / 1000000) * 0.3 = 0.003 USD
      // Output: (5000 / 1000000) * 2.5 = 0.0125 USD
      // Total: 0.0155 USD
      // JPY: 0.0155 * 150 = 2.325
      expect(cost).toBeCloseTo(2.325, 3)
    })

    it("should handle zero tokens", () => {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
      }

      const cost = service.calculateCost(usage)

      expect(cost).toBe(0)
    })

    it("should calculate cost for only input tokens", () => {
      const usage: TokenUsage = {
        inputTokens: 10000,
        outputTokens: 0,
      }

      const cost = service.calculateCost(usage)

      // Input: (10000 / 1000000) * 0.3 = 0.003 USD
      // JPY: 0.003 * 150 = 0.45
      expect(cost).toBeCloseTo(0.45, 3)
    })

    it("should calculate cost for only output tokens", () => {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 10000,
      }

      const cost = service.calculateCost(usage)

      // Output: (10000 / 1000000) * 2.5 = 0.025 USD
      // JPY: 0.025 * 150 = 3.75
      expect(cost).toBeCloseTo(3.75, 3)
    })

    it("should handle large token counts", () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 500_000,
      }

      const cost = service.calculateCost(usage)

      // Input: (1000000 / 1000000) * 0.3 = 0.3 USD
      // Output: (500000 / 1000000) * 2.5 = 1.25 USD
      // Total: 1.55 USD
      // JPY: 1.55 * 150 = 232.5
      expect(cost).toBeCloseTo(232.5, 1)
    })
  })

  describe("estimateExecution", () => {
    const defaultSettings = {
      filterPeriodDays: 30,
      filterMinExecutionCount: 2,
      filterMaxPrompts: 100,
      organizationPrompt: "Test prompt",
    }

    it("should estimate execution cost", async () => {
      vi.setSystemTime(new Date("2025-01-20"))

      const estimate = await service.estimateExecution(defaultSettings)

      expect(estimate).toMatchObject({
        targetPromptCount: 2,
        estimatedInputTokens: 10000,
        estimatedOutputTokens: 5000,
        model: "gemini-2.5-flash",
        contextLimit: 1_000_000,
      })
      expect(estimate.contextUsageRate).toBeCloseTo(0.01, 2)
      expect(estimate.estimatedCost).toBeCloseTo(2.325, 3)

      vi.useRealTimers()
    })

    it("should call all dependencies correctly", async () => {
      vi.setSystemTime(new Date("2025-01-20"))

      await service.estimateExecution(defaultSettings)

      expect(mockPromptsService.getAllPrompts).toHaveBeenCalledOnce()
      expect(mockPromptFilterService.filterPrompts).toHaveBeenCalledWith(
        expect.anything(),
        defaultSettings,
      )
      expect(mockCategoryService.getAll).toHaveBeenCalledOnce()
      expect(mockTemplateGeneratorService.buildPrompt).toHaveBeenCalled()
      expect(mockGeminiClient.estimateTokens).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it("should initialize GeminiClient if not initialized", async () => {
      mockGeminiClient.isInitialized.mockReturnValueOnce(false)

      await service.estimateExecution(defaultSettings)

      expect(mockGenaiApiKeyStorage.getValue).toHaveBeenCalledOnce()
      expect(mockGeminiClient.initialize).toHaveBeenCalledWith("test-api-key")
    })

    it("should not reinitialize if already initialized", async () => {
      mockGeminiClient.isInitialized.mockReturnValue(true)

      await service.estimateExecution(defaultSettings)

      expect(mockGenaiApiKeyStorage.getValue).not.toHaveBeenCalled()
      expect(mockGeminiClient.initialize).not.toHaveBeenCalled()
    })

    it("should calculate context usage rate correctly", async () => {
      mockGeminiClient.estimateTokens.mockResolvedValueOnce(500_000)

      const estimate = await service.estimateExecution(defaultSettings)

      expect(estimate.contextUsageRate).toBeCloseTo(0.5, 2)
    })

    it("should estimate output tokens as 0.5 x input tokens", async () => {
      mockGeminiClient.estimateTokens.mockResolvedValueOnce(20000)

      const estimate = await service.estimateExecution(defaultSettings)

      expect(estimate.estimatedInputTokens).toBe(20000)
      expect(estimate.estimatedOutputTokens).toBe(10000)
    })
  })
})
