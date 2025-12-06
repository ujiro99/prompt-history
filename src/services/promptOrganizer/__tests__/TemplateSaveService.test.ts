import { describe, it, expect, beforeEach, vi } from "vitest"
import { TemplateSaveService } from "../TemplateSaveService"
import type { TemplateCandidate } from "@/types/promptOrganizer"
import type { Prompt } from "@/types/prompt"

// Mock services with vi.hoisted
const { mockTemplateConverter, mockPromptsService, mockPinsService } =
  vi.hoisted(() => {
    const mockTemplateConverter = {
      convertToPrompt: vi.fn(
        (candidate: TemplateCandidate): Prompt => ({
          id: `prompt-${candidate.id}`,
          name: candidate.title,
          content: candidate.content,
          useCase: candidate.useCase,
          categoryId: candidate.categoryId,
          variables: candidate.variables,
          executionCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastExecutedAt: new Date(),
          lastExecutionUrl: "https://example.com",
          isPinned: candidate.userAction === "save_and_pin",
          isAIGenerated: true,
          aiMetadata: {
            ...candidate.aiMetadata,
            confirmed: true,
          },
        }),
      ),
    }

    const mockPromptsService = {
      savePrompt: vi.fn(async (prompt: Prompt) => ({
        ...prompt,
        id: `saved-${prompt.id}`,
      })),
    }

    const mockPinsService = {
      pinPrompt: vi.fn(async () => {}),
    }

    return {
      mockTemplateConverter,
      mockPromptsService,
      mockPinsService,
    }
  })

vi.mock("../TemplateConverter", () => ({
  templateConverter: mockTemplateConverter,
}))

vi.mock("@/services/storage/prompts", () => ({
  promptsService: mockPromptsService,
}))

vi.mock("@/services/storage/pins", () => ({
  pinsService: mockPinsService,
}))

describe("TemplateSaveService", () => {
  let service: TemplateSaveService

  beforeEach(() => {
    service = new TemplateSaveService()
    vi.clearAllMocks()
  })

  const createTemplateCandidate = (
    overrides: Partial<TemplateCandidate> = {},
  ): TemplateCandidate => ({
    id: "candidate-1",
    title: "Test Template",
    content: "Test content",
    useCase: "Test use case",
    clusterExplanation: "Test cluster explanation",
    categoryId: "test-category",
    variables: [],
    aiMetadata: {
      sourcePromptIds: ["id1", "id2"],
      sourceCount: 2,
      confirmed: false,
      showInPinned: false,
    },
    userAction: "save",
    ...overrides,
  })

  describe("saveTemplates", () => {
    it("should save templates with 'save' action", async () => {
      const candidates: TemplateCandidate[] = [
        createTemplateCandidate({ id: "1", userAction: "save" }),
      ]

      await service.saveTemplates(candidates)

      expect(mockTemplateConverter.convertToPrompt).toHaveBeenCalledOnce()
      expect(mockTemplateConverter.convertToPrompt).toHaveBeenCalledWith(
        candidates[0],
      )
      expect(mockPromptsService.savePrompt).toHaveBeenCalledOnce()
      expect(mockPinsService.pinPrompt).not.toHaveBeenCalled()
    })

    it("should save templates with 'save_and_pin' action", async () => {
      const candidates: TemplateCandidate[] = [
        createTemplateCandidate({ id: "1", userAction: "save_and_pin" }),
      ]

      await service.saveTemplates(candidates)

      expect(mockTemplateConverter.convertToPrompt).toHaveBeenCalledOnce()
      expect(mockPromptsService.savePrompt).toHaveBeenCalledOnce()
      expect(mockPinsService.pinPrompt).toHaveBeenCalledOnce()
      expect(mockPinsService.pinPrompt).toHaveBeenCalledWith("saved-prompt-1")
    })

    it("should filter out templates with 'pending' action", async () => {
      const candidates: TemplateCandidate[] = [
        createTemplateCandidate({ id: "1", userAction: "pending" }),
        createTemplateCandidate({ id: "2", userAction: "save" }),
      ]

      await service.saveTemplates(candidates)

      expect(mockTemplateConverter.convertToPrompt).toHaveBeenCalledOnce()
      expect(mockTemplateConverter.convertToPrompt).toHaveBeenCalledWith(
        candidates[1],
      )
      expect(mockPromptsService.savePrompt).toHaveBeenCalledOnce()
    })

    it("should filter out templates with 'discard' action", async () => {
      const candidates: TemplateCandidate[] = [
        createTemplateCandidate({ id: "1", userAction: "discard" }),
        createTemplateCandidate({ id: "2", userAction: "save" }),
      ]

      await service.saveTemplates(candidates)

      expect(mockTemplateConverter.convertToPrompt).toHaveBeenCalledOnce()
      expect(mockTemplateConverter.convertToPrompt).toHaveBeenCalledWith(
        candidates[1],
      )
    })

    it("should handle multiple templates", async () => {
      const candidates: TemplateCandidate[] = [
        createTemplateCandidate({ id: "1", userAction: "save" }),
        createTemplateCandidate({ id: "2", userAction: "save_and_pin" }),
        createTemplateCandidate({ id: "3", userAction: "save" }),
      ]

      await service.saveTemplates(candidates)

      expect(mockTemplateConverter.convertToPrompt).toHaveBeenCalledTimes(3)
      expect(mockPromptsService.savePrompt).toHaveBeenCalledTimes(3)
      expect(mockPinsService.pinPrompt).toHaveBeenCalledOnce()
      expect(mockPinsService.pinPrompt).toHaveBeenCalledWith("saved-prompt-2")
    })

    it("should handle empty array", async () => {
      const candidates: TemplateCandidate[] = []

      await service.saveTemplates(candidates)

      expect(mockTemplateConverter.convertToPrompt).not.toHaveBeenCalled()
      expect(mockPromptsService.savePrompt).not.toHaveBeenCalled()
      expect(mockPinsService.pinPrompt).not.toHaveBeenCalled()
    })

    it("should handle array with only non-save actions", async () => {
      const candidates: TemplateCandidate[] = [
        createTemplateCandidate({ id: "1", userAction: "pending" }),
        createTemplateCandidate({ id: "2", userAction: "discard" }),
      ]

      await service.saveTemplates(candidates)

      expect(mockTemplateConverter.convertToPrompt).not.toHaveBeenCalled()
      expect(mockPromptsService.savePrompt).not.toHaveBeenCalled()
      expect(mockPinsService.pinPrompt).not.toHaveBeenCalled()
    })

    it("should save templates in order", async () => {
      const candidates: TemplateCandidate[] = [
        createTemplateCandidate({
          id: "1",
          title: "First",
          userAction: "save",
        }),
        createTemplateCandidate({
          id: "2",
          title: "Second",
          userAction: "save",
        }),
        createTemplateCandidate({
          id: "3",
          title: "Third",
          userAction: "save",
        }),
      ]

      await service.saveTemplates(candidates)

      expect(mockTemplateConverter.convertToPrompt).toHaveBeenNthCalledWith(
        1,
        candidates[0],
      )
      expect(mockTemplateConverter.convertToPrompt).toHaveBeenNthCalledWith(
        2,
        candidates[1],
      )
      expect(mockTemplateConverter.convertToPrompt).toHaveBeenNthCalledWith(
        3,
        candidates[2],
      )
    })

    it("should pass correct data through the pipeline", async () => {
      const candidate = createTemplateCandidate({
        id: "test-id",
        title: "Test Title",
        content: "Test Content",
        useCase: "Test Use Case",
        categoryId: "test-cat",
        userAction: "save_and_pin",
        variables: [
          { name: "var1", type: "text", defaultValue: "" },
          { name: "var2", type: "textarea", defaultValue: "" },
        ],
      })

      await service.saveTemplates([candidate])

      // Verify convertToPrompt was called with the candidate
      expect(mockTemplateConverter.convertToPrompt).toHaveBeenCalledWith(
        candidate,
      )

      // Verify savePrompt was called with the converted prompt
      const savedPrompt = mockPromptsService.savePrompt.mock.calls[0][0]
      expect(savedPrompt).toMatchObject({
        id: "prompt-test-id",
        name: "Test Title",
        content: "Test Content",
        useCase: "Test Use Case",
        categoryId: "test-cat",
        isPinned: true,
      })

      // Verify pinPrompt was called with the saved prompt ID
      expect(mockPinsService.pinPrompt).toHaveBeenCalledWith(
        "saved-prompt-test-id",
      )
    })
  })
})
