/**
 * Tests for PromptImprover
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { PromptImprover } from "../PromptImprover"

// Create mocks for GeminiClient
const mockInitialize = vi.fn()
const mockIsInitialized = vi.fn()
const mockGenerateContentStream = vi.fn()

// Mock GeminiClient module
vi.mock("../GeminiClient", () => ({
  GeminiClient: {
    getInstance: () => ({
      initialize: mockInitialize,
      isInitialized: mockIsInitialized,
      generateContentStream: mockGenerateContentStream,
    }),
  },
}))

describe("PromptImprover", () => {
  let improver: PromptImprover

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsInitialized.mockReturnValue(true)
    improver = new PromptImprover()
  })

  describe("improvePrompt", () => {
    it("should call onError when prompt is empty", async () => {
      const onError = vi.fn()

      await improver.improvePrompt({
        prompt: "",
        onError,
      })

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Prompt cannot be empty",
        }),
      )
    })

    it("should call onStream for each chunk", async () => {
      const onStream = vi.fn()
      const onComplete = vi.fn()

      const mockStream = async function* () {
        yield { text: "chunk1" }
        yield { text: "chunk2" }
        yield { text: "chunk3" }
      }
      mockGenerateContentStream.mockReturnValue(mockStream())

      await improver.improvePrompt({
        prompt: "test prompt",
        onStream,
        onComplete,
      })

      expect(onStream).toHaveBeenCalledTimes(3)
      expect(onStream).toHaveBeenNthCalledWith(1, "chunk1")
      expect(onStream).toHaveBeenNthCalledWith(2, "chunk2")
      expect(onStream).toHaveBeenNthCalledWith(3, "chunk3")
    })

    it("should call onComplete with full improved prompt", async () => {
      const onComplete = vi.fn()

      const mockStream = async function* () {
        yield { text: "improved " }
        yield { text: "prompt " }
        yield { text: "text" }
      }
      mockGenerateContentStream.mockReturnValue(mockStream())

      await improver.improvePrompt({
        prompt: "test prompt",
        onComplete,
      })

      expect(onComplete).toHaveBeenCalledWith("improved prompt text")
    })

    it("should call onError when stream fails", async () => {
      const onError = vi.fn()

      mockGenerateContentStream.mockRejectedValue(new Error("Stream error"))

      await improver.improvePrompt({
        prompt: "test prompt",
        onError,
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it("should pass system instruction to client", async () => {
      const mockStream = async function* () {
        yield { text: "improved" }
      }
      mockGenerateContentStream.mockReturnValue(mockStream())

      await improver.improvePrompt({
        prompt: "test prompt",
      })

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.stringContaining("test prompt"),
        expect.objectContaining({
          systemInstruction: expect.stringContaining("Prompt Engineer"),
        }),
      )
    })
  })

  describe("cancel", () => {
    it("should cancel ongoing operation", () => {
      // Just ensure it doesn't throw
      expect(() => improver.cancel()).not.toThrow()
    })
  })

  describe("getSystemInstruction", () => {
    it("should return system instruction", () => {
      const instruction = improver.getSystemInstruction()
      expect(instruction).toContain("Prompt Engineer")
      expect(instruction).toContain("effective prompt")
    })
  })
})
