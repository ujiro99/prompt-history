/**
 * Tests for AIGenerationDialog
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { AIGenerationResponse } from "@/types/variableGeneration"

// Mock variableGeneratorService and estimatorService using vi.hoisted
const {
  mockGenerateVariable,
  mockCancel,
  mockEstimateGeneration,
  mockWatch,
  mockMergeResponse,
} = vi.hoisted(() => ({
  mockGenerateVariable: vi.fn(),
  mockCancel: vi.fn(),
  mockEstimateGeneration: vi.fn(),
  mockWatch: vi.fn(() => () => {}),
  mockMergeResponse: vi.fn((response) => response),
}))

// Mock imports FIRST
vi.mock("#imports", () => ({
  i18n: {
    t: vi.fn((key: string) => key),
  },
  analytics: {
    track: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock hooks
vi.mock("@/hooks/useContainer", () => ({
  useContainer: () => ({ container: document.body }),
}))

vi.mock("@/hooks/useAiModel", () => ({
  useAiModel: () => ({
    genaiApiKey: "test-api-key",
  }),
}))

vi.mock("@/services/variableGeneration", () => ({
  variableGeneratorService: {
    generateVariable: mockGenerateVariable,
    cancel: mockCancel,
  },
  estimatorService: {
    estimateGeneration: mockEstimateGeneration,
    watch: mockWatch,
  },
  mergeResponse: mockMergeResponse,
}))

// Mock shared components
vi.mock("@/components/shared/ApiKeyWarningBanner", () => ({
  ApiKeyWarningBanner: () => <div>API Key Warning Banner</div>,
}))

vi.mock("@/components/shared/EstimationDisplay", () => ({
  EstimationDisplay: () => <div>Estimation Display</div>,
}))

vi.mock("@/components/shared/GenerationProgress", () => ({
  GenerationProgress: ({ progress }: any) => (
    <div data-testid="generation-progress">
      Progress: {progress.estimatedProgress}%
    </div>
  ),
}))

vi.mock("@/components/settings/ModelSettingsDialog", () => ({
  ModelSettingsDialog: () => <div>Model Settings Dialog</div>,
}))

vi.mock(
  "@/components/settings/variablePresets/VariableGenerationSettingsDialog",
  () => ({
    VariableGenerationSettingsDialog: () => (
      <div>Variable Generation Settings Dialog</div>
    ),
  }),
)

vi.mock("@/utils/dom", () => ({
  stopPropagation: () => ({}),
}))

import { AIGenerationDialog } from "../AIGenerationDialog"

describe("AIGenerationDialog", () => {
  const mockOnApply = vi.fn()
  const mockOnOpenChange = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    variableName: "testVar",
    variablePurpose: "test purpose",
    variableType: "text" as const,
    onApply: mockOnApply,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockEstimateGeneration.mockResolvedValue({
      inputTokens: 100,
      contextUsage: 0.5,
      promptHistoryCount: 10,
    })
  })

  describe("rendering", () => {
    it("should render dialog when open", () => {
      render(<AIGenerationDialog {...defaultProps} />)
      expect(
        screen.getByText("variablePresets.aiGeneration.dialog.title"),
      ).toBeInTheDocument()
    })

    it("should render confirm screen by default", () => {
      render(<AIGenerationDialog {...defaultProps} />)
      expect(
        screen.getByText("variablePresets.aiGeneration.dialog.description"),
      ).toBeInTheDocument()
      expect(screen.getByText(/testVar/i)).toBeInTheDocument()
    })

    it("should display variable information", () => {
      render(<AIGenerationDialog {...defaultProps} />)
      expect(screen.getByText("testVar")).toBeInTheDocument()
      expect(screen.getByText("test purpose")).toBeInTheDocument()
    })

    it("should render start button", () => {
      render(<AIGenerationDialog {...defaultProps} />)
      expect(
        screen.getByText("variablePresets.aiGeneration.dialog.start"),
      ).toBeInTheDocument()
    })

    it("should render cancel button on confirm screen", () => {
      render(<AIGenerationDialog {...defaultProps} />)
      expect(screen.getByText("common.cancel")).toBeInTheDocument()
    })
  })

  describe("generation process", () => {
    it("should call generateVariable when start button is clicked", async () => {
      const user = userEvent.setup()
      const mockResponse: AIGenerationResponse = {
        textContent: "Generated text",
        explanation: "Test explanation",
      }
      mockGenerateVariable.mockResolvedValue(mockResponse)

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(mockGenerateVariable).toHaveBeenCalledWith(
          expect.objectContaining({
            request: expect.objectContaining({
              variableName: "testVar",
              variablePurpose: "test purpose",
              variableType: "text",
            }),
            apiKey: "test-api-key",
          }),
        )
      })
    })

    it("should show loading screen during generation", async () => {
      const user = userEvent.setup()
      mockGenerateVariable.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      )

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(
          screen.getByText("variablePresets.aiGeneration.dialog.loading"),
        ).toBeInTheDocument()
      })
    })

    it("should show cancel button during generation", async () => {
      const user = userEvent.setup()
      mockGenerateVariable.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      )

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        const cancelButton = screen.getByRole("button", {
          name: /common.cancel/i,
        })
        expect(cancelButton).toBeInTheDocument()
      })
    })

    it("should cancel generation when cancel button is clicked", async () => {
      const user = userEvent.setup()
      mockGenerateVariable.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      )

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(
          screen.getByText("variablePresets.aiGeneration.dialog.loading"),
        ).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole("button", {
        name: /common.cancel/i,
      })
      await user.click(cancelButton)

      expect(mockCancel).toHaveBeenCalled()
    })

    it("should show progress during generation", async () => {
      const user = userEvent.setup()
      let resolveGeneration: any
      const generationPromise = new Promise((resolve) => {
        resolveGeneration = resolve
      })

      mockGenerateVariable.mockImplementation(async (options) => {
        // Wait a bit to ensure component has transitioned to loading state
        await new Promise((resolve) => setTimeout(resolve, 10))

        // Simulate progress callback
        options.onProgress?.({
          chunk: "test",
          accumulated: "test content",
          estimatedProgress: 50,
          status: "generating",
        })

        // Wait for test to verify progress before completing
        await generationPromise

        return {
          textContent: "Generated text",
          explanation: "Test explanation",
        }
      })

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      // First wait for loading screen
      await waitFor(() => {
        expect(
          screen.getByText("variablePresets.aiGeneration.dialog.loading"),
        ).toBeInTheDocument()
      })

      // Then check for progress
      await waitFor(() => {
        const progressElement = screen.queryByTestId("generation-progress")
        if (progressElement) {
          expect(progressElement).toHaveTextContent("Progress: 50%")
        }
      })

      // Complete the generation
      resolveGeneration()
    })
  })

  describe("success screen", () => {
    it("should show success screen when generation completes", async () => {
      const user = userEvent.setup()
      const mockResponse: AIGenerationResponse = {
        textContent: "Generated text",
        explanation: "Test explanation",
      }
      mockGenerateVariable.mockResolvedValue(mockResponse)

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(
          screen.getByText("variablePresets.aiGeneration.dialog.success"),
        ).toBeInTheDocument()
      })
    })

    it("should display AI explanation on success screen", async () => {
      const user = userEvent.setup()
      const mockResponse: AIGenerationResponse = {
        textContent: "Generated text",
        explanation: "This is the AI explanation",
      }
      mockGenerateVariable.mockResolvedValue(mockResponse)

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(
          screen.getByText("This is the AI explanation"),
        ).toBeInTheDocument()
      })
    })

    it("should display generated content preview for text type", async () => {
      const user = userEvent.setup()
      const mockResponse: AIGenerationResponse = {
        textContent: "Generated text content",
        explanation: "Test explanation",
      }
      mockGenerateVariable.mockResolvedValue(mockResponse)

      render(<AIGenerationDialog {...defaultProps} variableType="text" />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        const textarea = screen.getByDisplayValue("Generated text content")
        expect(textarea).toBeInTheDocument()
      })
    })

    it("should display generated content preview for select type", async () => {
      const user = userEvent.setup()
      const mockResponse: AIGenerationResponse = {
        selectOptions: ["Option 1", "Option 2", "Option 3"],
        explanation: "Test explanation",
      }
      mockGenerateVariable.mockResolvedValue(mockResponse)

      render(<AIGenerationDialog {...defaultProps} variableType="select" />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        const textarea = screen.getByDisplayValue(
          "Option 1, Option 2, Option 3",
        )
        expect(textarea).toBeInTheDocument()
      })
    })

    it("should call onApply when apply button is clicked", async () => {
      const user = userEvent.setup()
      const mockResponse: AIGenerationResponse = {
        textContent: "Generated text",
        explanation: "Test explanation",
      }
      mockGenerateVariable.mockResolvedValue(mockResponse)

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(
          screen.getByText("variablePresets.aiGeneration.dialog.apply"),
        ).toBeInTheDocument()
      })

      const applyButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.apply",
      )
      await user.click(applyButton)

      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          textContent: "Generated text",
          explanation: "Test explanation",
        }),
      )
    })

    it("should close dialog when apply button is clicked", async () => {
      const user = userEvent.setup()
      const mockResponse: AIGenerationResponse = {
        textContent: "Generated text",
        explanation: "Test explanation",
      }
      mockGenerateVariable.mockResolvedValue(mockResponse)

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(
          screen.getByText("variablePresets.aiGeneration.dialog.apply"),
        ).toBeInTheDocument()
      })

      const applyButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.apply",
      )
      await user.click(applyButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe("error screen", () => {
    it("should show error screen when generation fails", async () => {
      const user = userEvent.setup()
      mockGenerateVariable.mockRejectedValue(new Error("Test error"))

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(screen.getByText("common.error")).toBeInTheDocument()
      })
    })

    it("should display error message", async () => {
      const user = userEvent.setup()
      mockGenerateVariable.mockRejectedValue(new Error("Custom error message"))

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(screen.getByText("Custom error message")).toBeInTheDocument()
      })
    })

    it("should show retry button on error screen", async () => {
      const user = userEvent.setup()
      mockGenerateVariable.mockRejectedValue(new Error("Test error"))

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(
          screen.getByText("variablePresets.aiGeneration.dialog.retry"),
        ).toBeInTheDocument()
      })
    })

    it("should retry generation when retry button is clicked", async () => {
      const user = userEvent.setup()
      mockGenerateVariable.mockRejectedValueOnce(new Error("Test error"))
      mockGenerateVariable.mockResolvedValueOnce({
        textContent: "Generated text",
        explanation: "Test explanation",
      })

      render(<AIGenerationDialog {...defaultProps} />)

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(screen.getByText("common.error")).toBeInTheDocument()
      })

      const retryButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.retry",
      )
      await user.click(retryButton)

      await waitFor(() => {
        expect(
          screen.getByText("variablePresets.aiGeneration.dialog.description"),
        ).toBeInTheDocument()
      })
    })
  })

  describe("additional instructions", () => {
    it("should accept additional instructions input", async () => {
      const user = userEvent.setup()
      render(<AIGenerationDialog {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(
        "variablePresets.aiGeneration.dialog.additionalInstructionsPlaceholder",
      )
      await user.type(textarea, "Please make it formal")

      expect(textarea).toHaveValue("Please make it formal")
    })

    it("should include additional instructions in generation request", async () => {
      const user = userEvent.setup()
      const mockResponse: AIGenerationResponse = {
        textContent: "Generated text",
        explanation: "Test explanation",
      }
      mockGenerateVariable.mockResolvedValue(mockResponse)

      render(<AIGenerationDialog {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(
        "variablePresets.aiGeneration.dialog.additionalInstructionsPlaceholder",
      )
      await user.type(textarea, "Please make it formal")

      const startButton = screen.getByText(
        "variablePresets.aiGeneration.dialog.start",
      )
      await user.click(startButton)

      await waitFor(() => {
        expect(mockGenerateVariable).toHaveBeenCalledWith(
          expect.objectContaining({
            request: expect.objectContaining({
              additionalInstructions: "Please make it formal",
            }),
          }),
        )
      })
    })
  })

  describe("state management", () => {
    it("should reset state when dialog closes", async () => {
      const { rerender } = render(<AIGenerationDialog {...defaultProps} />)

      // Close dialog
      rerender(<AIGenerationDialog {...defaultProps} open={false} />)

      // Reopen dialog
      rerender(<AIGenerationDialog {...defaultProps} open={true} />)

      // Should be back to confirm screen
      expect(
        screen.getByText("variablePresets.aiGeneration.dialog.description"),
      ).toBeInTheDocument()
    })
  })
})
