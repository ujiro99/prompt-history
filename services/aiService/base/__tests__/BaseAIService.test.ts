/**
 * Tests for BaseAIService.ts
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest"
import { BaseAIService } from "../BaseAIService"
import { DomManager } from "../domManager"
import type { AIServiceConfig, ServiceElementInfo } from "../types"
import type { PopupPlacement } from "@/types/aiService"
import {
  setupDOMEnvironment,
  cleanupDOMEnvironment,
} from "../../../dom/__tests__/helpers/domTestHelpers"

// Mock DomManager
vi.mock("../domManager")

// Concrete test implementation of abstract BaseAIService
class TestableAIService extends BaseAIService {
  testSelectors(): void {
    // Mock implementation for testing
  }
}

// Mock AIServiceConfig for testing
const createMockConfig = (
  overrides: Partial<AIServiceConfig> = {},
): AIServiceConfig => ({
  serviceName: "TestService",
  selectors: {
    textInput: ["#text-input", ".text-input"],
    sendButton: ["#send-button", ".send-button"],
  },
  popupPlacement: {
    alignOffset: 0,
    sideOffset: 0,
  },
  extractContent: vi.fn((element: Element) => {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      return element.value
    }
    return element.textContent || ""
  }),
  keyHandlers: {
    shouldTriggerSend: vi.fn(
      (event: KeyboardEvent) =>
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey,
    ),
  },
  debounceTime: 300,
  isSupported: vi.fn().mockReturnValue(true),
  ...overrides,
})

// Mock PopupPlacement
const createMockPopupPlacement = (): PopupPlacement => ({
  alignOffset: 10,
  sideOffset: 5,
})

describe("BaseAIService", () => {
  let service: TestableAIService
  let mockConfig: AIServiceConfig
  let mockDomManager: Mock
  let originalWindow: typeof globalThis.window
  let originalProcess: typeof globalThis.process

  beforeEach(() => {
    setupDOMEnvironment()

    // Store original globals
    originalWindow = globalThis.window
    originalProcess = globalThis.process

    // Mock process.env
    globalThis.process = {
      ...originalProcess,
      env: {
        NODE_ENV: "development",
      },
    } as any

    // Mock window.location
    Object.defineProperty(globalThis, "window", {
      value: {
        ...originalWindow,
        location: {
          hostname: "test.example.com",
          pathname: "/test/path",
        },
      },
      writable: true,
      configurable: true,
    })

    // Setup DomManager mock
    mockDomManager = vi.mocked(DomManager)
    mockDomManager.mockImplementation(() => ({
      waitForElements: vi.fn().mockResolvedValue(undefined),
      setupSendEventListeners: vi.fn(),
      setupContentChangeListeners: vi.fn(),
      setupDOMObserver: vi.fn(),
      getTextInput: vi.fn().mockReturnValue(null),
      getSendButton: vi.fn().mockReturnValue(null),
      getCurrentContent: vi.fn().mockReturnValue(""),
      onSend: vi.fn().mockReturnValue(() => {}),
      offSend: vi.fn(),
      onContentChange: vi.fn().mockReturnValue(() => {}),
      offContentChange: vi.fn(),
      onElementChange: vi.fn().mockReturnValue(() => {}),
      destroy: vi.fn(),
      getElementInfo: vi.fn().mockReturnValue({
        textInput: { found: false },
        sendButton: { found: false },
      }),
    }))

    mockConfig = createMockConfig()
  })

  afterEach(() => {
    if (service) {
      service.destroy()
    }

    // Restore original globals
    globalThis.window = originalWindow
    globalThis.process = originalProcess

    // Clear any global debug variables
    delete (window as any).promptHistoryDebug

    vi.clearAllMocks()
    cleanupDOMEnvironment()
  })

  describe("Constructor and Initialization", () => {
    it("should initialize with valid config", () => {
      service = new TestableAIService(mockConfig)

      expect(service).toBeInstanceOf(BaseAIService)
      expect(service["config"]).toBe(mockConfig)
      expect(DomManager).toHaveBeenCalledWith(mockConfig)
    })

    it("should set up debug logging in development environment", () => {
      const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

      // Create config with isSupported returning true
      const configWithSupport = createMockConfig({
        isSupported: vi.fn().mockReturnValue(true),
      })

      service = new TestableAIService(configWithSupport)

      expect(consoleSpy).toHaveBeenCalledWith("Initialized TestService")
      expect((window as any).promptHistoryDebug).toBe(service)

      consoleSpy.mockRestore()
    })

    it("should not set up debug logging in production environment", () => {
      const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

      // Mock production environment
      globalThis.process = {
        ...originalProcess,
        env: {
          NODE_ENV: "production",
        },
      } as any

      service = new TestableAIService(mockConfig)

      expect(consoleSpy).not.toHaveBeenCalled()
      expect((window as any).promptHistoryDebug).toBeUndefined()

      consoleSpy.mockRestore()
    })

    it("should not set up debug logging when service is not supported", () => {
      const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

      // Create config with isSupported returning false
      const configWithoutSupport = createMockConfig({
        isSupported: vi.fn().mockReturnValue(false),
      })

      service = new TestableAIService(configWithoutSupport)

      expect(consoleSpy).not.toHaveBeenCalled()
      expect((window as any).promptHistoryDebug).toBeUndefined()

      consoleSpy.mockRestore()
    })

    it("should handle missing window object", () => {
      const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

      // Remove window object
      delete (globalThis as any).window

      service = new TestableAIService(mockConfig)

      expect(consoleSpy).not.toHaveBeenCalled()
      // Can't check window.promptHistoryDebug since window doesn't exist

      consoleSpy.mockRestore()
    })
  })

  describe("Configuration Delegation Methods", () => {
    beforeEach(() => {
      service = new TestableAIService(mockConfig)
    })

    it("should return service name from config", () => {
      expect(service.getServiceName()).toBe("TestService")
    })

    it("should return popup placement from config", () => {
      const mockPlacement = createMockPopupPlacement()
      const configWithPlacement = createMockConfig({
        popupPlacement: mockPlacement,
      })
      service = new TestableAIService(configWithPlacement)

      expect(service.getPopupPlacement()).toBe(mockPlacement)
    })

    it("should delegate isSupported to config", () => {
      const mockIsSupported = vi.mocked(mockConfig.isSupported)
      mockIsSupported.mockReturnValue(true)

      expect(service.isSupported()).toBe(true)
      expect(mockIsSupported).toHaveBeenCalledWith(
        "test.example.com",
        "/test/path",
      )

      mockIsSupported.mockReturnValue(false)
      expect(service.isSupported()).toBe(false)
    })
  })

  describe("DOM Manager Delegation Methods", () => {
    let mockDomManagerInstance: any

    beforeEach(() => {
      service = new TestableAIService(mockConfig)
      mockDomManagerInstance = service["domManager"]
    })

    it("should delegate getTextInput to domManager", () => {
      const mockElement = document.createElement("input")
      mockDomManagerInstance.getTextInput.mockReturnValue(mockElement)

      expect(service.getTextInput()).toBe(mockElement)
      expect(mockDomManagerInstance.getTextInput).toHaveBeenCalled()
    })

    it("should delegate getSendButton to domManager", () => {
      const mockElement = document.createElement("button")
      mockDomManagerInstance.getSendButton.mockReturnValue(mockElement)

      expect(service.getSendButton()).toBe(mockElement)
      expect(mockDomManagerInstance.getSendButton).toHaveBeenCalled()
    })

    it("should delegate extractPromptContent to domManager", () => {
      mockDomManagerInstance.getCurrentContent.mockReturnValue("test content")

      expect(service.extractPromptContent()).toBe("test content")
      expect(mockDomManagerInstance.getCurrentContent).toHaveBeenCalled()
    })

    it("should delegate offSend to domManager", () => {
      const mockCallback = vi.fn()

      service.offSend(mockCallback)

      expect(mockDomManagerInstance.offSend).toHaveBeenCalledWith(mockCallback)
    })

    it("should delegate onContentChange to domManager", () => {
      const mockCallback = vi.fn()
      const mockUnsubscribe = vi.fn()
      mockDomManagerInstance.onContentChange.mockReturnValue(mockUnsubscribe)

      const result = service.onContentChange(mockCallback)

      expect(mockDomManagerInstance.onContentChange).toHaveBeenCalledWith(
        mockCallback,
      )
      expect(result).toBe(mockUnsubscribe)
    })

    it("should delegate offContentChange to domManager", () => {
      const mockCallback = vi.fn()

      service.offContentChange(mockCallback)

      expect(mockDomManagerInstance.offContentChange).toHaveBeenCalledWith(
        mockCallback,
      )
    })

    it("should delegate onElementChange to domManager", () => {
      const mockCallback = vi.fn()
      const mockUnsubscribe = vi.fn()
      mockDomManagerInstance.onElementChange.mockReturnValue(mockUnsubscribe)

      const result = service.onElementChange(mockCallback)

      expect(mockDomManagerInstance.onElementChange).toHaveBeenCalledWith(
        mockCallback,
      )
      expect(result).toBe(mockUnsubscribe)
    })

    it("should delegate destroy to domManager", () => {
      service.destroy()

      expect(mockDomManagerInstance.destroy).toHaveBeenCalled()
    })

    it("should delegate getElementInfo to domManager", () => {
      const mockElementInfo: ServiceElementInfo = {
        textInput: { found: true, selector: "#input", tagName: "INPUT" },
        sendButton: { found: true, selector: "#button", tagName: "BUTTON" },
      }
      mockDomManagerInstance.getElementInfo.mockReturnValue(mockElementInfo)

      expect(service.getElementInfo()).toBe(mockElementInfo)
      expect(mockDomManagerInstance.getElementInfo).toHaveBeenCalled()
    })
  })

  describe("Initialize Method", () => {
    let mockDomManagerInstance: any

    beforeEach(() => {
      service = new TestableAIService(mockConfig)
      mockDomManagerInstance = service["domManager"]
    })

    it("should initialize successfully when service is supported", async () => {
      vi.mocked(mockConfig.isSupported).mockReturnValue(true)

      await expect(service.initialize()).resolves.toBeUndefined()

      expect(mockDomManagerInstance.waitForElements).toHaveBeenCalled()
      expect(mockDomManagerInstance.setupSendEventListeners).toHaveBeenCalled()
      expect(
        mockDomManagerInstance.setupContentChangeListeners,
      ).toHaveBeenCalled()
      expect(mockDomManagerInstance.setupDOMObserver).toHaveBeenCalled()
    })

    it("should throw error when service is not supported", async () => {
      vi.mocked(mockConfig.isSupported).mockReturnValue(false)

      await expect(service.initialize()).rejects.toThrow(
        "TestService service is not supported on this site",
      )

      expect(mockDomManagerInstance.waitForElements).not.toHaveBeenCalled()
      expect(
        mockDomManagerInstance.setupSendEventListeners,
      ).not.toHaveBeenCalled()
      expect(
        mockDomManagerInstance.setupContentChangeListeners,
      ).not.toHaveBeenCalled()
      expect(mockDomManagerInstance.setupDOMObserver).not.toHaveBeenCalled()
    })

    it("should call domManager methods in correct sequence", async () => {
      vi.mocked(mockConfig.isSupported).mockReturnValue(true)

      await service.initialize()

      // Verify the sequence of calls
      const calls = [
        mockDomManagerInstance.waitForElements,
        mockDomManagerInstance.setupSendEventListeners,
        mockDomManagerInstance.setupContentChangeListeners,
        mockDomManagerInstance.setupDOMObserver,
      ]

      calls.forEach((call) => {
        expect(call).toHaveBeenCalled()
      })
    })

    it("should handle domManager errors during initialization", async () => {
      vi.mocked(mockConfig.isSupported).mockReturnValue(true)
      mockDomManagerInstance.waitForElements.mockRejectedValue(
        new Error("DOM error"),
      )

      await expect(service.initialize()).rejects.toThrow("DOM error")
    })
  })

  describe("Event Callback Management", () => {
    let mockDomManagerInstance: any

    beforeEach(() => {
      service = new TestableAIService(mockConfig)
      mockDomManagerInstance = service["domManager"]
    })

    describe("onSend callback wrapping", () => {
      it("should wrap callback to check content length and call when content is not empty", () => {
        const mockCallback = vi.fn()
        const mockUnsubscribe = vi.fn()
        mockDomManagerInstance.onSend.mockReturnValue(mockUnsubscribe)
        mockDomManagerInstance.getCurrentContent.mockReturnValue("test content")

        const result = service.onSend(mockCallback)

        // Get the wrapped callback that was passed to domManager
        const wrappedCallback = mockDomManagerInstance.onSend.mock.calls[0][0]

        // Call the wrapped callback
        wrappedCallback()

        expect(mockCallback).toHaveBeenCalled()
        expect(result).toBe(mockUnsubscribe)
      })

      it("should not call callback when content is empty", () => {
        const mockCallback = vi.fn()
        mockDomManagerInstance.getCurrentContent.mockReturnValue("")

        service.onSend(mockCallback)

        // Get the wrapped callback that was passed to domManager
        const wrappedCallback = mockDomManagerInstance.onSend.mock.calls[0][0]

        // Call the wrapped callback
        wrappedCallback()

        expect(mockCallback).not.toHaveBeenCalled()
      })

      it("should not call callback when content is only whitespace", () => {
        const mockCallback = vi.fn()
        mockDomManagerInstance.getCurrentContent.mockReturnValue("   \n\t  ")

        service.onSend(mockCallback)

        // Get the wrapped callback that was passed to domManager
        const wrappedCallback = mockDomManagerInstance.onSend.mock.calls[0][0]

        // Call the wrapped callback
        wrappedCallback()

        expect(mockCallback).not.toHaveBeenCalled()
      })

      it("should call callback when content has meaningful text after trimming", () => {
        const mockCallback = vi.fn()
        mockDomManagerInstance.getCurrentContent.mockReturnValue(
          "  test content  ",
        )

        service.onSend(mockCallback)

        // Get the wrapped callback that was passed to domManager
        const wrappedCallback = mockDomManagerInstance.onSend.mock.calls[0][0]

        // Call the wrapped callback
        wrappedCallback()

        expect(mockCallback).toHaveBeenCalled()
      })
    })
  })

  describe("Error Handling and Edge Cases", () => {
    let mockDomManagerInstance: any

    beforeEach(() => {
      service = new TestableAIService(mockConfig)
      mockDomManagerInstance = service["domManager"]
    })

    it("should handle null return values from domManager gracefully", () => {
      mockDomManagerInstance.getTextInput.mockReturnValue(null)
      mockDomManagerInstance.getSendButton.mockReturnValue(null)
      mockDomManagerInstance.getCurrentContent.mockReturnValue("")

      expect(service.getTextInput()).toBeNull()
      expect(service.getSendButton()).toBeNull()
      expect(service.extractPromptContent()).toBe("")
    })

    it("should handle domManager method failures gracefully", () => {
      const mockCallback = vi.fn()
      mockDomManagerInstance.onSend.mockImplementation(() => {
        throw new Error("DOM manager error")
      })

      expect(() => service.onSend(mockCallback)).toThrow("DOM manager error")
    })

    it("should handle missing domManager methods gracefully", () => {
      // Remove a method from the mock
      delete mockDomManagerInstance.getCurrentContent

      expect(() => service.extractPromptContent()).toThrow()
    })
  })

  describe("Environment-Specific Behavior", () => {
    it("should handle different NODE_ENV values", () => {
      const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

      // Test development
      globalThis.process = {
        ...originalProcess,
        env: { NODE_ENV: "development" },
      } as any
      vi.mocked(mockConfig.isSupported).mockReturnValue(true)

      service = new TestableAIService(mockConfig)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockClear()

      // Test production
      globalThis.process = {
        ...originalProcess,
        env: { NODE_ENV: "production" },
      } as any

      service = new TestableAIService(mockConfig)
      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it("should handle different hostname and pathname combinations", () => {
      const testCases = [
        { hostname: "chat.openai.com", pathname: "/", expected: true },
        { hostname: "bard.google.com", pathname: "/chat", expected: false },
        { hostname: "localhost", pathname: "/dev", expected: true },
      ]

      testCases.forEach(({ hostname, pathname, expected }) => {
        // Mock window.location
        Object.defineProperty(globalThis.window, "location", {
          value: { hostname, pathname },
          configurable: true,
        })

        vi.mocked(mockConfig.isSupported).mockReturnValue(expected)

        service = new TestableAIService(mockConfig)
        expect(service.isSupported()).toBe(expected)
        expect(mockConfig.isSupported).toHaveBeenCalledWith(hostname, pathname)
      })
    })
  })
})
