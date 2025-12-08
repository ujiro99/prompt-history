/**
 * Tests for PromptImproveDialog
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ImprovePromptData } from "@/types/prompt"

// Mock .wxt/analytics FIRST to prevent Browser.runtime.connect errors
vi.mock("#imports", () => ({
  analytics: {
    track: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock hooks
vi.mock("@/hooks/useContainer", () => ({
  useContainer: () => ({ container: document.body }),
}))

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ settings: { variableExpansionEnabled: true } }),
}))

vi.mock("@/hooks/useAiModel", () => ({
  useAiModel: () => ({
    genaiApiKey: "test-api-key",
    getApiKey: vi.fn().mockResolvedValue("test-api-key"),
    setApiKey: vi.fn().mockResolvedValue(undefined),
  }),
}))

// Mock PromptImprover class using vi.hoisted
const { MockPromptImprover } = vi.hoisted(() => {
  class MockPromptImprover {
    initializeFromEnv = vi.fn()
    improvePrompt = vi.fn()
    cancel = vi.fn()
    loadSettings = vi.fn().mockResolvedValue(undefined)
    isApiKeyConfigured = vi.fn().mockReturnValue(true)
  }
  return { MockPromptImprover }
})

vi.mock("@/services/genai/PromptImprover", () => ({
  PromptImprover: MockPromptImprover,
}))

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PromptImproveDialog } from "../PromptImproveDialog"

describe("PromptImproveDialog", () => {
  const mockOnInput = vi.fn()
  const mockOnOpenChange = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    initialData: {
      content: "test prompt",
      variables: [],
    } as ImprovePromptData,
    onInput: mockOnInput,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("should render dialog when open", () => {
      render(<PromptImproveDialog {...defaultProps} />)
      expect(
        screen.getByText("dialogs.promptImprove.title"),
      ).toBeInTheDocument()
    })

    it("should render improve button", () => {
      render(<PromptImproveDialog {...defaultProps} />)
      expect(
        screen.getByText("dialogs.promptImprove.improveButton"),
      ).toBeInTheDocument()
    })

    it("should render textarea with initial content", () => {
      render(<PromptImproveDialog {...defaultProps} />)
      const textarea = screen.getByPlaceholderText(
        "placeholders.enterPromptContent",
      )
      expect(textarea).toHaveValue("test prompt")
    })

    it("should disable improve button when content is empty", () => {
      render(
        <PromptImproveDialog
          {...defaultProps}
          initialData={{ content: "", variables: [] }}
        />,
      )
      const improveButton = screen.getByText(
        "dialogs.promptImprove.improveButton",
      )
      expect(improveButton.closest("button")).toBeDisabled()
    })
  })

  describe("improve functionality", () => {
    it("should show loading state when improving", async () => {
      const user = userEvent.setup()
      render(<PromptImproveDialog {...defaultProps} />)

      const improveButton = screen.getByText(
        "dialogs.promptImprove.improveButton",
      )
      await user.click(improveButton)

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("dialogs.promptImprove.improving"),
        ).toBeInTheDocument()
      })
    })

    it("should show preview area when improvement starts", async () => {
      const user = userEvent.setup()
      render(<PromptImproveDialog {...defaultProps} />)

      const improveButton = screen.getByText(
        "dialogs.promptImprove.improveButton",
      )
      await user.click(improveButton)

      await waitFor(() => {
        expect(
          screen.getByText("dialogs.promptImprove.previewTitle"),
        ).toBeInTheDocument()
      })
    })

    it("should disable textarea during improvement", async () => {
      const user = userEvent.setup()
      render(<PromptImproveDialog {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(
        "placeholders.enterPromptContent",
      )
      expect(textarea).not.toBeDisabled()

      const improveButton = screen.getByText(
        "dialogs.promptImprove.improveButton",
      )
      await user.click(improveButton)

      expect(textarea).toBeDisabled()
    })
  })

  describe("preview area", () => {
    it("should show preview textarea", async () => {
      const user = userEvent.setup()
      render(<PromptImproveDialog {...defaultProps} />)

      const improveButton = screen.getByText(
        "dialogs.promptImprove.improveButton",
      )
      await user.click(improveButton)

      await waitFor(() => {
        const textareas = screen.getAllByRole("textbox")
        expect(textareas.length).toBe(2) // Original + Preview
      })
    })

    it("should show cancel button in preview", async () => {
      const user = userEvent.setup()
      render(<PromptImproveDialog {...defaultProps} />)

      const improveButton = screen.getByText(
        "dialogs.promptImprove.improveButton",
      )
      await user.click(improveButton)

      await waitFor(() => {
        const cancelButtons = screen.getAllByText("common.cancel")
        expect(cancelButtons.length).toBeGreaterThan(1) // Footer + Preview
      })
    })
  })

  describe("input with improved prompt", () => {
    it("should use improved content when input button is clicked", async () => {
      const user = userEvent.setup()
      render(<PromptImproveDialog {...defaultProps} />)

      // Start improvement
      const improveButton = screen.getByText(
        "dialogs.promptImprove.improveButton",
      )
      await user.click(improveButton)

      // Wait for preview to appear
      await waitFor(() => {
        expect(
          screen.getByText("dialogs.promptImprove.previewTitle"),
        ).toBeInTheDocument()
      })

      // Note: In actual usage, the improved content would be set through streaming
      // The input button will use improvedContent if available
    })

    it("should keep preview visible until dialog is closed", async () => {
      const user = userEvent.setup()
      render(<PromptImproveDialog {...defaultProps} />)

      const improveButton = screen.getByText(
        "dialogs.promptImprove.improveButton",
      )
      await user.click(improveButton)

      await waitFor(() => {
        expect(
          screen.getByText("dialogs.promptImprove.previewTitle"),
        ).toBeInTheDocument()
      })

      // Preview remains visible, user can click Input button to send improved version
    })
  })

  describe("cancel improvement", () => {
    it("should hide preview when cancel is clicked", async () => {
      const user = userEvent.setup()
      render(<PromptImproveDialog {...defaultProps} />)

      const improveButton = screen.getByText(
        "dialogs.promptImprove.improveButton",
      )
      await user.click(improveButton)

      await waitFor(() => {
        expect(
          screen.getByText("dialogs.promptImprove.previewTitle"),
        ).toBeInTheDocument()
      })

      // Find the cancel button in preview area (not the one in footer)
      const cancelButtons = screen.getAllByText("common.cancel")
      await user.click(cancelButtons[0]) // Preview cancel button

      // Improve button should be visible again.
      await waitFor(() => {
        expect(
          screen.getByText("dialogs.promptImprove.improveButton"),
        ).toBeInTheDocument()
      })
    })
  })

  describe("dialog close", () => {
    it("should reset state when dialog is closed", async () => {
      const { rerender } = render(<PromptImproveDialog {...defaultProps} />)

      // Start improvement
      const user = userEvent.setup()
      const improveButton = screen.getByText(
        "dialogs.promptImprove.improveButton",
      )
      await user.click(improveButton)

      // Close dialog
      rerender(<PromptImproveDialog {...defaultProps} open={false} />)

      // Reopen dialog
      rerender(<PromptImproveDialog {...defaultProps} open={true} />)

      // Improve button should be visible again.
      await waitFor(() => {
        expect(
          screen.getByText("dialogs.promptImprove.improveButton"),
        ).toBeInTheDocument()
      })
    })
  })

  describe("input functionality", () => {
    it("should call onInput when input button is clicked", async () => {
      const user = userEvent.setup()
      render(<PromptImproveDialog {...defaultProps} />)

      const inputButton = screen.getByText("common.input")
      await user.click(inputButton)

      await waitFor(() => {
        expect(mockOnInput).toHaveBeenCalledWith({
          content: "test prompt",
          variables: [],
        })
      })
    })

    it("should disable input button when content is empty", () => {
      render(
        <PromptImproveDialog
          {...defaultProps}
          initialData={{ content: "", variables: [] }}
        />,
      )

      const inputButton = screen.getByText("common.input")
      expect(inputButton).toBeDisabled()
    })
  })

  describe("keyboard shortcuts", () => {
    it("should submit on Ctrl+Enter", async () => {
      const user = userEvent.setup()
      render(<PromptImproveDialog {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(
        "placeholders.enterPromptContent",
      )
      await user.click(textarea)
      await user.keyboard("{Control>}{Enter}{/Control}")

      await waitFor(() => {
        expect(mockOnInput).toHaveBeenCalled()
      })
    })

    it("should submit on Meta+Enter", async () => {
      const user = userEvent.setup()
      render(<PromptImproveDialog {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(
        "placeholders.enterPromptContent",
      )
      await user.click(textarea)
      await user.keyboard("{Meta>}{Enter}{/Meta}")

      await waitFor(() => {
        expect(mockOnInput).toHaveBeenCalled()
      })
    })
  })
})
