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

import { PromptImportService } from "../promptImportService"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { generatePromptId } from "@/utils/idGenerator"

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
      }).toThrow("Missing required field:")
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

    it("should skip invalid rows and continue processing", () => {
      const csvText = `name,content,executionCount,lastExecutedAt,isPinned,lastExecutionUrl,createdAt,updatedAt
Test Prompt 1,Content 1,1,2024-01-10T10:00:00.000Z,false,https://example.com,2024-01-01T10:00:00.000Z,2024-01-01T10:00:00.000Z
Invalid Row,,,,,,
Test Prompt 2,Content 2,2,2024-01-11T10:00:00.000Z,true,https://example2.com,2024-01-02T10:00:00.000Z,2024-01-02T10:00:00.000Z`

      const result = (service as any).parseCSV(csvText)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("Test Prompt 1")
      expect(result[1].name).toBe("Test Prompt 2")
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

      await expect(readPromise).rejects.toThrow("Failed to read file")
    })
  })

  describe("importPrompts", () => {
    it("should import prompts successfully", async () => {
      const prompts = [createMockPrompt()]
      const expectedResult: ImportResult = {
        imported: 1,
        duplicates: 0,
        errors: 0,
        errorMessages: [],
      }

      // Mock the serviceFacade directly on the service instance
      ;(service as any).serviceFacade = {
        saveBulkPrompts: vi.fn().mockResolvedValue(expectedResult),
      }

      const result = await (service as any).importPrompts(prompts)

      expect(result).toEqual(expectedResult)
      expect((service as any).serviceFacade.saveBulkPrompts).toHaveBeenCalledWith(prompts)
    })

    it("should handle saveBulkPrompts failure", async () => {
      const prompts = [createMockPrompt(), createMockPrompt()]

      // Mock the serviceFacade directly on the service instance
      ;(service as any).serviceFacade = {
        saveBulkPrompts: vi.fn().mockRejectedValue(new Error("Database error")),
      }

      const result = await (service as any).importPrompts(prompts)

      expect(result).toEqual({
        imported: 0,
        duplicates: 0,
        errors: 2,
        errorMessages: ["Bulk import failed: Error: Database error"],
      })
    })
  })

  describe("processCSVFile", () => {
    it("should process CSV file end-to-end", async () => {
      const csvContent = `name,content,executionCount,lastExecutedAt,isPinned,lastExecutionUrl,createdAt,updatedAt
Test Prompt,Test content,1,2024-01-10T10:00:00.000Z,false,https://example.com,2024-01-01T10:00:00.000Z,2024-01-01T10:00:00.000Z`

      const file = createMockFile(csvContent)
      const expectedResult: ImportResult = {
        imported: 1,
        duplicates: 0,
        errors: 0,
        errorMessages: [],
      }

      // Mock the serviceFacade directly on the service instance
      ;(service as any).serviceFacade = {
        saveBulkPrompts: vi.fn().mockResolvedValue(expectedResult),
      }

      const processPromise = (service as any).processCSVFile(file)

      // Simulate FileReader onload
      setTimeout(() => {
        mockFileReader.result = csvContent
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } })
        }
      }, 0)

      const result = await processPromise

      expect(result).toEqual(expectedResult)
      expect((service as any).serviceFacade.saveBulkPrompts).toHaveBeenCalled()
    })

    it("should handle file reading error", async () => {
      const file = createMockFile("test content")
      const processPromise = (service as any).processCSVFile(file)

      // Simulate FileReader error
      setTimeout(() => {
        if (mockFileReader.onerror) {
          mockFileReader.onerror()
        }
      }, 0)

      await expect(processPromise).rejects.toThrow("Failed to read file")
    })
  })

  describe("importFromCSV", () => {
    it("should create file input and trigger click", async () => {
      // This test just verifies the DOM manipulation part
      // The full file selection flow is too complex to mock reliably
      const mockInput = {
        type: "",
        accept: "",
        style: {},
        click: mockClick,
        onchange: null as any,
      }

      vi.mocked(document.createElement).mockReturnValue(mockInput as any)

      // Start the import process but don't wait for completion
      // as we can't easily simulate the file selection
      service.importFromCSV().catch(() => {
        // Expected to fail without proper file selection simulation
      })

      // Verify DOM operations
      expect(document.createElement).toHaveBeenCalledWith("input")
      expect(mockInput.type).toBe("file")
      expect(mockInput.accept).toBe(".csv")
      expect(mockInput.style.display).toBe("none")
      expect(mockAppendChild).toHaveBeenCalledWith(mockInput)
      expect(mockClick).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalledWith(mockInput)
    })
  })
})
