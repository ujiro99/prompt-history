import { describe, it, expect, beforeEach, vi } from "vitest"
import { PromptOrganizerService } from "../PromptOrganizerService"
import type {
  PromptOrganizerSettings,
  OrganizerExecutionEstimate,
  TemplateCandidate,
} from "@/types/promptOrganizer"
import type { Prompt } from "@/types/prompt"

// Mock services with vi.hoisted
const {
  mockPromptFilterService,
  mockTemplateGeneratorService,
  mockCategoryService,
  mockDefaultCategories,
  mockCostEstimatorService,
  mockTemplateSaveService,
  mockPromptsService,
} = vi.hoisted(() => {
  const mockPromptFilterService = {
    filterPrompts: vi.fn(() => [
      { id: "1", name: "Prompt 1", content: "Content 1", executionCount: 10 },
      { id: "2", name: "Prompt 2", content: "Content 2", executionCount: 5 },
    ]),
  }

  const mockTemplateGeneratorService = {
    generateTemplates: vi.fn(async () => ({
      templates: [
        {
          title: "Test Template",
          content: "Test {{variable}}",
          useCase: "Test use case",
          categoryId: "test-cat",
          sourcePromptIds: ["1", "2", "3"],
          variables: [
            { name: "variable1", description: "Var 1" },
            { name: "variable2", description: "Var 2" },
          ],
        },
      ],
      usage: {
        inputTokens: 10000,
        outputTokens: 5000,
      },
    })),
  }

  const mockCategoryService = {
    getAll: vi.fn(async () => [
      {
        id: "test-cat",
        name: "Test Category",
        description: "Test desc",
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
    getById: vi.fn(async (id: string) =>
      id === "test-cat"
        ? {
            id: "test-cat",
            name: "Test Category",
            description: "Test desc",
            isDefault: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : undefined,
    ),
  }

  const mockDefaultCategories = {
    other: {
      id: "other",
      name: "Other",
    },
  }

  const mockCostEstimatorService = {
    calculateCost: vi.fn(() => 2.5),
    estimateExecution: vi.fn(
      async (): Promise<OrganizerExecutionEstimate> => ({
        targetPromptCount: 2,
        estimatedInputTokens: 10000,
        estimatedOutputTokens: 5000,
        contextUsageRate: 0.01,
        estimatedCost: 2.5,
        model: "gemini-2.5-flash",
        contextLimit: 1_000_000,
      }),
    ),
  }

  const mockTemplateSaveService = {
    saveTemplates: vi.fn(async () => {}),
  }

  const mockPromptsService = {
    getAllPrompts: vi.fn(async (): Promise<Prompt[]> => [
      {
        id: "1",
        name: "Prompt 1",
        content: "Content 1",
        executionCount: 10,
        lastExecutedAt: new Date("2025-01-19"),
        createdAt: new Date(),
        updatedAt: new Date(),
        isPinned: false,
        isAIGenerated: false,
      },
      {
        id: "2",
        name: "Prompt 2",
        content: "Content 2",
        executionCount: 5,
        lastExecutedAt: new Date("2025-01-18"),
        createdAt: new Date(),
        updatedAt: new Date(),
        isPinned: false,
        isAIGenerated: false,
      },
    ]),
  }

  return {
    mockPromptFilterService,
    mockTemplateGeneratorService,
    mockCategoryService,
    mockDefaultCategories,
    mockCostEstimatorService,
    mockTemplateSaveService,
    mockPromptsService,
  }
})

vi.mock("../PromptFilterService", () => ({
  PromptFilterService: vi.fn(() => mockPromptFilterService),
}))

vi.mock("../TemplateGeneratorService", () => ({
  TemplateGeneratorService: vi.fn(() => mockTemplateGeneratorService),
}))

vi.mock("../CategoryService", () => ({
  categoryService: mockCategoryService,
}))

vi.mock("../defaultCategories", () => ({
  DEFAULT_CATEGORIES: mockDefaultCategories,
}))

vi.mock("../CostEstimatorService", () => ({
  costEstimatorService: mockCostEstimatorService,
}))

vi.mock("../TemplateSaveService", () => ({
  templateSaveService: mockTemplateSaveService,
}))

vi.mock("@/services/storage/prompts", () => ({
  promptsService: mockPromptsService,
}))

describe("PromptOrganizerService", () => {
  let service: PromptOrganizerService

  beforeEach(() => {
    service = new PromptOrganizerService()
    vi.clearAllMocks()
  })

  const defaultSettings: PromptOrganizerSettings = {
    filterPeriodDays: 30,
    filterMinExecutionCount: 2,
    filterMaxPrompts: 100,
    organizationPrompt: "Test organization prompt",
  }

  describe("executeOrganization", () => {
    it("should orchestrate full organization flow", async () => {
      const result = await service.executeOrganization(defaultSettings)

      expect(mockPromptsService.getAllPrompts).toHaveBeenCalledOnce()
      expect(mockPromptFilterService.filterPrompts).toHaveBeenCalledOnce()
      expect(mockCategoryService.getAll).toHaveBeenCalledOnce()
      expect(mockTemplateGeneratorService.generateTemplates).toHaveBeenCalledOnce()
      expect(mockCostEstimatorService.calculateCost).toHaveBeenCalledOnce()
      expect(result).toHaveProperty("templates")
      expect(result).toHaveProperty("sourceCount", 2)
      expect(result).toHaveProperty("periodDays", 30)
      expect(result).toHaveProperty("executedAt")
      expect(result).toHaveProperty("inputTokens", 10000)
      expect(result).toHaveProperty("outputTokens", 5000)
      expect(result).toHaveProperty("estimatedCost", 2.5)
    })

    it("should convert templates to candidates correctly", async () => {
      const result = await service.executeOrganization(defaultSettings)

      expect(result.templates).toHaveLength(1)
      const candidate = result.templates[0]

      expect(candidate).toMatchObject({
        title: "Test Template",
        content: "Test {{variable}}",
        useCase: "Test use case",
        categoryId: "test-cat",
        userAction: "pending",
      })
      expect(candidate.id).toBeDefined()
      expect(candidate.variables).toHaveLength(2)
      expect(candidate.aiMetadata).toMatchObject({
        sourcePromptIds: ["1", "2", "3"],
        sourceCount: 3,
        sourcePeriodDays: 30,
        confirmed: false,
        showInPinned: true,
      })
    })

    it("should enforce title max length (20 chars)", async () => {
      mockTemplateGeneratorService.generateTemplates.mockResolvedValueOnce({
        templates: [
          {
            title: "This is a very long template title that exceeds limit",
            content: "Content",
            useCase: "Use case",
            categoryId: "test-cat",
            sourcePromptIds: ["1"],
            variables: [],
          },
        ],
        usage: { inputTokens: 1000, outputTokens: 500 },
      })

      const result = await service.executeOrganization(defaultSettings)

      expect(result.templates[0].title).toBe("This is a very long ")
      expect(result.templates[0].title.length).toBe(20)
    })

    it("should enforce useCase max length (40 chars)", async () => {
      mockTemplateGeneratorService.generateTemplates.mockResolvedValueOnce({
        templates: [
          {
            title: "Title",
            content: "Content",
            useCase:
              "This is a very long use case description that exceeds the limit",
            categoryId: "test-cat",
            sourcePromptIds: ["1"],
            variables: [],
          },
        ],
        usage: { inputTokens: 1000, outputTokens: 500 },
      })

      const result = await service.executeOrganization(defaultSettings)

      expect(result.templates[0].useCase).toBe(
        "This is a very long use case description",
      )
      expect(result.templates[0].useCase.length).toBe(40)
    })

    it("should fallback to 'other' category when category not found", async () => {
      mockTemplateGeneratorService.generateTemplates.mockResolvedValueOnce({
        templates: [
          {
            title: "Title",
            content: "Content",
            useCase: "Use case",
            categoryId: "non-existent-cat",
            sourcePromptIds: ["1"],
            variables: [],
          },
        ],
        usage: { inputTokens: 1000, outputTokens: 500 },
      })
      mockCategoryService.getById.mockResolvedValueOnce(undefined)

      const result = await service.executeOrganization(defaultSettings)

      expect(result.templates[0].categoryId).toBe("other")
    })

    it("should set showInPinned to true when sourceCount >= 3 and variables >= 2", async () => {
      mockTemplateGeneratorService.generateTemplates.mockResolvedValueOnce({
        templates: [
          {
            title: "Title",
            content: "Content",
            useCase: "Use case",
            categoryId: "test-cat",
            sourcePromptIds: ["1", "2", "3"],
            variables: [
              { name: "var1", description: "Var 1" },
              { name: "var2", description: "Var 2" },
            ],
          },
        ],
        usage: { inputTokens: 1000, outputTokens: 500 },
      })

      const result = await service.executeOrganization(defaultSettings)

      expect(result.templates[0].aiMetadata.showInPinned).toBe(true)
    })

    it("should set showInPinned to false when sourceCount < 3", async () => {
      mockTemplateGeneratorService.generateTemplates.mockResolvedValueOnce({
        templates: [
          {
            title: "Title",
            content: "Content",
            useCase: "Use case",
            categoryId: "test-cat",
            sourcePromptIds: ["1", "2"],
            variables: [
              { name: "var1", description: "Var 1" },
              { name: "var2", description: "Var 2" },
            ],
          },
        ],
        usage: { inputTokens: 1000, outputTokens: 500 },
      })

      const result = await service.executeOrganization(defaultSettings)

      expect(result.templates[0].aiMetadata.showInPinned).toBe(false)
    })

    it("should set showInPinned to false when variables < 2", async () => {
      mockTemplateGeneratorService.generateTemplates.mockResolvedValueOnce({
        templates: [
          {
            title: "Title",
            content: "Content",
            useCase: "Use case",
            categoryId: "test-cat",
            sourcePromptIds: ["1", "2", "3"],
            variables: [{ name: "var1", description: "Var 1" }],
          },
        ],
        usage: { inputTokens: 1000, outputTokens: 500 },
      })

      const result = await service.executeOrganization(defaultSettings)

      expect(result.templates[0].aiMetadata.showInPinned).toBe(false)
    })

    it("should throw error when no prompts match filter", async () => {
      mockPromptFilterService.filterPrompts.mockReturnValueOnce([])

      await expect(
        service.executeOrganization(defaultSettings),
      ).rejects.toThrow("No prompts match the filter criteria")
    })

    it("should handle multiple templates", async () => {
      mockTemplateGeneratorService.generateTemplates.mockResolvedValueOnce({
        templates: [
          {
            title: "Template 1",
            content: "Content 1",
            useCase: "Use case 1",
            categoryId: "test-cat",
            sourcePromptIds: ["1"],
            variables: [],
          },
          {
            title: "Template 2",
            content: "Content 2",
            useCase: "Use case 2",
            categoryId: "test-cat",
            sourcePromptIds: ["2"],
            variables: [],
          },
        ],
        usage: { inputTokens: 1000, outputTokens: 500 },
      })

      const result = await service.executeOrganization(defaultSettings)

      expect(result.templates).toHaveLength(2)
      expect(result.templates[0].title).toBe("Template 1")
      expect(result.templates[1].title).toBe("Template 2")
    })

    it("should calculate cost with correct token usage", async () => {
      await service.executeOrganization(defaultSettings)

      expect(mockCostEstimatorService.calculateCost).toHaveBeenCalledWith({
        inputTokens: 10000,
        outputTokens: 5000,
      })
    })

    it("should pass correct parameters to generateTemplates", async () => {
      await service.executeOrganization(defaultSettings)

      expect(
        mockTemplateGeneratorService.generateTemplates,
      ).toHaveBeenCalledWith(
        [
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
        ],
        defaultSettings,
        [
          {
            id: "test-cat",
            name: "Test Category",
            description: "Test desc",
            isDefault: false,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ],
      )
    })
  })

  describe("estimateExecution", () => {
    it("should delegate to costEstimatorService", async () => {
      const estimate = await service.estimateExecution(defaultSettings)

      expect(mockCostEstimatorService.estimateExecution).toHaveBeenCalledWith(
        defaultSettings,
      )
      expect(estimate).toMatchObject({
        targetPromptCount: 2,
        estimatedInputTokens: 10000,
        estimatedOutputTokens: 5000,
        contextUsageRate: 0.01,
        estimatedCost: 2.5,
        model: "gemini-2.5-flash",
        contextLimit: 1_000_000,
      })
    })
  })

  describe("saveTemplates", () => {
    it("should delegate to templateSaveService", async () => {
      const candidates: TemplateCandidate[] = [
        {
          id: "1",
          title: "Test",
          content: "Content",
          useCase: "Use case",
          categoryId: "cat",
          variables: [],
          aiMetadata: {
            generatedAt: new Date(),
            sourcePromptIds: ["1"],
            sourceCount: 1,
            sourcePeriodDays: 30,
            extractedVariables: [],
            confirmed: false,
            showInPinned: false,
          },
          userAction: "save",
        },
      ]

      await service.saveTemplates(candidates)

      expect(mockTemplateSaveService.saveTemplates).toHaveBeenCalledWith(
        candidates,
      )
    })
  })
})
