/**
 * Tests for DebugInterface.ts
 * @vitest-environment happy-dom
 */

// Mock analytics first (must be before imports)
import { vi } from "vitest"

vi.mock("#imports", () => ({
  analytics: {
    track: vi.fn(),
  },
}))

// Mock all storage dependencies
vi.mock("../../storage", () => ({
  StorageService: {
    getInstance: vi.fn(() => ({
      getPrompts: vi.fn().mockResolvedValue([]),
      savePrompt: vi.fn().mockResolvedValue(undefined),
    })),
  },
}))

// Mock PromptServiceFacade completely
vi.mock("../../promptServiceFacade", () => {
  const mockGetInstance = vi.fn()
  return {
    PromptServiceFacade: {
      getInstance: mockGetInstance,
    },
  }
})

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { DebugInterface } from "../debugInterface"
import { PromptServiceFacade } from "../../promptServiceFacade"
import type { ServiceElementInfo } from "../../aiService/base/types"

describe("DebugInterface", () => {
  let debugInterface: DebugInterface
  let mockPromptServiceFacade: any
  let mockAIService: any

  beforeEach(() => {
    // Setup AI service mock
    mockAIService = {
      testSelectors: vi.fn(),
      getElementInfo: vi.fn().mockReturnValue({
        textInput: { found: true, selector: "#input", tagName: "INPUT" },
        sendButton: { found: true, selector: "#button", tagName: "BUTTON" },
      }),
      getServiceName: vi.fn().mockReturnValue("TestService"),
      extractPromptContent: vi.fn().mockReturnValue("test prompt content"),
    }

    // Setup PromptServiceFacade mock
    mockPromptServiceFacade = {
      getAIService: vi.fn().mockReturnValue(mockAIService),
    }

    // Mock PromptServiceFacade.getInstance()
    vi.mocked(PromptServiceFacade.getInstance).mockReturnValue(
      mockPromptServiceFacade,
    )

    debugInterface = DebugInterface.getInstance()
  })

  afterEach(() => {
    vi.clearAllMocks()
    // Reset singleton instance
    ;(DebugInterface as any).instance = null
  })

  describe("Constructor and Singleton Pattern", () => {
    it("should return singleton instance", () => {
      const instance1 = DebugInterface.getInstance()
      const instance2 = DebugInterface.getInstance()

      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(DebugInterface)
    })

    it("should create new instance only once", () => {
      // Reset singleton
      ;(DebugInterface as any).instance = null

      const instance1 = DebugInterface.getInstance()
      const instance2 = DebugInterface.getInstance()
      const instance3 = DebugInterface.getInstance()

      expect(instance1).toBe(instance2)
      expect(instance2).toBe(instance3)
    })
  })

  describe("Service Integration", () => {
    it("should get PromptServiceFacade instance", () => {
      // Access private method through any type
      const service = (debugInterface as any).getService()

      expect(PromptServiceFacade.getInstance).toHaveBeenCalled()
      expect(service).toBe(mockPromptServiceFacade)
    })
  })

  describe("testSelectors() Method", () => {
    it("should call testSelectors on AI service when service is available", () => {
      debugInterface.testSelectors()

      expect(mockPromptServiceFacade.getAIService).toHaveBeenCalled()
      expect(mockAIService.testSelectors).toHaveBeenCalled()
    })

    it("should warn when AI service is not initialized", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      mockPromptServiceFacade.getAIService.mockReturnValue(null)

      debugInterface.testSelectors()

      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ AI service not initialized yet",
      )
      expect(mockAIService.testSelectors).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe("getElementInfo() Method", () => {
    it("should return element info when AI service is available", () => {
      const expectedInfo: ServiceElementInfo = {
        textInput: { found: true, selector: "#input", tagName: "INPUT" },
        sendButton: { found: true, selector: "#button", tagName: "BUTTON" },
      }

      const result = debugInterface.getElementInfo()

      expect(mockPromptServiceFacade.getAIService).toHaveBeenCalled()
      expect(mockAIService.getElementInfo).toHaveBeenCalled()
      expect(result).toEqual(expectedInfo)
    })

    it("should return null and warn when AI service is not initialized", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      mockPromptServiceFacade.getAIService.mockReturnValue(null)

      const result = debugInterface.getElementInfo()

      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ AI service not initialized yet",
      )
      expect(result).toBeNull()
      expect(mockAIService.getElementInfo).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe("getServiceName() Method", () => {
    it("should return service name when AI service is available", () => {
      const result = debugInterface.getServiceName()

      expect(mockPromptServiceFacade.getAIService).toHaveBeenCalled()
      expect(mockAIService.getServiceName).toHaveBeenCalled()
      expect(result).toBe("TestService")
    })

    it("should return null and warn when AI service is not initialized", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      mockPromptServiceFacade.getAIService.mockReturnValue(null)

      const result = debugInterface.getServiceName()

      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ AI service not initialized yet",
      )
      expect(result).toBeNull()
      expect(mockAIService.getServiceName).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe("extractPromptContent() Method", () => {
    it("should return prompt content when AI service is available", () => {
      const result = debugInterface.extractPromptContent()

      expect(mockPromptServiceFacade.getAIService).toHaveBeenCalled()
      expect(mockAIService.extractPromptContent).toHaveBeenCalled()
      expect(result).toBe("test prompt content")
    })

    it("should return null and warn when AI service is not initialized", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      mockPromptServiceFacade.getAIService.mockReturnValue(null)

      const result = debugInterface.extractPromptContent()

      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ AI service not initialized yet",
      )
      expect(result).toBeNull()
      expect(mockAIService.extractPromptContent).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it("should return empty string when AI service returns empty content", () => {
      mockAIService.extractPromptContent.mockReturnValue("")

      const result = debugInterface.extractPromptContent()

      expect(result).toBe("")
    })
  })
})
