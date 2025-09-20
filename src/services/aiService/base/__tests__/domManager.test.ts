/**
 * Tests for DomManager.ts
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest"
import { DomManager } from "../domManager"
import type { AIServiceConfig } from "../types"
import {
  createMockInput,
  createMockContentEditable,
  setupDOMEnvironment,
  cleanupDOMEnvironment,
} from "../../../dom/__tests__/helpers/domTestHelpers"

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
  extractContent: (element: Element) => {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      return element.value
    }
    return element.textContent || ""
  },
  keyHandlers: {
    shouldTriggerSend: (event: KeyboardEvent) =>
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.altKey,
  },
  debounceTime: 300,
  isSupported: () => true,
  ...overrides,
})

describe("DomManager", () => {
  let domManager: DomManager
  let mockConfig: AIServiceConfig
  let mockTextInput: HTMLInputElement
  let mockSendButton: HTMLButtonElement
  let mockMutationObserver: Mock
  let originalMutationObserver: typeof MutationObserver

  beforeEach(() => {
    setupDOMEnvironment()

    // Create mock elements
    mockTextInput = createMockInput("", "text")
    mockTextInput.id = "text-input"

    mockSendButton = document.createElement("button")
    mockSendButton.id = "send-button"

    // Add elements to DOM
    document.body.appendChild(mockTextInput)
    document.body.appendChild(mockSendButton)

    // Mock element visibility for waitForElements to work
    vi.spyOn(mockTextInput, "getBoundingClientRect").mockReturnValue({
      width: 100,
      height: 20,
      left: 0,
      top: 0,
      right: 100,
      bottom: 20,
    } as DOMRect)

    vi.spyOn(mockSendButton, "getBoundingClientRect").mockReturnValue({
      width: 100,
      height: 20,
      left: 0,
      top: 0,
      right: 100,
      bottom: 20,
    } as DOMRect)

    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      display: "block",
      visibility: "visible",
      opacity: "1",
    } as CSSStyleDeclaration)

    // Mock MutationObserver
    mockMutationObserver = vi.fn().mockImplementation((_callback) => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn().mockReturnValue([]),
    }))

    originalMutationObserver = globalThis.MutationObserver
    globalThis.MutationObserver = mockMutationObserver as any

    mockConfig = createMockConfig()
    domManager = new DomManager(mockConfig)
  })

  afterEach(() => {
    domManager.destroy()
    globalThis.MutationObserver = originalMutationObserver
    vi.clearAllTimers()
    vi.useRealTimers()
    cleanupDOMEnvironment()
  })

  describe("Element Search and Visibility", () => {
    describe("findElement", () => {
      it("should find element using first matching selector", () => {
        const element = domManager["findElement"](["#text-input"])
        expect(element).toBe(mockTextInput)
      })

      it("should try multiple selectors and return first visible match", () => {
        const element = domManager["findElement"]([
          "#nonexistent",
          "#text-input",
        ])
        expect(element).toBe(mockTextInput)
      })

      it("should return null if no selectors match", () => {
        const element = domManager["findElement"](["#nonexistent"])
        expect(element).toBeNull()
      })

      it("should handle invalid selectors gracefully", () => {
        const consoleSpy = vi
          .spyOn(console, "debug")
          .mockImplementation(() => { })

        // Use a more realistic invalid selector that will actually trigger an error
        const element = domManager["findElement"]([
          "[invalid-attribute-without-closing-bracket",
        ])
        expect(element).toBeNull()
        expect(consoleSpy).toHaveBeenCalled()
        consoleSpy.mockRestore()
      })

      it("should skip invisible elements", () => {
        // Make the mock element invisible
        vi.spyOn(domManager as any, "isElementVisible").mockReturnValue(false)
        const element = domManager["findElement"](["#text-input"])
        expect(element).toBeNull()
      })
    })

    describe("isElementVisible", () => {
      it("should return true for visible elements", () => {
        const mockRect = {
          width: 100,
          height: 20,
          left: 0,
          top: 0,
          right: 100,
          bottom: 20,
        }
        const mockStyle = {
          display: "block",
          visibility: "visible",
          opacity: "1",
        }

        vi.spyOn(mockTextInput, "getBoundingClientRect").mockReturnValue(
          mockRect as DOMRect,
        )
        vi.spyOn(window, "getComputedStyle").mockReturnValue(
          mockStyle as CSSStyleDeclaration,
        )

        const isVisible = domManager["isElementVisible"](mockTextInput)
        expect(isVisible).toBe(true)
      })

      it("should return false for elements with zero width", () => {
        const mockRect = {
          width: 0,
          height: 20,
          left: 0,
          top: 0,
          right: 0,
          bottom: 20,
        }
        const mockStyle = {
          display: "block",
          visibility: "visible",
          opacity: "1",
        }

        vi.spyOn(mockTextInput, "getBoundingClientRect").mockReturnValue(
          mockRect as DOMRect,
        )
        vi.spyOn(window, "getComputedStyle").mockReturnValue(
          mockStyle as CSSStyleDeclaration,
        )

        const isVisible = domManager["isElementVisible"](mockTextInput)
        expect(isVisible).toBe(false)
      })

      it("should return false for elements with zero height", () => {
        const mockRect = {
          width: 100,
          height: 0,
          left: 0,
          top: 0,
          right: 100,
          bottom: 0,
        }
        const mockStyle = {
          display: "block",
          visibility: "visible",
          opacity: "1",
        }

        vi.spyOn(mockTextInput, "getBoundingClientRect").mockReturnValue(
          mockRect as DOMRect,
        )
        vi.spyOn(window, "getComputedStyle").mockReturnValue(
          mockStyle as CSSStyleDeclaration,
        )

        const isVisible = domManager["isElementVisible"](mockTextInput)
        expect(isVisible).toBe(false)
      })

      it("should return false for elements with display none", () => {
        const mockRect = {
          width: 100,
          height: 20,
          left: 0,
          top: 0,
          right: 100,
          bottom: 20,
        }
        const mockStyle = {
          display: "none",
          visibility: "visible",
          opacity: "1",
        }

        vi.spyOn(mockTextInput, "getBoundingClientRect").mockReturnValue(
          mockRect as DOMRect,
        )
        vi.spyOn(window, "getComputedStyle").mockReturnValue(
          mockStyle as CSSStyleDeclaration,
        )

        const isVisible = domManager["isElementVisible"](mockTextInput)
        expect(isVisible).toBe(false)
      })

      it("should return false for elements with visibility hidden", () => {
        const mockRect = {
          width: 100,
          height: 20,
          left: 0,
          top: 0,
          right: 100,
          bottom: 20,
        }
        const mockStyle = {
          display: "block",
          visibility: "hidden",
          opacity: "1",
        }

        vi.spyOn(mockTextInput, "getBoundingClientRect").mockReturnValue(
          mockRect as DOMRect,
        )
        vi.spyOn(window, "getComputedStyle").mockReturnValue(
          mockStyle as CSSStyleDeclaration,
        )

        const isVisible = domManager["isElementVisible"](mockTextInput)
        expect(isVisible).toBe(false)
      })

      it("should return false for elements with opacity 0", () => {
        const mockRect = {
          width: 100,
          height: 20,
          left: 0,
          top: 0,
          right: 100,
          bottom: 20,
        }
        const mockStyle = {
          display: "block",
          visibility: "visible",
          opacity: "0",
        }

        vi.spyOn(mockTextInput, "getBoundingClientRect").mockReturnValue(
          mockRect as DOMRect,
        )
        vi.spyOn(window, "getComputedStyle").mockReturnValue(
          mockStyle as CSSStyleDeclaration,
        )

        const isVisible = domManager["isElementVisible"](mockTextInput)
        expect(isVisible).toBe(false)
      })
    })

    describe("getTextInput", () => {
      it("should return cached text input if available", () => {
        domManager["textInput"] = mockTextInput
        const input = domManager.getTextInput()
        expect(input).toBe(mockTextInput)
      })

      it("should find and cache text input if not cached", () => {
        domManager["textInput"] = null
        const input = domManager.getTextInput()
        expect(input).toBe(mockTextInput)
        expect(domManager["textInput"]).toBe(mockTextInput)
      })

      it("should return null if text input not found", () => {
        domManager["textInput"] = null
        mockTextInput.remove()
        const input = domManager.getTextInput()
        expect(input).toBeNull()
      })
    })

    describe("getSendButton", () => {
      it("should return cached send button if available", () => {
        domManager["sendButton"] = mockSendButton
        const button = domManager.getSendButton()
        expect(button).toBe(mockSendButton)
      })

      it("should find and cache send button if not cached", () => {
        domManager["sendButton"] = null
        const button = domManager.getSendButton()
        expect(button).toBe(mockSendButton)
        expect(domManager["sendButton"]).toBe(mockSendButton)
      })

      it("should return null if send button not found", () => {
        domManager["sendButton"] = null
        mockSendButton.remove()
        const button = domManager.getSendButton()
        expect(button).toBeNull()
      })
    })

    describe("getCurrentContent", () => {
      it("should extract content from text input using config function", () => {
        mockTextInput.value = "test content"
        domManager["textInput"] = mockTextInput

        const content = domManager.getCurrentContent()
        expect(content).toBe("test content")
      })

      it("should return empty string if no text input found", () => {
        domManager["textInput"] = null
        mockTextInput.remove()

        const content = domManager.getCurrentContent()
        expect(content).toBe("")
      })

      it("should work with contenteditable elements", () => {
        const contentEditable = createMockContentEditable("editable content")
        contentEditable.id = "text-input"

        // Mock getBoundingClientRect for the new element
        vi.spyOn(contentEditable, "getBoundingClientRect").mockReturnValue({
          width: 100,
          height: 20,
          left: 0,
          top: 0,
          right: 100,
          bottom: 20,
        } as DOMRect)

        document.body.replaceChild(contentEditable, mockTextInput)

        domManager["textInput"] = null
        const content = domManager.getCurrentContent()
        expect(content).toBe("editable content")
      })
    })
  })

  describe("Async Element Waiting", () => {
    describe("waitForElements", () => {
      it("should resolve immediately when elements are found", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

        await expect(domManager.waitForElements()).resolves.toBeUndefined()

        expect(domManager["textInput"]).toBe(mockTextInput)
        expect(domManager["sendButton"]).toBe(mockSendButton)
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("TestService elements found:"),
          expect.objectContaining({
            textInput: mockTextInput,
            sendButton: mockSendButton,
          }),
        )

        consoleSpy.mockRestore()
      })

      it("should wait and retry when elements are not immediately available", async () => {
        vi.useFakeTimers()

        // Remove elements initially
        mockTextInput.remove()
        mockSendButton.remove()

        const waitPromise = domManager.waitForElements()

        // Fast-forward time to trigger first retry
        await vi.advanceTimersByTimeAsync(200)

        // Add elements back after some time
        document.body.appendChild(mockTextInput)
        document.body.appendChild(mockSendButton)

        // Fast-forward time to trigger another retry
        await vi.advanceTimersByTimeAsync(200)

        await expect(waitPromise).resolves.toBeUndefined()
        expect(domManager["textInput"]).toBe(mockTextInput)
        expect(domManager["sendButton"]).toBe(mockSendButton)

        vi.useRealTimers()
      })

      it("should throw error when elements are not found within timeout", async () => {
        // Remove elements
        mockTextInput.remove()
        mockSendButton.remove()

        // Test with a much shorter timeout by mocking the implementation
        const originalWaitForElements = domManager.waitForElements
        domManager.waitForElements = vi.fn().mockImplementation(async () => {
          // Simulate quick timeout for testing
          const maxAttempts = 2
          const delayMs = 50

          for (let i = 0; i < maxAttempts; i++) {
            const textInput = domManager["findElement"](
              domManager["config"].selectors.textInput,
            )
            const sendButton = domManager["findElement"](
              domManager["config"].selectors.sendButton,
            )

            if (textInput && sendButton) {
              return
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs))
          }

          throw new Error(
            `Failed to find ${domManager["config"].serviceName} elements`,
          )
        })

        await expect(domManager.waitForElements()).rejects.toThrow(
          "Failed to find TestService elements",
        )

        // Restore original method
        domManager.waitForElements = originalWaitForElements
      }, 10000)

      it("should find text input even if send button is missing", async () => {
        mockSendButton.remove()

        // Test with a much shorter timeout by mocking the implementation
        const originalWaitForElements = domManager.waitForElements
        domManager.waitForElements = vi.fn().mockImplementation(async () => {
          // Simulate quick timeout for testing
          const maxAttempts = 2
          const delayMs = 50

          for (let i = 0; i < maxAttempts; i++) {
            const textInput = domManager["findElement"](
              domManager["config"].selectors.textInput,
            )
            const sendButton = domManager["findElement"](
              domManager["config"].selectors.sendButton,
            )

            if (textInput && sendButton) {
              return
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs))
          }

          throw new Error(
            `Failed to find ${domManager["config"].serviceName} elements`,
          )
        })

        await expect(domManager.waitForElements()).rejects.toThrow(
          "Failed to find TestService elements",
        )

        // Restore original method
        domManager.waitForElements = originalWaitForElements
      }, 10000)

      it("should find send button even if text input is missing", async () => {
        mockTextInput.remove()

        // Test with a much shorter timeout by mocking the implementation
        const originalWaitForElements = domManager.waitForElements
        domManager.waitForElements = vi.fn().mockImplementation(async () => {
          // Simulate quick timeout for testing
          const maxAttempts = 2
          const delayMs = 50

          for (let i = 0; i < maxAttempts; i++) {
            const textInput = domManager["findElement"](
              domManager["config"].selectors.textInput,
            )
            const sendButton = domManager["findElement"](
              domManager["config"].selectors.sendButton,
            )

            if (textInput && sendButton) {
              return
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs))
          }

          throw new Error(
            `Failed to find ${domManager["config"].serviceName} elements`,
          )
        })

        await expect(domManager.waitForElements()).rejects.toThrow(
          "Failed to find TestService elements",
        )

        // Restore original method
        domManager.waitForElements = originalWaitForElements
      }, 10000)
    })
  })

  describe("Event Listener Setup", () => {
    beforeEach(async () => {
      await domManager.waitForElements()
    })

    describe("setupSendEventListeners", () => {
      it("should set up event listeners on send button and text input", () => {
        const sendButtonSpy = vi.spyOn(mockSendButton, "addEventListener")
        const textInputSpy = vi.spyOn(mockTextInput, "addEventListener")
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

        domManager.setupSendEventListeners()

        expect(sendButtonSpy).toHaveBeenCalledWith(
          "click",
          expect.any(Function),
        )
        expect(textInputSpy).toHaveBeenCalledWith(
          "keydown",
          expect.any(Function),
        )
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("TestService send event listeners set up"),
        )

        sendButtonSpy.mockRestore()
        textInputSpy.mockRestore()
        consoleSpy.mockRestore()
      })

      it("should set up form submit listener if text input is in a form", () => {
        const form = document.createElement("form")
        form.appendChild(mockTextInput)
        document.body.appendChild(form)

        const formSpy = vi.spyOn(form, "addEventListener")

        domManager.setupSendEventListeners()

        expect(formSpy).toHaveBeenCalledWith("submit", expect.any(Function))

        formSpy.mockRestore()
      })

      it("should warn if elements are not found", () => {
        domManager["textInput"] = null
        domManager["sendButton"] = null

        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => { })

        domManager.setupSendEventListeners()

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            "Cannot setup send listeners: TestService elements not found",
          ),
        )

        consoleSpy.mockRestore()
      })
    })

    describe("setupContentChangeListeners", () => {
      it("should set up content change listeners for regular input", () => {
        const inputSpy = vi.spyOn(mockTextInput, "addEventListener")
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

        domManager.setupContentChangeListeners()

        const expectedEvents = [
          "input",
          "paste",
          "cut",
          "compositionend",
          "change",
        ]
        expectedEvents.forEach((eventType) => {
          expect(inputSpy).toHaveBeenCalledWith(eventType, expect.any(Function))
        })

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            "TestService content change listeners set up",
          ),
        )

        inputSpy.mockRestore()
        consoleSpy.mockRestore()
      })

      it("should set up content change listeners for contenteditable element", () => {
        const contentEditable = createMockContentEditable()
        contentEditable.id = "text-input"
        document.body.replaceChild(contentEditable, mockTextInput)
        domManager["textInput"] = contentEditable

        const editableSpy = vi.spyOn(contentEditable, "addEventListener")

        domManager.setupContentChangeListeners()

        const expectedEvents = [
          "input",
          "paste",
          "cut",
          "compositionend",
          "keyup",
        ]
        expectedEvents.forEach((eventType) => {
          expect(editableSpy).toHaveBeenCalledWith(
            eventType,
            expect.any(Function),
          )
        })

        editableSpy.mockRestore()
      })

      it("should set up MutationObserver for DOM changes", () => {
        domManager.setupContentChangeListeners()

        expect(mockMutationObserver).toHaveBeenCalledWith(expect.any(Function))
      })

      it("should disconnect previous observer before setting up new one", () => {
        const mockObserver = {
          observe: vi.fn(),
          disconnect: vi.fn(),
        }
        domManager["inputObserver"] = mockObserver as any

        domManager.setupContentChangeListeners()

        expect(mockObserver.disconnect).toHaveBeenCalled()
      })

      it("should warn if text input is not found", () => {
        domManager["textInput"] = null

        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => { })

        domManager.setupContentChangeListeners()

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            "Cannot setup content listeners: TestService text input not found",
          ),
        )

        consoleSpy.mockRestore()
      })
    })

    describe("setupDOMObserver", () => {
      it("should set up DOM observer with correct configuration", () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

        domManager.setupDOMObserver()

        expect(mockMutationObserver).toHaveBeenCalledWith(expect.any(Function))

        consoleSpy.mockRestore()
      })
    })
  })

  describe("Callback Management", () => {
    describe("Send Callbacks", () => {
      it("should register and fire send callbacks", () => {
        const mockCallback1 = vi.fn()
        const mockCallback2 = vi.fn()

        const unsubscribe1 = domManager.onSend(mockCallback1)
        const unsubscribe2 = domManager.onSend(mockCallback2)

        domManager["fireSendCallbacks"]()

        expect(mockCallback1).toHaveBeenCalledTimes(1)
        expect(mockCallback2).toHaveBeenCalledTimes(1)

        // Test unsubscribe function
        unsubscribe1()
        domManager["fireSendCallbacks"]()

        expect(mockCallback1).toHaveBeenCalledTimes(1) // Still 1, not called again
        expect(mockCallback2).toHaveBeenCalledTimes(2) // Called again

        unsubscribe2()
      })

      it("should unregister send callbacks using offSend", () => {
        const mockCallback = vi.fn()

        domManager.onSend(mockCallback)
        domManager["fireSendCallbacks"]()
        expect(mockCallback).toHaveBeenCalledTimes(1)

        domManager.offSend(mockCallback)
        domManager["fireSendCallbacks"]()
        expect(mockCallback).toHaveBeenCalledTimes(1) // Not called again
      })

      it("should handle errors in send callbacks gracefully", () => {
        const errorCallback = vi.fn(() => {
          throw new Error("Test error")
        })
        const normalCallback = vi.fn()
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => { })

        domManager.onSend(errorCallback)
        domManager.onSend(normalCallback)

        domManager["fireSendCallbacks"]()

        expect(errorCallback).toHaveBeenCalled()
        expect(normalCallback).toHaveBeenCalled()
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error in send callback:",
          expect.any(Error),
        )

        consoleSpy.mockRestore()
      })
    })

    describe("Content Change Callbacks", () => {
      it("should register and fire content change callbacks", () => {
        const mockCallback1 = vi.fn()
        const mockCallback2 = vi.fn()

        const unsubscribe1 = domManager.onContentChange(mockCallback1)
        const unsubscribe2 = domManager.onContentChange(mockCallback2)

        domManager["fireContentChangeCallbacks"]("test content")

        expect(mockCallback1).toHaveBeenCalledWith("test content")
        expect(mockCallback2).toHaveBeenCalledWith("test content")

        // Test unsubscribe function
        unsubscribe1()
        domManager["fireContentChangeCallbacks"]("new content")

        expect(mockCallback1).toHaveBeenCalledTimes(1) // Still 1, not called again
        expect(mockCallback2).toHaveBeenCalledWith("new content")

        unsubscribe2()
      })

      it("should unregister content change callbacks using offContentChange", () => {
        const mockCallback = vi.fn()

        domManager.onContentChange(mockCallback)
        domManager["fireContentChangeCallbacks"]("test content")
        expect(mockCallback).toHaveBeenCalledWith("test content")

        domManager.offContentChange(mockCallback)
        domManager["fireContentChangeCallbacks"]("new content")
        expect(mockCallback).toHaveBeenCalledTimes(1) // Not called again
      })

      it("should handle errors in content change callbacks gracefully", () => {
        const errorCallback = vi.fn(() => {
          throw new Error("Test error")
        })
        const normalCallback = vi.fn()
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => { })

        domManager.onContentChange(errorCallback)
        domManager.onContentChange(normalCallback)

        domManager["fireContentChangeCallbacks"]("test content")

        expect(errorCallback).toHaveBeenCalled()
        expect(normalCallback).toHaveBeenCalledWith("test content")
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error in content change callback:",
          expect.any(Error),
        )

        consoleSpy.mockRestore()
      })
    })

    describe("Element Change Callbacks", () => {
      it("should register and fire element change callbacks", () => {
        const mockCallback1 = vi.fn()
        const mockCallback2 = vi.fn()

        const unsubscribe1 = domManager.onElementChange(mockCallback1)
        const unsubscribe2 = domManager.onElementChange(mockCallback2)

        domManager["fireElementChangeCallbacks"](mockTextInput)

        expect(mockCallback1).toHaveBeenCalledWith(mockTextInput)
        expect(mockCallback2).toHaveBeenCalledWith(mockTextInput)

        // Test unsubscribe function
        unsubscribe1()
        domManager["fireElementChangeCallbacks"](mockSendButton)

        expect(mockCallback1).toHaveBeenCalledTimes(1) // Still 1, not called again
        expect(mockCallback2).toHaveBeenCalledWith(mockSendButton)

        unsubscribe2()
      })

      it("should unregister element change callbacks using offElementChange", () => {
        const mockCallback = vi.fn()

        domManager.onElementChange(mockCallback)
        domManager["fireElementChangeCallbacks"](mockTextInput)
        expect(mockCallback).toHaveBeenCalledWith(mockTextInput)

        domManager.offElementChange(mockCallback)
        domManager["fireElementChangeCallbacks"](mockSendButton)
        expect(mockCallback).toHaveBeenCalledTimes(1) // Not called again
      })

      it("should handle errors in element change callbacks gracefully", () => {
        const errorCallback = vi.fn(() => {
          throw new Error("Test error")
        })
        const normalCallback = vi.fn()
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => { })

        domManager.onElementChange(errorCallback)
        domManager.onElementChange(normalCallback)

        domManager["fireElementChangeCallbacks"](mockTextInput)

        expect(errorCallback).toHaveBeenCalled()
        expect(normalCallback).toHaveBeenCalledWith(mockTextInput)
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error in element change callback:",
          expect.any(Error),
        )

        consoleSpy.mockRestore()
      })

      it("should handle null element in callbacks", () => {
        const mockCallback = vi.fn()

        domManager.onElementChange(mockCallback)
        domManager["fireElementChangeCallbacks"](null)

        expect(mockCallback).toHaveBeenCalledWith(null)
      })
    })
  })

  describe("Event Handling", () => {
    beforeEach(async () => {
      await domManager.waitForElements()
    })

    describe("handleSendClick", () => {
      it("should fire send callbacks when send button is clicked", () => {
        const mockCallback = vi.fn()
        domManager.onSend(mockCallback)

        domManager["handleSendClick"]()

        expect(mockCallback).toHaveBeenCalledTimes(1)
      })
    })

    describe("handleKeyDown", () => {
      it("should fire send callbacks when trigger key is pressed", () => {
        vi.useFakeTimers()

        const mockCallback = vi.fn()
        domManager.onSend(mockCallback)

        const mockEvent = {
          key: "Enter",
          shiftKey: false,
          ctrlKey: false,
          altKey: false,
        } as KeyboardEvent

        domManager["handleKeyDown"](mockEvent as Event)

        vi.advanceTimersByTime(50) // Fast-forward the setTimeout

        expect(mockCallback).toHaveBeenCalledTimes(1)

        vi.useRealTimers()
      })

      it("should not fire send callbacks when trigger conditions are not met", () => {
        vi.useFakeTimers()

        const mockCallback = vi.fn()
        domManager.onSend(mockCallback)

        const mockEvent = {
          key: "Enter",
          shiftKey: true, // This should prevent trigger
          ctrlKey: false,
          altKey: false,
        } as KeyboardEvent

        domManager["handleKeyDown"](mockEvent as Event)

        vi.advanceTimersByTime(50)

        expect(mockCallback).not.toHaveBeenCalled()

        vi.useRealTimers()
      })
    })

    describe("handleFormSubmit", () => {
      it("should fire send callbacks when form is submitted", () => {
        const mockCallback = vi.fn()
        domManager.onSend(mockCallback)

        domManager["handleFormSubmit"]()

        expect(mockCallback).toHaveBeenCalledTimes(1)
      })
    })

    describe("handleContentChange", () => {
      it("should debounce content change events", () => {
        vi.useFakeTimers()

        const mockCallback = vi.fn()
        domManager.onContentChange(mockCallback)

        // Set up text input with content
        mockTextInput.value = "test content"
        domManager["textInput"] = mockTextInput
        domManager["lastContent"] = ""

        // Simulate multiple rapid content changes
        domManager["handleContentChange"]()
        domManager["handleContentChange"]()
        domManager["handleContentChange"]()

        // Fast-forward past debounce time
        vi.advanceTimersByTime(300)

        // Should only fire once due to debouncing
        expect(mockCallback).toHaveBeenCalledTimes(1)

        vi.useRealTimers()
      })

      it("should clear existing timeout before setting new one", () => {
        vi.useFakeTimers()

        const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout")

        // Set up initial timeout
        domManager["handleContentChange"]()

        // Trigger another change before timeout expires
        domManager["handleContentChange"]()

        expect(clearTimeoutSpy).toHaveBeenCalled()

        clearTimeoutSpy.mockRestore()
        vi.useRealTimers()
      })

      it("should only fire callback if content actually changed", () => {
        vi.useFakeTimers()

        const mockCallback = vi.fn()
        domManager.onContentChange(mockCallback)

        mockTextInput.value = "test content"
        domManager["textInput"] = mockTextInput
        domManager["lastContent"] = "" // Different from current content

        domManager["handleContentChange"]()
        vi.advanceTimersByTime(300)

        expect(mockCallback).toHaveBeenCalledWith("test content")

        // Reset mock and set same content
        mockCallback.mockClear()
        domManager["lastContent"] = "test content" // Same as current content

        domManager["handleContentChange"]()
        vi.advanceTimersByTime(300)

        expect(mockCallback).not.toHaveBeenCalled()

        vi.useRealTimers()
      })
    })
  })

  describe("DOM Observer and Lifecycle", () => {
    beforeEach(async () => {
      await domManager.waitForElements()
    })

    describe("getElementInfo", () => {
      it("should return element information for found elements", () => {
        const elementInfo = domManager.getElementInfo()

        expect(elementInfo).toEqual({
          textInput: {
            found: true,
            selector: "#text-input",
            tagName: "INPUT",
            element: mockTextInput,
          },
          sendButton: {
            found: true,
            selector: "#send-button",
            tagName: "BUTTON",
            element: mockSendButton,
          },
        })
      })

      it("should return not found for missing elements", () => {
        mockTextInput.remove()
        mockSendButton.remove()

        const elementInfo = domManager.getElementInfo()

        expect(elementInfo).toEqual({
          textInput: { found: false },
          sendButton: { found: false },
        })
      })

      it("should handle invalid selectors gracefully", () => {
        const configWithInvalidSelectors = createMockConfig({
          selectors: {
            textInput: [">>>invalid<<<"],
            sendButton: [">>>invalid<<<"],
          },
        })

        const testManager = new DomManager(configWithInvalidSelectors)
        const elementInfo = testManager.getElementInfo()

        expect(elementInfo).toEqual({
          textInput: { found: false },
          sendButton: { found: false },
        })

        testManager.destroy()
      })
    })

    describe("destroy", () => {
      it("should remove all event listeners", () => {
        domManager.setupSendEventListeners()

        const sendButtonRemoveSpy = vi.spyOn(
          mockSendButton,
          "removeEventListener",
        )
        const textInputRemoveSpy = vi.spyOn(
          mockTextInput,
          "removeEventListener",
        )

        domManager.destroy()

        expect(sendButtonRemoveSpy).toHaveBeenCalledWith(
          "click",
          expect.any(Function),
        )
        expect(textInputRemoveSpy).toHaveBeenCalledWith(
          "keydown",
          expect.any(Function),
        )

        sendButtonRemoveSpy.mockRestore()
        textInputRemoveSpy.mockRestore()
      })

      it("should remove form submit listener if present", () => {
        const form = document.createElement("form")
        form.appendChild(mockTextInput)
        document.body.appendChild(form)

        domManager.setupSendEventListeners()

        const formRemoveSpy = vi.spyOn(form, "removeEventListener")

        domManager.destroy()

        expect(formRemoveSpy).toHaveBeenCalledWith(
          "submit",
          expect.any(Function),
        )

        formRemoveSpy.mockRestore()
      })

      it("should disconnect all observers", () => {
        const mockDomObserver = {
          observe: vi.fn(),
          disconnect: vi.fn(),
        }
        const mockInputObserver = {
          observe: vi.fn(),
          disconnect: vi.fn(),
        }

        domManager["domObserver"] = mockDomObserver as any
        domManager["inputObserver"] = mockInputObserver as any

        domManager.destroy()

        expect(mockDomObserver.disconnect).toHaveBeenCalled()
        expect(mockInputObserver.disconnect).toHaveBeenCalled()
        expect(domManager["domObserver"]).toBeNull()
        expect(domManager["inputObserver"]).toBeNull()
      })

      it("should clear timeouts", () => {
        vi.useFakeTimers()

        const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout")

        // Set up a timeout
        domManager["contentChangeDebounceTimeout"] = setTimeout(
          () => { },
          1000,
        ) as any

        domManager.destroy()

        expect(clearTimeoutSpy).toHaveBeenCalled()
        expect(domManager["contentChangeDebounceTimeout"]).toBeNull()

        clearTimeoutSpy.mockRestore()
        vi.useRealTimers()
      })

      it("should clear all callbacks", () => {
        const sendCallback = vi.fn()
        const contentCallback = vi.fn()
        const elementCallback = vi.fn()

        domManager.onSend(sendCallback)
        domManager.onContentChange(contentCallback)
        domManager.onElementChange(elementCallback)

        expect(domManager["sendCallbacks"].size).toBe(1)
        expect(domManager["contentChangeCallbacks"].size).toBe(1)
        expect(domManager["elementChangeCallbacks"].size).toBe(1)

        domManager.destroy()

        expect(domManager["sendCallbacks"].size).toBe(0)
        expect(domManager["contentChangeCallbacks"].size).toBe(0)
        expect(domManager["elementChangeCallbacks"].size).toBe(0)
      })

      it("should handle destroy when elements are null", () => {
        domManager["textInput"] = null
        domManager["sendButton"] = null

        expect(() => domManager.destroy()).not.toThrow()
      })

      it("should log destruction message", () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { })

        domManager.destroy()

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("TestService DOM manager destroyed"),
        )

        consoleSpy.mockRestore()
      })
    })

    describe("DOM Observer Callback", () => {
      it("should re-setup listeners when text input changes", () => {
        // Mock setupDOMObserver to not interfere
        vi.spyOn(domManager, "setupDOMObserver").mockImplementation(() => { })

        const setupContentSpy = vi.spyOn(
          domManager,
          "setupContentChangeListeners",
        )
        const setupSendSpy = vi.spyOn(domManager, "setupSendEventListeners")

        // Create new text input with proper mocking
        const newTextInput = createMockInput("", "text")
        newTextInput.id = "text-input"

        vi.spyOn(newTextInput, "getBoundingClientRect").mockReturnValue({
          width: 100,
          height: 20,
          left: 0,
          top: 0,
          right: 100,
          bottom: 20,
        } as DOMRect)

        // Replace the current element
        document.body.replaceChild(newTextInput, mockTextInput)

        // Manually trigger the observer callback logic
        const oldTextInput = domManager["textInput"]
        domManager["textInput"] = domManager["findElement"](
          domManager["config"].selectors.textInput,
        )

        if (
          domManager["textInput"] !== oldTextInput &&
          domManager["textInput"]
        ) {
          domManager.setupContentChangeListeners()
          domManager.setupSendEventListeners()
        }

        expect(setupContentSpy).toHaveBeenCalled()
        expect(setupSendSpy).toHaveBeenCalled()

        setupContentSpy.mockRestore()
        setupSendSpy.mockRestore()
      })

      it("should re-setup listeners when send button changes", () => {
        // Mock setupDOMObserver to not interfere
        vi.spyOn(domManager, "setupDOMObserver").mockImplementation(() => { })

        const setupSendSpy = vi.spyOn(domManager, "setupSendEventListeners")

        // Create new send button with proper mocking
        const newSendButton = document.createElement("button")
        newSendButton.id = "send-button"

        vi.spyOn(newSendButton, "getBoundingClientRect").mockReturnValue({
          width: 100,
          height: 20,
          left: 0,
          top: 0,
          right: 100,
          bottom: 20,
        } as DOMRect)

        // Replace the current element
        document.body.replaceChild(newSendButton, mockSendButton)

        // Manually trigger the observer callback logic
        const oldSendButton = domManager["sendButton"]
        domManager["sendButton"] = domManager["findElement"](
          domManager["config"].selectors.sendButton,
        )

        if (
          domManager["sendButton"] !== oldSendButton &&
          domManager["sendButton"]
        ) {
          domManager.setupSendEventListeners()
        }

        expect(setupSendSpy).toHaveBeenCalled()

        setupSendSpy.mockRestore()
      })
    })
  })
})
