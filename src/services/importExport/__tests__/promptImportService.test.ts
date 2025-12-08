/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi, Mock } from "vitest"
import type { Prompt } from "@/types/prompt"
import type { ImportResult } from "../types"

// Mock dependencies
vi.mock("@/services/promptServiceFacade", () => ({
  PromptServiceFacade: {
    getInstance: vi.fn(() => ({
      saveBulkPrompts: vi.fn(),
    })),
  },
}))

vi.mock("@/utils/idGenerator", () => ({
  generatePromptId: vi.fn(),
}))

vi.mock("@wxt-dev/i18n", () => {
  return {
    createI18n: () => ({
      t: (key: string, _countOrSubs?: unknown, _subs?: unknown) => key,
    }),
    i18n: {
      t: (key: string, _countOrSubs?: unknown, _subs?: unknown) => key,
    },
  }
})

import { PromptImportService } from "../promptImportService"
import { generatePromptId } from "@/utils/idGenerator"
import Papa from "papaparse"

// Mock FileReader
const mockFileReader = {
  readAsText: vi.fn(),
  onload: null as any,
  onerror: null as any,
  result: null as any,
}

vi.stubGlobal(
  "FileReader",
  vi.fn(() => mockFileReader),
)

// Mock DOM APIs
const mockClick = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()

Object.defineProperty(document, "createElement", {
  value: vi.fn(() => ({
    type: "",
    accept: "",
    style: {},
    click: mockClick,
    onchange: null as any,
  })),
  writable: true,
})

Object.defineProperty(document.body, "appendChild", {
  value: mockAppendChild,
  writable: true,
})

Object.defineProperty(document.body, "removeChild", {
  value: mockRemoveChild,
  writable: true,
})

describe("PromptImportService", () => {
  let service: PromptImportService
  let mockGeneratePromptId: Mock

  beforeEach(() => {
    // Reset all mocks first
    vi.clearAllMocks()

    // Setup mock return values before creating service
    mockGeneratePromptId = vi.mocked(generatePromptId)
    mockGeneratePromptId.mockReturnValue("test-id-123")

    // Create service after setting up mocks
    service = new PromptImportService()
  })

  // Test data helpers
  const createMockCSVRowData = (overrides: any = {}) => ({
    name: "Test Prompt",
    content: "Test content",
    executionCount: "1",
    lastExecutedAt: "2024-01-10T10:00:00.000Z",
    isPinned: false,
    lastExecutionUrl: "https://example.com",
    createdAt: "2024-01-01T10:00:00.000Z",
    updatedAt: "2024-01-01T10:00:00.000Z",
    variables: undefined,
    isAIGenerated: undefined,
    aiMetadata: undefined,
    categoryId: undefined,
    useCase: undefined,
    ...overrides,
  })

  const createMockPrompt = (overrides: Partial<Prompt> = {}): Prompt => ({
    id: "test-id-123",
    name: "Test Prompt",
    content: "Test content",
    executionCount: 1,
    lastExecutedAt: new Date("2024-01-10T10:00:00.000Z"),
    isPinned: false,
    lastExecutionUrl: "https://example.com",
    createdAt: new Date("2024-01-01T10:00:00.000Z"),
    updatedAt: new Date("2024-01-01T10:00:00.000Z"),
    variables: undefined,
    isAIGenerated: undefined,
    aiMetadata: undefined,
    categoryId: undefined,
    useCase: undefined,
    ...overrides,
  })

  const createMockFile = (content: string, name = "test.csv"): File => {
    return new File([content], name, { type: "text/csv" })
  }

  describe("parseRowData", () => {
    it("should parse valid CSV row data to Prompt object", () => {
      const rowData = createMockCSVRowData()
      const result = (service as any).parseRowData(rowData)

      expect(result).toEqual({
        id: "test-id-123",
        name: "Test Prompt",
        content: "Test content",
        executionCount: 1,
        lastExecutedAt: new Date("2024-01-10T10:00:00.000Z"),
        isPinned: false,
        lastExecutionUrl: "https://example.com",
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        updatedAt: new Date("2024-01-01T10:00:00.000Z"),
      })
      expect(mockGeneratePromptId).toHaveBeenCalled()
    })

    it("should handle boolean and numeric type conversion", () => {
      const rowData = createMockCSVRowData({
        executionCount: 5,
        isPinned: true,
      })
      const result = (service as any).parseRowData(rowData)

      expect(result.executionCount).toBe(5)
      expect(result.isPinned).toBe(true)
    })

    it("should convert string boolean values correctly", () => {
      const rowData = createMockCSVRowData({
        isPinned: "true",
      })
      const result = (service as any).parseRowData(rowData)

      expect(result.isPinned).toBe(true)
    })

    it("should handle invalid executionCount gracefully", () => {
      const rowData = createMockCSVRowData({
        executionCount: "invalid",
      })
      const result = (service as any).parseRowData(rowData)

      expect(result.executionCount).toBe(0)
    })

    it("should throw error for missing required fields", () => {
      const incompleteRowData = {
        name: "Test Prompt",
        content: "Test content",
        // missing other required fields
      }

      expect(() => {
        ;(service as any).parseRowData(incompleteRowData)
      }).toThrow("importDialog.error.missingField")
    })

    it("should handle invalid date formats gracefully", () => {
      const rowData = createMockCSVRowData({
        createdAt: "invalid-date",
      })

      expect(() => {
        ;(service as any).parseRowData(rowData)
      }).not.toThrow()

      const result = (service as any).parseRowData(rowData)
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(isNaN(result.createdAt.getTime())).toBe(true)
    })
  })

  describe("parseCSV", () => {
    it("should parse valid CSV text to Prompt array", () => {
      const csvText = `name,content,executionCount,lastExecutedAt,isPinned,lastExecutionUrl,createdAt,updatedAt
Test Prompt 1,Content 1,1,2024-01-10T10:00:00.000Z,false,https://example.com,2024-01-01T10:00:00.000Z,2024-01-01T10:00:00.000Z
Test Prompt 2,Content 2,2,2024-01-11T10:00:00.000Z,true,https://example2.com,2024-01-02T10:00:00.000Z,2024-01-02T10:00:00.000Z`

      const result = (service as any).parseCSV(csvText)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("Test Prompt 1")
      expect(result[1].name).toBe("Test Prompt 2")
      expect(result[1].isPinned).toBe(true)
    })

    it("should handle empty CSV gracefully", () => {
      const csvText =
        "name,content,executionCount,lastExecutedAt,isPinned,lastExecutionUrl,createdAt,updatedAt\n"

      const result = (service as any).parseCSV(csvText)

      expect(result).toHaveLength(0)
    })

    it("should throw error when invalid rows are present and stop processing", () => {
      const csvText = `name,content,executionCount,lastExecutedAt,isPinned,lastExecutionUrl,createdAt,updatedAt
Test Prompt 1,Content 1,1,2024-01-10T10:00:00.000Z,false,https://example.com,2024-01-01T10:00:00.000Z,2024-01-01T10:00:00.000Z
Invalid Row,,,,,,
Test Prompt 2,Content 2,2,2024-01-11T10:00:00.000Z,true,https://example2.com,2024-01-02T10:00:00.000Z,2024-01-02T10:00:00.000Z`

      const errorMessage =
        "1 errors occurred during import.\n  - [3] Too few fields: expected 8 fields but parsed 7"

      expect(() => {
        ;(service as any).parseCSV(csvText)
      }).toThrow(errorMessage)
    })

    it("should handle CSV with special characters", () => {
      const csvText = `name,content,executionCount,lastExecutedAt,isPinned,lastExecutionUrl,createdAt,updatedAt
"Prompt with ""quotes""","Content with
newline and, comma",1,2024-01-10T10:00:00.000Z,false,https://example.com,2024-01-01T10:00:00.000Z,2024-01-01T10:00:00.000Z`

      const result = (service as any).parseCSV(csvText)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Prompt with "quotes"')
      expect(result[0].content).toBe("Content with\nnewline and, comma")
    })
  })

  describe("readFileAsText", () => {
    it("should read file content successfully", async () => {
      const file = createMockFile("test content")
      const readPromise = (service as any).readFileAsText(file)

      // Simulate FileReader onload
      setTimeout(() => {
        mockFileReader.result = "test content"
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: "test content" } })
        }
      }, 0)

      const result = await readPromise
      expect(result).toBe("test content")
      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file)
    })

    it("should handle FileReader error", async () => {
      const file = createMockFile("test content")
      const readPromise = (service as any).readFileAsText(file)

      // Simulate FileReader error
      setTimeout(() => {
        if (mockFileReader.onerror) {
          mockFileReader.onerror()
        }
      }, 0)

      await expect(readPromise).rejects.toThrow(
        "importDialog.error.readFileFailed",
      )
    })
  })

  describe("importPrompts", () => {
    it("should import prompts successfully", async () => {
      const prompts = [createMockPrompt()]
      const expectedResult: ImportResult = {
        imported: 1,
        duplicates: 0,
      }

      // Mock the serviceFacade directly on the service instance
      ;(service as any).serviceFacade = {
        saveBulkPrompts: vi.fn().mockResolvedValue(expectedResult),
      }

      const result = await (service as any).importPrompts(prompts)

      expect(result).toEqual(expectedResult)
      expect(
        (service as any).serviceFacade.saveBulkPrompts,
      ).toHaveBeenCalledWith(prompts)
    })

    it("should handle saveBulkPrompts failure", async () => {
      const prompts = [createMockPrompt(), createMockPrompt()]

      // Mock the serviceFacade directly on the service instance
      ;(service as any).serviceFacade = {
        saveBulkPrompts: vi.fn().mockRejectedValue(new Error("Database error")),
      }

      await expect((service as any).importPrompts(prompts)).rejects.toThrow(
        "importDialog.error.bulkImportFailed",
      )
    })
  })

  describe("parseRowData with variables", () => {
    it("should parse valid variables JSON string", () => {
      const rowData = createMockCSVRowData({
        variables: JSON.stringify([
          {
            name: "name",
            type: "text",
            defaultValue: "John",
          },
          {
            name: "age",
            type: "select",
            defaultValue: "30",
            selectOptions: {
              options: ["20", "30", "40"],
            },
          },
        ]),
      })

      const result = (service as any).parseRowData(rowData)

      expect(result.variables).toBeDefined()
      expect(result.variables).toHaveLength(2)
      expect(result.variables[0].name).toBe("name")
      expect(result.variables[0].type).toBe("text")
      expect(result.variables[0].defaultValue).toBe("John")
      expect(result.variables[1].name).toBe("age")
      expect(result.variables[1].type).toBe("select")
      expect(result.variables[1].selectOptions?.options).toEqual([
        "20",
        "30",
        "40",
      ])
    })

    it("should handle empty variables string", () => {
      const rowData = createMockCSVRowData({
        variables: "",
      })

      const result = (service as any).parseRowData(rowData)

      expect(result.variables).toBeUndefined()
    })

    it("should handle undefined variables", () => {
      const rowData = createMockCSVRowData({
        variables: undefined,
      })

      const result = (service as any).parseRowData(rowData)

      expect(result.variables).toBeUndefined()
    })

    it("should handle invalid JSON gracefully", () => {
      const rowData = createMockCSVRowData({
        variables: "invalid json",
      })

      const result = (service as any).parseRowData(rowData)

      // Should not throw, variables should be undefined
      expect(result.variables).toBeUndefined()
    })

    it("should handle non-array JSON gracefully", () => {
      const rowData = createMockCSVRowData({
        variables: JSON.stringify({ not: "an array" }),
      })

      const result = (service as any).parseRowData(rowData)

      // Should not throw, variables should be undefined
      expect(result.variables).toBeUndefined()
    })

    it("should handle empty array", () => {
      const rowData = createMockCSVRowData({
        variables: JSON.stringify([]),
      })

      const result = (service as any).parseRowData(rowData)

      expect(result.variables).toBeDefined()
      expect(result.variables).toHaveLength(0)
    })
  })

  describe("parseCSV with variables", () => {
    it("should parse CSV with variables field", () => {
      // Use Papa.unparse to properly format the CSV
      const csvData = {
        fields: [
          "name",
          "content",
          "executionCount",
          "lastExecutedAt",
          "isPinned",
          "lastExecutionUrl",
          "createdAt",
          "updatedAt",
          "variables",
        ],
        data: [
          {
            name: "Test Prompt",
            content: "Content",
            executionCount: 1,
            lastExecutedAt: "2024-01-10T10:00:00.000Z",
            isPinned: false,
            lastExecutionUrl: "https://example.com",
            createdAt: "2024-01-01T10:00:00.000Z",
            updatedAt: "2024-01-01T10:00:00.000Z",
            variables: JSON.stringify([
              { name: "name", type: "text", defaultValue: "John" },
            ]),
          },
        ],
      }
      const csvText = Papa.unparse(csvData, {
        header: true,
        quotes: true,
        delimiter: ",",
      })

      const result = (service as any).parseCSV(csvText)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Test Prompt")
      expect(result[0].variables).toBeDefined()
      expect(result[0].variables).toHaveLength(1)
      expect(result[0].variables[0].name).toBe("name")
    })
  })

  describe("parseRowData with AI metadata and organization fields", () => {
    it("should parse valid aiMetadata JSON string", () => {
      const rowData = createMockCSVRowData({
        isAIGenerated: true,
        aiMetadata: JSON.stringify({
          sourcePromptIds: ["id1", "id2", "id3"],
          sourceCount: 3,
          confirmed: true,
          showInPinned: true,
        }),
        categoryId: "cat-123",
        useCase: "Code review automation",
      })

      const result = (service as any).parseRowData(rowData)

      expect(result.isAIGenerated).toBe(true)
      expect(result.categoryId).toBe("cat-123")
      expect(result.useCase).toBe("Code review automation")
      expect(result.aiMetadata).toBeDefined()
      expect(result.aiMetadata.sourcePromptIds).toEqual(["id1", "id2", "id3"])
      expect(result.aiMetadata.sourceCount).toBe(3)
      expect(result.aiMetadata.confirmed).toBe(true)
      expect(result.aiMetadata.showInPinned).toBe(true)
    })

    it("should handle missing new fields (backward compatibility)", () => {
      const rowData = createMockCSVRowData({
        // New fields are undefined (not present in CSV)
      })

      const result = (service as any).parseRowData(rowData)

      expect(result.isAIGenerated).toBeUndefined()
      expect(result.aiMetadata).toBeUndefined()
      expect(result.categoryId).toBeUndefined()
      expect(result.useCase).toBeUndefined()
    })

    it("should handle empty string values", () => {
      const rowData = createMockCSVRowData({
        isAIGenerated: "",
        aiMetadata: "",
        categoryId: "",
        useCase: "",
      })

      const result = (service as any).parseRowData(rowData)

      expect(result.isAIGenerated).toBeUndefined()
      expect(result.aiMetadata).toBeUndefined()
      expect(result.categoryId).toBeUndefined()
      expect(result.useCase).toBeUndefined()
    })

    it("should handle invalid aiMetadata JSON gracefully", () => {
      const rowData = createMockCSVRowData({
        aiMetadata: "invalid json",
      })

      const result = (service as any).parseRowData(rowData)

      // Should not throw, aiMetadata should be undefined
      expect(result.aiMetadata).toBeUndefined()
    })

    it("should handle incomplete aiMetadata object", () => {
      const rowData = createMockCSVRowData({
        aiMetadata: JSON.stringify({
          sourcePromptIds: ["id1"],
          // Missing sourceCount, confirmed, showInPinned
        }),
      })

      const result = (service as any).parseRowData(rowData)

      // Should not throw, aiMetadata should be undefined due to validation failure
      expect(result.aiMetadata).toBeUndefined()
    })

    it("should handle aiMetadata with wrong types", () => {
      const rowData = createMockCSVRowData({
        aiMetadata: JSON.stringify({
          sourcePromptIds: "not-an-array",
          sourceCount: 3,
          confirmed: true,
          showInPinned: true,
        }),
      })

      const result = (service as any).parseRowData(rowData)

      // Should not throw, aiMetadata should be undefined due to validation failure
      expect(result.aiMetadata).toBeUndefined()
    })

    it("should handle negative sourceCount", () => {
      const rowData = createMockCSVRowData({
        aiMetadata: JSON.stringify({
          sourcePromptIds: ["id1"],
          sourceCount: -1,
          confirmed: true,
          showInPinned: true,
        }),
      })

      const result = (service as any).parseRowData(rowData)

      // Should not throw, aiMetadata should be undefined due to validation failure
      expect(result.aiMetadata).toBeUndefined()
    })

    it("should handle non-string elements in sourcePromptIds", () => {
      const rowData = createMockCSVRowData({
        aiMetadata: JSON.stringify({
          sourcePromptIds: ["id1", 123, "id3"],
          sourceCount: 3,
          confirmed: true,
          showInPinned: true,
        }),
      })

      const result = (service as any).parseRowData(rowData)

      // Should not throw, aiMetadata should be undefined due to validation failure
      expect(result.aiMetadata).toBeUndefined()
    })

    it("should handle string isAIGenerated conversion", () => {
      const rowData1 = createMockCSVRowData({
        isAIGenerated: "true",
      })

      const result1 = (service as any).parseRowData(rowData1)
      expect(result1.isAIGenerated).toBe(true)

      const rowData2 = createMockCSVRowData({
        isAIGenerated: "false",
      })

      const result2 = (service as any).parseRowData(rowData2)
      // Empty/false-y values are converted to undefined
      expect(result2.isAIGenerated).toBeUndefined()
    })

    it("should handle numeric isAIGenerated conversion", () => {
      const rowData1 = createMockCSVRowData({
        isAIGenerated: 1,
      })

      const result1 = (service as any).parseRowData(rowData1)
      expect(result1.isAIGenerated).toBe(true)

      const rowData2 = createMockCSVRowData({
        isAIGenerated: 0,
      })

      const result2 = (service as any).parseRowData(rowData2)
      expect(result2.isAIGenerated).toBeUndefined()
    })

    it("should handle empty sourcePromptIds array", () => {
      const rowData = createMockCSVRowData({
        aiMetadata: JSON.stringify({
          sourcePromptIds: [],
          sourceCount: 0,
          confirmed: true,
          showInPinned: false,
        }),
      })

      const result = (service as any).parseRowData(rowData)

      expect(result.aiMetadata).toBeDefined()
      expect(result.aiMetadata.sourcePromptIds).toEqual([])
      expect(result.aiMetadata.sourceCount).toBe(0)
    })
  })
})
