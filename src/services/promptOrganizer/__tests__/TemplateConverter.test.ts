import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { templateConverter } from "../TemplateConverter"
import type {
  GeneratedTemplate,
  TemplateCandidate,
} from "@/types/promptOrganizer"

describe("TemplateConverter", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2025-01-20T10:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createGeneratedTemplate = (
    overrides: Partial<GeneratedTemplate> = {},
  ): GeneratedTemplate => ({
    title: "Test Template",
    content: "Test content with {{variable1}} and {{variable2}}",
    useCase: "Test use case",
    categoryId: "test-category",
    sourcePromptIds: ["id1", "id2", "id3"],
    variables: [
      {
        name: "variable1",
        description: "Test variable 1",
      },
      {
        name: "variable2",
        description: "Test variable 2",
      },
    ],
    ...overrides,
  })

  describe("convertToCandidate", () => {
    it("should convert GeneratedTemplate to TemplateCandidate", () => {
      const generated = createGeneratedTemplate()
      const candidate = templateConverter.convertToCandidate(generated, 30)

      expect(candidate).toMatchObject({
        title: "Test Template",
        content: "Test content with {{variable1}} and {{variable2}}",
        useCase: "Test use case",
        categoryId: "test-category",
        userAction: "pending",
      })
      expect(candidate.id).toBeDefined()
      expect(candidate.variables).toHaveLength(2)
    })

    it("should set aiMetadata correctly", () => {
      const generated = createGeneratedTemplate()
      const candidate = templateConverter.convertToCandidate(generated, 30)

      expect(candidate.aiMetadata).toMatchObject({
        generatedAt: new Date("2025-01-20T10:00:00Z"),
        sourcePromptIds: ["id1", "id2", "id3"],
        sourceCount: 3,
        sourcePeriodDays: 30,
        confirmed: false,
      })
      expect(candidate.aiMetadata.extractedVariables).toHaveLength(2)
    })

    it("should set showInPinned to true when sourceCount >= 3 and variables >= 2", () => {
      const generated = createGeneratedTemplate({
        sourcePromptIds: ["id1", "id2", "id3"],
        variables: [
          { name: "var1", description: "Var 1" },
          { name: "var2", description: "Var 2" },
        ],
      })

      const candidate = templateConverter.convertToCandidate(generated, 30)

      expect(candidate.aiMetadata.showInPinned).toBe(true)
    })

    it("should set showInPinned to false when sourceCount < 3", () => {
      const generated = createGeneratedTemplate({
        sourcePromptIds: ["id1", "id2"],
        variables: [
          { name: "var1", description: "Var 1" },
          { name: "var2", description: "Var 2" },
        ],
      })

      const candidate = templateConverter.convertToCandidate(generated, 30)

      expect(candidate.aiMetadata.showInPinned).toBe(false)
    })

    it("should set showInPinned to false when variables < 2", () => {
      const generated = createGeneratedTemplate({
        sourcePromptIds: ["id1", "id2", "id3"],
        variables: [{ name: "var1", description: "Var 1" }],
      })

      const candidate = templateConverter.convertToCandidate(generated, 30)

      expect(candidate.aiMetadata.showInPinned).toBe(false)
    })

    it("should convert variables to VariableConfig", () => {
      const generated = createGeneratedTemplate({
        variables: [
          { name: "testVar", description: "Test description" },
          { name: "dateVar", description: "Date variable" },
        ],
      })

      const candidate = templateConverter.convertToCandidate(generated, 30)

      expect(candidate.variables).toHaveLength(2)
      expect(candidate.variables[0]).toMatchObject({
        name: "testVar",
        type: "text",
        defaultValue: "",
      })
      expect(candidate.variables[1]).toMatchObject({
        name: "dateVar",
        type: "text",
        defaultValue: "",
      })
    })
  })

  describe("variable type inference", () => {
    it("should infer 'text' for date-related variables", () => {
      const generated = createGeneratedTemplate({
        variables: [
          { name: "date", description: "Date" },
          { name: "day", description: "Day" },
          { name: "startDate", description: "Start date" },
        ],
      })

      const candidate = templateConverter.convertToCandidate(generated, 30)

      expect(candidate.variables[0].type).toBe("text")
      expect(candidate.variables[1].type).toBe("text")
      expect(candidate.variables[2].type).toBe("text")
    })

    it("should infer 'textarea' for multi-line variables (English)", () => {
      const generated = createGeneratedTemplate({
        variables: [
          { name: "detail", description: "Details" },
          { name: "content", description: "Content" },
          { name: "description", description: "Description" },
        ],
      })

      const candidate = templateConverter.convertToCandidate(generated, 30)

      expect(candidate.variables[0].type).toBe("textarea")
      expect(candidate.variables[1].type).toBe("textarea")
      expect(candidate.variables[2].type).toBe("textarea")
    })

    it("should infer 'textarea' for multi-line variables (Japanese)", () => {
      const generated = createGeneratedTemplate({
        variables: [
          { name: "test1", description: "詳細な説明" },
          { name: "test2", description: "内容を記載" },
          { name: "test3", description: "説明文" },
        ],
      })

      const candidate = templateConverter.convertToCandidate(generated, 30)

      expect(candidate.variables[0].type).toBe("textarea")
      expect(candidate.variables[1].type).toBe("textarea")
      expect(candidate.variables[2].type).toBe("textarea")
    })

    it("should infer 'text' for other variables", () => {
      const generated = createGeneratedTemplate({
        variables: [
          { name: "name", description: "Name" },
          { name: "email", description: "Email address" },
        ],
      })

      const candidate = templateConverter.convertToCandidate(generated, 30)

      expect(candidate.variables[0].type).toBe("text")
      expect(candidate.variables[1].type).toBe("text")
    })
  })

  describe("convertToPrompt", () => {
    const createTemplateCandidate = (
      overrides: Partial<TemplateCandidate> = {},
    ): TemplateCandidate => ({
      id: "candidate-id",
      title: "Test Template",
      content: "Test content",
      useCase: "Test use case",
      categoryId: "test-category",
      variables: [
        { name: "var1", type: "text", defaultValue: "" },
        { name: "var2", type: "textarea", defaultValue: "" },
      ],
      aiMetadata: {
        generatedAt: new Date("2025-01-20"),
        sourcePromptIds: ["id1", "id2", "id3"],
        sourceCount: 3,
        sourcePeriodDays: 30,
        extractedVariables: [],
        confirmed: false,
        showInPinned: true,
      },
      userAction: "save",
      ...overrides,
    })

    it("should convert TemplateCandidate to Prompt", () => {
      const candidate = createTemplateCandidate()
      const prompt = templateConverter.convertToPrompt(candidate)

      expect(prompt).toMatchObject({
        name: "Test Template",
        content: "Test content",
        useCase: "Test use case",
        categoryId: "test-category",
        executionCount: 0,
        isPinned: false,
        isAIGenerated: true,
      })
      expect(prompt.id).toBeDefined()
      expect(prompt.id).not.toBe("candidate-id")
      expect(prompt.createdAt).toBeInstanceOf(Date)
      expect(prompt.updatedAt).toBeInstanceOf(Date)
      expect(prompt.lastExecutedAt).toBeInstanceOf(Date)
    })

    it("should set confirmed to true in aiMetadata", () => {
      const candidate = createTemplateCandidate({
        aiMetadata: {
          generatedAt: new Date("2025-01-20"),
          sourcePromptIds: ["id1", "id2"],
          sourceCount: 2,
          sourcePeriodDays: 30,
          extractedVariables: [],
          confirmed: false,
          showInPinned: false,
        },
      })

      const prompt = templateConverter.convertToPrompt(candidate)

      expect(prompt.aiMetadata?.confirmed).toBe(true)
    })

    it("should set isPinned to true when userAction is 'save_and_pin'", () => {
      const candidate = createTemplateCandidate({
        userAction: "save_and_pin",
      })

      const prompt = templateConverter.convertToPrompt(candidate)

      expect(prompt.isPinned).toBe(true)
    })

    it("should set isPinned to false when userAction is 'save'", () => {
      const candidate = createTemplateCandidate({
        userAction: "save",
      })

      const prompt = templateConverter.convertToPrompt(candidate)

      expect(prompt.isPinned).toBe(false)
    })

    it("should preserve variables as VariableConfig[]", () => {
      const candidate = createTemplateCandidate({
        variables: [
          { name: "var1", type: "text", defaultValue: "default1" },
          { name: "var2", type: "text", defaultValue: "" },
        ],
      })

      const prompt = templateConverter.convertToPrompt(candidate)

      expect(prompt.variables).toEqual([
        { name: "var1", type: "text", defaultValue: "default1" },
        { name: "var2", type: "text", defaultValue: "" },
      ])
    })

    it("should preserve all aiMetadata fields", () => {
      const candidate = createTemplateCandidate({
        aiMetadata: {
          generatedAt: new Date("2025-01-15"),
          sourcePromptIds: ["id1", "id2", "id3", "id4"],
          sourceCount: 4,
          sourcePeriodDays: 60,
          extractedVariables: [{ name: "test", description: "test var" }],
          confirmed: false,
          showInPinned: true,
        },
      })

      const prompt = templateConverter.convertToPrompt(candidate)

      expect(prompt.aiMetadata).toMatchObject({
        generatedAt: new Date("2025-01-15"),
        sourcePromptIds: ["id1", "id2", "id3", "id4"],
        sourceCount: 4,
        sourcePeriodDays: 60,
        confirmed: true,
        showInPinned: true,
      })
      expect(prompt.aiMetadata?.extractedVariables).toHaveLength(1)
    })
  })
})
