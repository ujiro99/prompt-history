/**
 * Tests for GeminiClient
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { GeminiError } from "../types"

// Create a mock for the GoogleGenAI class using vi.hoisted
const { mockGenerateContentStream, MockGoogleGenAI } = vi.hoisted(() => {
  const mockGenerateContentStream = vi.fn()

  class MockGoogleGenAI {
    models = {
      generateContentStream: mockGenerateContentStream,
    }
    constructor(_config: any) {
      // Constructor accepts config but we don't need to use it in tests
    }
  }

  return { mockGenerateContentStream, MockGoogleGenAI }
})

// Mock @google/genai
vi.mock("@google/genai", () => ({
  GoogleGenAI: MockGoogleGenAI,
}))

import { GeminiClient } from "../GeminiClient"

describe("GeminiClient", () => {
  let client: GeminiClient

  beforeEach(() => {
    // Get fresh instance and reset
    client = GeminiClient.getInstance()
    client.reset()
    mockGenerateContentStream.mockReset()
  })

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = GeminiClient.getInstance()
      const instance2 = GeminiClient.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe("initialize", () => {
    it("should initialize with valid API key", () => {
      expect(() => client.initialize("test-api-key")).not.toThrow()
      expect(client.isInitialized()).toBe(true)
    })

    it("should throw error when API key is empty", () => {
      expect(() => client.initialize("")).toThrow(GeminiError)
      expect(() => client.initialize("")).toThrow("API key is required")
    })

    it("should store configuration", () => {
      client.initialize("test-api-key")
      const config = client.getConfig()
      expect(config).toBeDefined()
      expect(config?.apiKey).toBe("test-api-key")
      expect(config?.model).toBe("gemini-2.5-flash")
    })
  })

  describe("isInitialized", () => {
    it("should return false before initialization", () => {
      expect(client.isInitialized()).toBe(false)
    })

    it("should return true after initialization", () => {
      client.initialize("test-api-key")
      expect(client.isInitialized()).toBe(true)
    })
  })

  describe("getConfig", () => {
    it("should return null before initialization", () => {
      expect(client.getConfig()).toBeNull()
    })

    it("should return config after initialization", () => {
      client.initialize("test-api-key")
      const config = client.getConfig()
      expect(config).toBeDefined()
      expect(config?.model).toBe("gemini-2.5-flash")
    })
  })

  describe("generateContentStream", () => {
    it("should throw error when not initialized", async () => {
      try {
        const generator = client.generateContentStream("test prompt")
        await generator.next()
        expect.fail("Should have thrown an error")
      } catch (error) {
        expect(error).toBeInstanceOf(GeminiError)
        expect((error as Error).message).toContain("Client not initialized")
      }
    })

    it("should generate stream when initialized", async () => {
      client.initialize("test-api-key")

      // Mock the generateContentStream to return an async generator
      const mockStream = async function* () {
        yield { text: "chunk1" }
        yield { text: "chunk2" }
      }

      mockGenerateContentStream.mockResolvedValue(mockStream())

      const chunks: string[] = []
      for await (const chunk of client.generateContentStream("test prompt")) {
        chunks.push(chunk.text)
      }

      expect(chunks).toEqual(["chunk1", "chunk2"])
    })

    it("should merge custom config with default config", async () => {
      client.initialize("test-api-key")

      const mockStream = async function* () {
        yield { text: "test" }
      }

      mockGenerateContentStream.mockResolvedValue(mockStream())

      const generator = client.generateContentStream("test prompt", {
        systemInstruction: "test instruction",
      })

      // Consume the generator
      for await (const _ of generator) {
        // Just consume
      }

      expect(mockGenerateContentStream).toHaveBeenCalledWith({
        model: "gemini-2.5-flash",
        contents: ["test prompt"],
        config: {
          systemInstruction: "test instruction",
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
        },
      })
    })

    it("should handle network errors", async () => {
      client.initialize("test-api-key")

      mockGenerateContentStream.mockRejectedValue(
        new Error("network error occurred"),
      )

      try {
        const generator = client.generateContentStream("test prompt")
        for await (const _ of generator) {
          // Should throw before yielding
        }
        expect.fail("Should have thrown an error")
      } catch (error) {
        expect(error).toBeInstanceOf(GeminiError)
        expect((error as Error).message).toContain("Network error")
      }
    })

    it("should handle API key errors", async () => {
      client.initialize("test-api-key")

      mockGenerateContentStream.mockRejectedValue(new Error("Invalid API key"))

      try {
        const generator = client.generateContentStream("test prompt")
        for await (const _ of generator) {
          // Should throw before yielding
        }
        expect.fail("Should have thrown an error")
      } catch (error) {
        expect(error).toBeInstanceOf(GeminiError)
        expect((error as Error).message).toContain("Invalid API key")
      }
    })

    it("should handle generic API errors", async () => {
      client.initialize("test-api-key")

      mockGenerateContentStream.mockRejectedValue(new Error("Some API error"))

      try {
        const generator = client.generateContentStream("test prompt")
        for await (const _ of generator) {
          // Should throw before yielding
        }
        expect.fail("Should have thrown an error")
      } catch (error) {
        expect(error).toBeInstanceOf(GeminiError)
        expect((error as Error).message).toContain("API error")
      }
    })
  })

  describe("reset", () => {
    it("should reset client state", () => {
      client.initialize("test-api-key")
      expect(client.isInitialized()).toBe(true)

      client.reset()
      expect(client.isInitialized()).toBe(false)
      expect(client.getConfig()).toBeNull()
    })
  })
})
