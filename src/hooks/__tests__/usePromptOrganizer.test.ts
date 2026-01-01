/**
 * @vitest-environment happy-dom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { usePromptOrganizer } from "../usePromptOrganizer"
import type {
  PromptOrganizerSettings,
  OrganizerExecutionEstimate,
  TemplateCandidate,
  GeneratedTemplate,
} from "@/types/promptOrganizer"

// Mock i18n
vi.mock("#imports", () => ({
  i18n: {
    t: (key: string, params?: any[]) => {
      if (params) {
        return `${key}[${params.join(",")}]`
      }
      return key
    },
  },
}))

// Mock useDebounce
vi.mock("../useDebounce", () => ({
  useDebounce: vi.fn((value) => value),
}))

// Mock storage - use vi.hoisted to avoid initialization errors
const { mockGetValue, mockSetValue, mockWatch, mockPendingGetValue, mockPendingWatch } = vi.hoisted(() => ({
  mockGetValue: vi.fn(),
  mockSetValue: vi.fn(),
  mockWatch: vi.fn(),
  mockPendingGetValue: vi.fn(),
  mockPendingWatch: vi.fn(),
}))

vi.mock("@/services/storage/definitions", () => ({
  promptOrganizerSettingsStorage: {
    getValue: mockGetValue,
    watch: mockWatch,
  },
  pendingOrganizerTemplatesStorage: {
    getValue: mockPendingGetValue,
    setValue: mockSetValue,
    watch: mockPendingWatch,
  },
}))

// Mock promptOrganizerService - use vi.hoisted
const { mockEstimateExecution, mockExecuteOrganization, mockCancel, mockSaveTemplates } = vi.hoisted(() => ({
  mockEstimateExecution: vi.fn(),
  mockExecuteOrganization: vi.fn(),
  mockCancel: vi.fn(),
  mockSaveTemplates: vi.fn(),
}))

vi.mock("@/services/promptOrganizer/PromptOrganizerService", () => ({
  promptOrganizerService: {
    estimateExecution: mockEstimateExecution,
    executeOrganization: mockExecuteOrganization,
    cancel: mockCancel,
    saveTemplates: mockSaveTemplates,
  },
}))

// Mock successMessageGeneratorService - use vi.hoisted
const { mockGenerateSuccessMessage } = vi.hoisted(() => ({
  mockGenerateSuccessMessage: vi.fn(),
}))

vi.mock("@/services/promptOrganizer/SuccessMessageGeneratorService", () => ({
  successMessageGeneratorService: {
    generateSuccessMessage: mockGenerateSuccessMessage,
  },
}))

// Mock promptsService - use vi.hoisted
const { mockUpdatePrompt } = vi.hoisted(() => ({
  mockUpdatePrompt: vi.fn(),
}))

vi.mock("@/services/storage/prompts", () => ({
  promptsService: {
    updatePrompt: mockUpdatePrompt,
  },
}))

describe("usePromptOrganizer", () => {
  const defaultSettings: PromptOrganizerSettings = {
    filterPeriodDays: 30,
    filterMinExecutionCount: 2,
    filterMaxPrompts: 50,
    organizationPrompt: "test prompt",
  }

  const defaultEstimate: OrganizerExecutionEstimate = {
    targetPromptCount: 10,
    estimatedInputTokens: 1000,
    estimatedOutputTokens: 500,
    contextUsageRate: 0.5,
    model: "gemini-1.5-flash",
    contextLimit: 100000,
  }

  const createTemplates = (count: number = 3): TemplateCandidate[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `t${i + 1}`,
      title: `Template ${i + 1}`,
      content: `Content ${i + 1}`,
      useCase: `Use case ${i + 1}`,
      clusterExplanation: `Explanation ${i + 1}`,
      categoryId: "cat1",
      variables: [],
      aiMetadata: {
        sourcePromptIds: [`p${i + 1}`],
        sourceCount: 1,
        confirmed: false,
        showInPinned: false,
      },
      userAction: "pending",
    }))

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetValue.mockResolvedValue(defaultSettings)
    mockWatch.mockReturnValue(() => {})
    mockPendingGetValue.mockResolvedValue(null)
    mockPendingWatch.mockReturnValue(() => {})
    mockEstimateExecution.mockResolvedValue(defaultEstimate)
    mockGenerateSuccessMessage.mockResolvedValue("Success message")
  })

  describe("Initialization", () => {
    it("should load settings on mount", async () => {
      renderHook(() => usePromptOrganizer({ enableEstimate: false }))

      await waitFor(() => {
        expect(mockGetValue).toHaveBeenCalledTimes(1)
      })
    })

    it("should watch for settings changes", async () => {
      renderHook(() => usePromptOrganizer({ enableEstimate: false }))

      await waitFor(() => {
        expect(mockWatch).toHaveBeenCalledTimes(1)
      })
    })

    it("should initialize with null values", () => {
      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      expect(result.current.settings).toBeNull()
      expect(result.current.estimate).toBeNull()
      expect(result.current.result).toBeNull()
      expect(result.current.isExecuting).toBe(false)
      expect(result.current.isCanceling).toBe(false)
      expect(result.current.progress).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe("Settings Management", () => {
    it("should update settings when loaded", async () => {
      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings)
      })
    })

    it("should recalculate estimate when settings change and enableEstimate is true", async () => {
      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: true }),
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings)
      })

      await waitFor(() => {
        expect(mockEstimateExecution).toHaveBeenCalled()
        expect(result.current.estimate).toEqual(defaultEstimate)
      })
    })

    it("should not calculate estimate when enableEstimate is false", async () => {
      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings)
      })

      expect(mockEstimateExecution).not.toHaveBeenCalled()
      expect(result.current.estimate).toBeNull()
    })
  })

  describe("Execute Organization", () => {
    it("should execute organization successfully", async () => {
      const templates = createTemplates(2)
      mockExecuteOrganization.mockResolvedValue({
        templates,
        sourceCount: 5,
        sourcePromptIds: ["p1", "p2", "p3"],
        periodDays: 30,
        executedAt: new Date(),
        inputTokens: 1000,
        outputTokens: 500,
      })

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings)
      })

      let success = false
      await act(async () => {
        success = await result.current.executeOrganization()
      })

      expect(success).toBe(true)
      expect(mockExecuteOrganization).toHaveBeenCalledTimes(1)
    })

    it("should set isExecuting to true during execution", async () => {
      mockExecuteOrganization.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      )

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings)
      })

      act(() => {
        result.current.executeOrganization()
      })

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(true)
      })
    })

    it("should set isExecuting to false after execution", async () => {
      const templates = createTemplates(1)
      mockExecuteOrganization.mockResolvedValue({
        templates,
        sourceCount: 5,
        sourcePromptIds: ["p1", "p2", "p3"],
        periodDays: 30,
        executedAt: new Date(),
        inputTokens: 1000,
        outputTokens: 500,
      })

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings)
      })

      await act(async () => {
        await result.current.executeOrganization()
      })

      expect(result.current.isExecuting).toBe(false)
    })

    it("should update progress during execution", async () => {
      let progressCallback: any = null
      mockExecuteOrganization.mockImplementation(async (settings, options) => {
        progressCallback = options.onProgress
        progressCallback({
          chunk: "chunk",
          accumulated: "accumulated",
          estimatedProgress: 50,
          status: "generating",
        })
        return {
          templates: createTemplates(1),
          sourceCount: 5,
          sourcePromptIds: ["p1"],
          periodDays: 30,
          executedAt: new Date(),
          inputTokens: 1000,
          outputTokens: 500,
        }
      })

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings)
      })

      await act(async () => {
        await result.current.executeOrganization()
      })

      expect(progressCallback).toBeTruthy()
    })

    it("should store templates in pending storage", async () => {
      const templates = createTemplates(2)
      mockExecuteOrganization.mockResolvedValue({
        templates,
        sourceCount: 5,
        sourcePromptIds: ["p1", "p2"],
        periodDays: 30,
        executedAt: new Date(),
        inputTokens: 1000,
        outputTokens: 500,
      })

      // Set the mock to return empty templates
      mockPendingGetValue.mockResolvedValue({ templates: [] })

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings)
      })

      await act(async () => {
        await result.current.executeOrganization()
      })

      expect(mockSetValue).toHaveBeenCalled()
      const savedData = mockSetValue.mock.calls[0][0]
      expect(savedData.templates).toHaveLength(2)
    })

    it("should update source prompts excludeFromOrganizer flag", async () => {
      const templates = createTemplates(1)
      mockExecuteOrganization.mockResolvedValue({
        templates,
        sourceCount: 3,
        sourcePromptIds: ["p1", "p2", "p3"],
        periodDays: 30,
        executedAt: new Date(),
        inputTokens: 1000,
        outputTokens: 500,
      })

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings)
      })

      await act(async () => {
        await result.current.executeOrganization()
      })

      expect(mockUpdatePrompt).toHaveBeenCalledTimes(3)
      expect(mockUpdatePrompt).toHaveBeenCalledWith("p1", {
        excludeFromOrganizer: true,
      })
      expect(mockUpdatePrompt).toHaveBeenCalledWith("p2", {
        excludeFromOrganizer: true,
      })
      expect(mockUpdatePrompt).toHaveBeenCalledWith("p3", {
        excludeFromOrganizer: true,
      })
    })

    it("should handle execution error", async () => {
      mockExecuteOrganization.mockRejectedValue(new Error("Execution failed"))

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings)
      })

      let success = false
      await act(async () => {
        success = await result.current.executeOrganization()
      })

      expect(success).toBe(false)
      expect(result.current.error).toEqual({
        code: "API_ERROR",
        message: "Execution failed",
      })
    })

    it("should return false when settings are null", async () => {
      mockGetValue.mockResolvedValue(null)

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.settings).toBeNull()
      })

      let success = false
      await act(async () => {
        success = await result.current.executeOrganization()
      })

      expect(success).toBe(false)
    })

    it("should generate success message for first template", async () => {
      const generatedTemplate: GeneratedTemplate = {
        title: "Template 1",
        content: "Content 1",
        useCase: "Use case 1",
        clusterExplanation: "Explanation 1",
        categoryId: "cat1",
        sourcePromptIds: ["p1"],
        variables: [],
      }

      mockExecuteOrganization.mockImplementation(async (settings, options) => {
        // Simulate receiving first template
        const accumulated = JSON.stringify({
          prompts: [generatedTemplate],
        })
        options.onProgress({
          chunk: "",
          accumulated,
          estimatedProgress: 30,
          status: "generating",
        })

        return {
          templates: [
            {
              ...generatedTemplate,
              id: "t1",
              aiMetadata: {
                sourcePromptIds: ["p1"],
                sourceCount: 1,
                confirmed: false,
                showInPinned: false,
              },
              userAction: "pending" as const,
            },
          ],
          sourceCount: 1,
          sourcePromptIds: ["p1"],
          periodDays: 30,
          executedAt: new Date(),
          inputTokens: 1000,
          outputTokens: 500,
        }
      })

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(defaultSettings)
      })

      await act(async () => {
        await result.current.executeOrganization()
      })

      expect(mockGenerateSuccessMessage).toHaveBeenCalled()
    })
  })

  describe("Cancel Generation", () => {
    it("should call cancel on service", () => {
      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      act(() => {
        result.current.cancelGeneration()
      })

      expect(mockCancel).toHaveBeenCalledTimes(1)
      expect(result.current.isCanceling).toBe(true)
    })
  })

  describe("Save Templates", () => {
    it("should save only templates with save or save_and_pin action", async () => {
      const templates = createTemplates(3)
      templates[0].userAction = "save"
      templates[1].userAction = "save_and_pin"
      templates[2].userAction = "discard"

      mockPendingGetValue.mockResolvedValue({ templates })

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await act(async () => {
        await result.current.saveTemplates(templates)
      })

      expect(mockSaveTemplates).toHaveBeenCalledTimes(1)
      const savedTemplates = mockSaveTemplates.mock.calls[0][0]
      expect(savedTemplates).toHaveLength(2)
      expect(savedTemplates[0].userAction).toBe("save")
      expect(savedTemplates[1].userAction).toBe("save_and_pin")
    })

    it("should remove processed templates from pending storage", async () => {
      const templates = createTemplates(3)
      templates[0].userAction = "save"
      templates[1].userAction = "discard"
      templates[2].userAction = "pending"

      mockPendingGetValue.mockResolvedValue({ templates, generatedAt: Date.now() })

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await act(async () => {
        await result.current.saveTemplates(templates)
      })

      expect(mockSetValue).toHaveBeenCalled()
      const remainingData = mockSetValue.mock.calls[0][0]
      expect(remainingData.templates).toHaveLength(1)
      expect(remainingData.templates[0].id).toBe("t3")
    })

    it("should clear pending storage when all templates are processed", async () => {
      const templates = createTemplates(2)
      templates[0].userAction = "save"
      templates[1].userAction = "discard"

      mockPendingGetValue.mockResolvedValue({ templates, generatedAt: Date.now() })

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await act(async () => {
        await result.current.saveTemplates(templates)
      })

      expect(mockSetValue).toHaveBeenCalledWith(null)
    })

    it("should handle save error", async () => {
      mockSaveTemplates.mockRejectedValue(new Error("Save failed"))

      const templates = createTemplates(1)
      templates[0].userAction = "save"

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await act(async () => {
        await result.current.saveTemplates(templates)
      })

      expect(result.current.error).toEqual({
        code: "API_ERROR",
        message: "Save failed",
      })
    })
  })

  describe("Pending Templates", () => {
    it("should load pending templates on mount", async () => {
      const pendingTemplates = createTemplates(2)
      mockPendingGetValue.mockResolvedValue({
        templates: pendingTemplates,
        generatedAt: Date.now(),
      })

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.pendingTemplates).toHaveLength(2)
      })
    })

    it("should handle null pending templates", async () => {
      mockPendingGetValue.mockResolvedValue(null)

      const { result } = renderHook(() =>
        usePromptOrganizer({ enableEstimate: false }),
      )

      await waitFor(() => {
        expect(result.current.pendingTemplates).toEqual([])
      })
    })
  })
})
