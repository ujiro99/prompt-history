import { describe, it, expect, beforeEach, vi } from "vitest"
import { TemplateGeneratorService } from "../TemplateGeneratorService"
import type {
  PromptForOrganization,
  PromptOrganizerSettings,
  Category,
  OrganizePromptsResponse,
} from "@/types/promptOrganizer"

// Mock services with vi.hoisted
const { mockGeminiClient, mockGenaiApiKeyStorage, mockSystemInstruction } =
  vi.hoisted(() => {
    const mockGeminiClient = {
      initialize: vi.fn(),
      isInitialized: vi.fn(() => true),
      generateStructuredContent: vi.fn(
        async (): Promise<OrganizePromptsResponse> => ({
          prompts: [
            {
              title: "Test Template",
              content: "Test {{variable}}",
              useCase: "Test use case",
              categoryId: "test-cat",
              sourcePromptIds: ["1", "2"],
              variables: [{ name: "variable", type: "text" }],
            },
          ],
        }),
      ),
      generateStructuredContentStream: vi.fn(
        async (): Promise<OrganizePromptsResponse> => ({
          prompts: [
            {
              title: "Test Template",
              content: "Test {{variable}}",
              useCase: "Test use case",
              categoryId: "test-cat",
              sourcePromptIds: ["1", "2"],
              variables: [{ name: "variable", type: "text", defaultValue: "" }],
            },
          ],
        }),
      ),
    }

    const mockGenaiApiKeyStorage = {
      getValue: vi.fn(async () => "test-api-key"),
    }

    const mockSystemInstruction = "Test system instruction"

    return {
      mockGeminiClient,
      mockGenaiApiKeyStorage,
      mockSystemInstruction,
    }
  })

vi.mock("@/services/genai/GeminiClient", () => ({
  GeminiClient: {
    getInstance: () => mockGeminiClient,
  },
}))

vi.mock("@/services/storage/definitions", () => ({
  genaiApiKeyStorage: mockGenaiApiKeyStorage,
}))

vi.mock("@/services/genai/defaultPrompts", () => ({
  SYSTEM_ORGANIZATION_INSTRUCTION: mockSystemInstruction,
}))

describe("TemplateGeneratorService", () => {
  let service: TemplateGeneratorService

  beforeEach(() => {
    service = new TemplateGeneratorService()
    vi.clearAllMocks()
    // Reset to default state
    mockGeminiClient.isInitialized.mockReturnValue(true)
  })

  const defaultSettings: PromptOrganizerSettings = {
    filterPeriodDays: 30,
    filterMinExecutionCount: 2,
    filterMaxPrompts: 100,
    organizationPrompt: "Test organization prompt",
  }

  const defaultCategories: Category[] = [
    {
      id: "cat1",
      name: "Category 1",
      description: "Category 1 desc",
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "cat2",
      name: "Category 2",
      description: "Category 2 desc",
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  const defaultPrompts: PromptForOrganization[] = [
    { id: "id1", name: "Prompt 1", content: "Content 1", executionCount: 10 },
    { id: "id2", name: "Prompt 2", content: "Content 2", executionCount: 5 },
  ]

  describe("buildPrompt", () => {
    it("should format categories correctly", () => {
      const prompt = service.buildPrompt(
        defaultPrompts,
        "Test prompt",
        defaultCategories,
      )

      expect(prompt).toContain("Available Categories:")
      expect(prompt).toContain("- cat1: Category 1")
      expect(prompt).toContain("- cat2: Category 2")
    })

    it("should format prompts with numbering", () => {
      const prompt = service.buildPrompt(
        defaultPrompts,
        "Test prompt",
        defaultCategories,
      )

      expect(prompt).toContain("Prompts to analyze:")
      expect(prompt).toContain("1. Prompt 1")
      expect(prompt).toContain("   ID: id1")
      expect(prompt).toContain("   Content: Content 1")
      expect(prompt).toContain("   Execution count: 10")
      expect(prompt).toContain("2. Prompt 2")
      expect(prompt).toContain("   ID: id2")
      expect(prompt).toContain("   Content: Content 2")
      expect(prompt).toContain("   Execution count: 5")
    })

    it("should include organization prompt", () => {
      const organizationPrompt = "Custom organization instructions"
      const prompt = service.buildPrompt(
        defaultPrompts,
        organizationPrompt,
        defaultCategories,
      )

      expect(prompt).toContain(organizationPrompt)
    })

    it("should include schema instruction", () => {
      const prompt = service.buildPrompt(
        defaultPrompts,
        "Test prompt",
        defaultCategories,
      )

      expect(prompt).toContain(
        "Please generate prompts in JSON format according to the schema.",
      )
    })

    it("should handle empty prompts array", () => {
      const prompt = service.buildPrompt([], "Test prompt", defaultCategories)

      expect(prompt).toContain("Available Categories:")
      expect(prompt).toContain("Prompts to analyze:")
      expect(prompt).not.toContain("1.")
    })

    it("should handle empty categories array", () => {
      const prompt = service.buildPrompt(defaultPrompts, "Test prompt", [])

      expect(prompt).toContain("Available Categories:")
      expect(prompt).toContain("Prompts to analyze:")
      expect(prompt).toContain("1. Prompt 1")
    })

    it("should handle single prompt", () => {
      const prompts: PromptForOrganization[] = [
        { id: "1", name: "Single", content: "Content", executionCount: 3 },
      ]

      const prompt = service.buildPrompt(
        prompts,
        "Test prompt",
        defaultCategories,
      )

      expect(prompt).toContain("1. Single")
      expect(prompt).not.toContain("2.")
    })
  })

  describe("generateTemplates", () => {
    it("should call GeminiClient with correct parameters", async () => {
      const _result = await service.generateTemplates(
        defaultPrompts,
        defaultSettings,
        defaultCategories,
      )

      expect(
        mockGeminiClient.generateStructuredContentStream,
      ).toHaveBeenCalledOnce()

      const callArgs = mockGeminiClient.generateStructuredContentStream.mock
        .calls[0] as any[]
      const [prompt, schema, config] = callArgs

      expect(prompt).toContain("Test organization prompt")
      expect(schema).toHaveProperty("type", "object")
      expect(schema).toHaveProperty("properties.prompts")
      expect(config).toHaveProperty(
        "systemInstruction",
        "Test system instruction",
      )
    })

    it("should return prompts and usage", async () => {
      const result = await service.generateTemplates(
        defaultPrompts,
        defaultSettings,
        defaultCategories,
      )

      expect(result).toHaveProperty("templates")
      expect(result).toHaveProperty("usage")
      expect(result.templates).toHaveLength(1)
      expect(result.templates[0]).toMatchObject({
        title: "Test Template",
        content: "Test {{variable}}",
        useCase: "Test use case",
        categoryId: "test-cat",
      })
      expect(result.usage).toMatchObject({
        inputTokens: 0,
        outputTokens: 0,
      })
    })

    it("should initialize GeminiClient if not initialized", async () => {
      mockGeminiClient.isInitialized.mockReturnValueOnce(false)

      await service.generateTemplates(
        defaultPrompts,
        defaultSettings,
        defaultCategories,
      )

      expect(mockGenaiApiKeyStorage.getValue).toHaveBeenCalledOnce()
      expect(mockGeminiClient.initialize).toHaveBeenCalledWith("test-api-key")
    })

    it("should not reinitialize if already initialized", async () => {
      mockGeminiClient.isInitialized.mockReturnValue(true)

      await service.generateTemplates(
        defaultPrompts,
        defaultSettings,
        defaultCategories,
      )

      expect(mockGenaiApiKeyStorage.getValue).not.toHaveBeenCalled()
      expect(mockGeminiClient.initialize).not.toHaveBeenCalled()
    })

    it("should throw error if API key not configured", async () => {
      mockGeminiClient.isInitialized
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
      mockGenaiApiKeyStorage.getValue.mockResolvedValueOnce("")

      await expect(
        service.generateTemplates(
          defaultPrompts,
          defaultSettings,
          defaultCategories,
        ),
      ).rejects.toThrow(
        "API key not configured. Please set your API key in settings.",
      )
    })

    it("should handle multiple prompts in response", async () => {
      mockGeminiClient.generateStructuredContentStream.mockResolvedValueOnce({
        prompts: [
          {
            title: "Template 1",
            content: "Content 1 {{var1}}",
            useCase: "Use case 1",
            categoryId: "cat1",
            sourcePromptIds: ["1"],
            variables: [{ name: "var1", type: "text", defaultValue: "" }],
          },
          {
            title: "Template 2",
            content: "Content 2 {{var2}}",
            useCase: "Use case 2",
            categoryId: "cat2",
            sourcePromptIds: ["2"],
            variables: [{ name: "var2", type: "text", defaultValue: "" }],
          },
        ],
      })

      const result = await service.generateTemplates(
        defaultPrompts,
        defaultSettings,
        defaultCategories,
      )

      expect(result.templates).toHaveLength(2)
      expect(result.templates[0].title).toBe("Template 1")
      expect(result.templates[1].title).toBe("Template 2")
    })

    it("should use buildPrompt correctly", async () => {
      const buildPromptSpy = vi.spyOn(service, "buildPrompt")

      await service.generateTemplates(
        defaultPrompts,
        defaultSettings,
        defaultCategories,
      )

      expect(buildPromptSpy).toHaveBeenCalledWith(
        defaultPrompts,
        defaultSettings.organizationPrompt,
        defaultCategories,
      )
    })
  })

  describe("calculateStatus", () => {
    it("should return 'sending' when thoughtsTokens is 0", () => {
      const tokenUsage = {
        inputTokens: 0,
        thoughtsTokens: 0,
        outputTokens: 0,
      }

      const status = (service as any).calculateStatus(tokenUsage)

      expect(status).toBe("sending")
    })

    it("should return 'sending' when thoughtsTokens is 0 even if outputTokens is positive", () => {
      const tokenUsage = {
        inputTokens: 100,
        thoughtsTokens: 0,
        outputTokens: 50,
      }

      const status = (service as any).calculateStatus(tokenUsage)

      expect(status).toBe("sending")
    })

    it("should return 'generating' when thoughtsTokens is positive and outputTokens is positive", () => {
      const tokenUsage = {
        inputTokens: 100,
        thoughtsTokens: 50,
        outputTokens: 200,
      }

      const status = (service as any).calculateStatus(tokenUsage)

      expect(status).toBe("generating")
    })

    it("should return 'thinking' when thoughtsTokens is positive but outputTokens is 0", () => {
      const tokenUsage = {
        inputTokens: 100,
        thoughtsTokens: 50,
        outputTokens: 0,
      }

      const status = (service as any).calculateStatus(tokenUsage)

      expect(status).toBe("thinking")
    })

    it("should return 'thinking' when thoughtsTokens is positive but outputTokens is negative", () => {
      const tokenUsage = {
        inputTokens: 100,
        thoughtsTokens: 50,
        outputTokens: -1,
      }

      const status = (service as any).calculateStatus(tokenUsage)

      expect(status).toBe("thinking")
    })

    it("should return 'generating' when all tokens are minimal positive values", () => {
      const tokenUsage = {
        inputTokens: 1,
        thoughtsTokens: 1,
        outputTokens: 1,
      }

      const status = (service as any).calculateStatus(tokenUsage)

      expect(status).toBe("generating")
    })

    it("should return 'thinking' when thoughtsTokens is large but outputTokens is 0", () => {
      const tokenUsage = {
        inputTokens: 10000,
        thoughtsTokens: 5000,
        outputTokens: 0,
      }

      const status = (service as any).calculateStatus(tokenUsage)

      expect(status).toBe("thinking")
    })
  })
})
