/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { OrganizerExecuteDialog } from "../OrganizerExecuteDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"
import type {
  GenerationProgress,
  OrganizerError,
  TemplateCandidate,
} from "@/types/promptOrganizer"

// Mock i18n
vi.mock("#imports", () => ({
  i18n: {
    t: (key: string, params?: any[]) => {
      if (params) {
        return `${key}[${params.join(",")}]`
      }
      return key
    },
  },
}))

// Mock useContainer
vi.mock("@/hooks/useContainer", () => ({
  useContainer: () => ({ container: document.body }),
}))

// Mock useAiModel - use vi.hoisted
const { mockUseAiModel } = vi.hoisted(() => ({
  mockUseAiModel: vi.fn<() => { genaiApiKey: string | null }>(() => ({ genaiApiKey: "test-api-key" })),
}))

vi.mock("@/hooks/useAiModel", () => ({
  useAiModel: mockUseAiModel,
}))

// Mock storage
const mockGetValue = vi.fn()
const mockWatch = vi.fn()
const mockPendingGetValue = vi.fn()
const mockPendingSetValue = vi.fn()
const mockPendingWatch = vi.fn()

vi.mock("@/services/storage/definitions", () => ({
  promptOrganizerSettingsStorage: {
    getValue: () => mockGetValue(),
    watch: (callback: any) => mockWatch(callback),
  },
  pendingOrganizerTemplatesStorage: {
    getValue: () => mockPendingGetValue(),
    setValue: (value: any) => mockPendingSetValue(value),
    watch: (callback: any) => mockPendingWatch(callback),
  },
}))

// Mock promptOrganizerService - use vi.hoisted
const { mockEstimateExecution, mockTargetPrompts } = vi.hoisted(() => ({
  mockEstimateExecution: vi.fn(),
  mockTargetPrompts: vi.fn(),
}))

vi.mock("@/services/promptOrganizer/PromptOrganizerService", () => ({
  promptOrganizerService: {
    estimateExecution: mockEstimateExecution,
    targetPrompts: mockTargetPrompts,
  },
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <ContainerProvider container={document.body}>{children}</ContainerProvider>
}

describe("OrganizerExecuteDialog", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnExecute = vi.fn()
  const mockOnCancel = vi.fn()
  const mockOnOpenPreview = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetValue.mockResolvedValue({
      filterPeriodDays: 30,
      filterMinExecutionCount: 2,
      filterMaxPrompts: 50,
      organizationPrompt: "test prompt",
    })
    mockWatch.mockReturnValue(() => {})
    mockPendingGetValue.mockResolvedValue(null)
    mockPendingSetValue.mockResolvedValue(undefined)
    mockPendingWatch.mockReturnValue(() => {})
    mockEstimateExecution.mockResolvedValue({
      targetPromptCount: 10,
      estimatedInputTokens: 1000,
      estimatedOutputTokens: 500,
      contextUsageRate: 0.5,
      estimatedCost: 0.01,
      model: "gemini-1.5-flash",
      contextLimit: 100000,
    })
    mockTargetPrompts.mockResolvedValue([
      { id: "1", name: "Prompt 1", content: "Content 1", executionCount: 5 },
      { id: "2", name: "Prompt 2", content: "Content 2", executionCount: 3 },
    ])
  })

  describe("Dialog Rendering", () => {
    it("should render dialog when open is true", async () => {
      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={false}
            isCanceling={false}
            progress={null}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText("promptOrganizer.execute.title")).toBeInTheDocument()
      })
      // DialogDescription is split across multiple elements, so check for partial match
      await waitFor(() => {
        expect(
          screen.getByText(/promptOrganizer\.execute\.description/),
        ).toBeInTheDocument()
      })
    })

    it("should display target prompts list", async () => {
      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={false}
            isCanceling={false}
            progress={null}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText(/1\.\s*Prompt 1/)).toBeInTheDocument()
        expect(screen.getByText(/2\.\s*Prompt 2/)).toBeInTheDocument()
      })
    })

    it("should display estimation when loaded", async () => {
      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={false}
            isCanceling={false}
            progress={null}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText(/1\.\s*Prompt 1/)).toBeInTheDocument()
      })
    })
  })

  describe("API Key Warning", () => {
    it("should display API key warning when key is missing", async () => {
      mockUseAiModel.mockReturnValue({ genaiApiKey: null as string | null })

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={false}
            isCanceling={false}
            progress={null}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText(/common\.apiKeyNotConfigured/)).toBeInTheDocument()
      })

      // Reset mock for other tests
      mockUseAiModel.mockReturnValue({ genaiApiKey: "test-api-key" })
    })

    it("should disable execute button when API key is missing", async () => {
      mockUseAiModel.mockReturnValue({ genaiApiKey: null as string | null })

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={false}
            isCanceling={false}
            progress={null}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        const organizeButton = screen.getByRole("button", {
          name: /promptOrganizer.buttons.organize/,
        })
        expect(organizeButton).toBeDisabled()
      })

      // Reset mock for other tests
      mockUseAiModel.mockReturnValue({ genaiApiKey: "test-api-key" })
    })
  })

  describe("Pending Templates Warning", () => {
    it("should display pending templates warning when templates exist", async () => {
      const pendingTemplates: TemplateCandidate[] = [
        {
          id: "t1",
          title: "Template 1",
          content: "Content 1",
          useCase: "Use case 1",
          clusterExplanation: "Explanation 1",
          categoryId: "cat1",
          variables: [],
          aiMetadata: {
            sourcePromptIds: ["1"],
            sourceCount: 1,
            confirmed: false,
            showInPinned: false,
          },
          userAction: "pending",
        },
      ]

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={false}
            isCanceling={false}
            progress={null}
            onCancel={mockOnCancel}
            pendingTemplates={pendingTemplates}
            onOpenPreview={mockOnOpenPreview}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(
          screen.getByText(/promptOrganizer\.pendingTemplates\.warning/),
        ).toBeInTheDocument()
      })
    })

    it("should call onOpenPreview when review button is clicked", async () => {
      const pendingTemplates: TemplateCandidate[] = [
        {
          id: "t1",
          title: "Template 1",
          content: "Content 1",
          useCase: "Use case 1",
          clusterExplanation: "Explanation 1",
          categoryId: "cat1",
          variables: [],
          aiMetadata: {
            sourcePromptIds: ["1"],
            sourceCount: 1,
            confirmed: false,
            showInPinned: false,
          },
          userAction: "pending",
        },
      ]

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={false}
            isCanceling={false}
            progress={null}
            onCancel={mockOnCancel}
            pendingTemplates={pendingTemplates}
            onOpenPreview={mockOnOpenPreview}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        const reviewButton = screen.getByText(
          "promptOrganizer.pendingTemplates.review",
        )
        fireEvent.click(reviewButton)
      })

      expect(mockOnOpenPreview).toHaveBeenCalledTimes(1)
    })

    it("should not display pending templates warning during execution", () => {
      const pendingTemplates: TemplateCandidate[] = [
        {
          id: "t1",
          title: "Template 1",
          content: "Content 1",
          useCase: "Use case 1",
          clusterExplanation: "Explanation 1",
          categoryId: "cat1",
          variables: [],
          aiMetadata: {
            sourcePromptIds: ["1"],
            sourceCount: 1,
            confirmed: false,
            showInPinned: false,
          },
          userAction: "pending",
        },
      ]

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={true}
            isCanceling={false}
            progress={{
              chunk: "",
              accumulated: "",
              estimatedProgress: 50,
              status: "generating",
            }}
            onCancel={mockOnCancel}
            pendingTemplates={pendingTemplates}
            onOpenPreview={mockOnOpenPreview}
          />
        </TestWrapper>,
      )

      expect(
        screen.queryByText(/promptOrganizer.pendingTemplates.warning/),
      ).not.toBeInTheDocument()
    })
  })

  describe("Error Display", () => {
    it("should display error message when error exists", () => {
      const error: OrganizerError = {
        code: "API_ERROR",
        message: "Test error message",
      }

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={false}
            isCanceling={false}
            progress={null}
            error={error}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("Test error message")).toBeInTheDocument()
      expect(screen.getByText("promptOrganizer.status.error")).toBeInTheDocument()
    })
  })

  describe("Execute Button", () => {
    it("should call onExecute when organize button is clicked", async () => {
      mockOnExecute.mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={false}
            isCanceling={false}
            progress={null}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText(/1\.\s*Prompt 1/)).toBeInTheDocument()
      })

      const organizeButton = screen.getByRole("button", {
        name: /promptOrganizer.buttons.organize/,
      })
      fireEvent.click(organizeButton)

      await waitFor(() => {
        expect(mockOnExecute).toHaveBeenCalledTimes(1)
      })
    })

    it("should be disabled when isExecuting is true", () => {
      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={true}
            isCanceling={false}
            progress={{
              chunk: "",
              accumulated: "",
              estimatedProgress: 50,
              status: "generating",
            }}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      expect(
        screen.queryByRole("button", {
          name: /promptOrganizer.buttons.organize/,
        }),
      ).not.toBeInTheDocument()
    })
  })

  describe("Cancel Button", () => {
    it("should display cancel button during execution", () => {
      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={true}
            isCanceling={false}
            progress={{
              chunk: "",
              accumulated: "",
              estimatedProgress: 50,
              status: "generating",
            }}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.buttons.cancel"),
      ).toBeInTheDocument()
    })

    it("should call onCancel when cancel button is clicked", () => {
      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={true}
            isCanceling={false}
            progress={{
              chunk: "",
              accumulated: "",
              estimatedProgress: 50,
              status: "generating",
            }}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      const cancelButton = screen.getByRole("button", {
        name: /promptOrganizer.buttons.cancel/,
      })
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it("should display canceling state when isCanceling is true", () => {
      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={true}
            isCanceling={true}
            progress={{
              chunk: "",
              accumulated: "",
              estimatedProgress: 50,
              status: "generating",
            }}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.buttons.canceling"),
      ).toBeInTheDocument()
    })
  })

  describe("Progress Display", () => {
    it("should display progress information during execution", () => {
      const progress: GenerationProgress = {
        chunk: "test chunk",
        accumulated: "test accumulated",
        estimatedProgress: 75,
        status: "generating",
        thoughtsTokens: 100,
        outputTokens: 50,
      }

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={true}
            isCanceling={false}
            progress={progress}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      expect(screen.getByText(/100 tokens/)).toBeInTheDocument()
      expect(screen.getByText(/50 tokens/)).toBeInTheDocument()
      expect(screen.getByText(/75%/)).toBeInTheDocument()
    })

    it("should display accumulated JSON when available", () => {
      const progress: GenerationProgress = {
        chunk: "test",
        accumulated: "a".repeat(100), // Long accumulated text
        estimatedProgress: 50,
        status: "generating",
      }

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={true}
            isCanceling={false}
            progress={progress}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.execute.receivingPrompts"),
      ).toBeInTheDocument()
    })
  })

  describe("StatusLabel Component", () => {
    it("should display sending status", () => {
      const progress: GenerationProgress = {
        chunk: "",
        accumulated: "",
        estimatedProgress: 0,
        status: "sending",
      }

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={true}
            isCanceling={false}
            progress={progress}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText(/promptOrganizer.status.sending/),
      ).toBeInTheDocument()
    })

    it("should display generating status", () => {
      const progress: GenerationProgress = {
        chunk: "",
        accumulated: "",
        estimatedProgress: 50,
        status: "generating",
      }

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={true}
            isCanceling={false}
            progress={progress}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText(/promptOrganizer.status.generating/),
      ).toBeInTheDocument()
    })

    it("should display complete status", () => {
      const progress: GenerationProgress = {
        chunk: "",
        accumulated: "",
        estimatedProgress: 100,
        status: "complete",
      }

      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={true}
            isCanceling={false}
            progress={progress}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText(/promptOrganizer.status.complete/),
      ).toBeInTheDocument()
    })
  })

  describe("Dialog Interaction", () => {
    it("should prevent closing during execution", () => {
      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={true}
            isCanceling={false}
            progress={{
              chunk: "",
              accumulated: "",
              estimatedProgress: 50,
              status: "generating",
            }}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      // Close button should not be visible during execution
      expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument()
    })

    it("should call onOpenChange when close button is clicked (not executing)", async () => {
      render(
        <TestWrapper>
          <OrganizerExecuteDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onExecute={mockOnExecute}
            isExecuting={false}
            isCanceling={false}
            progress={null}
            onCancel={mockOnCancel}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText(/1\.\s*Prompt 1/)).toBeInTheDocument()
      })

      const cancelButton = screen.getByText("buttons.cancel")
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
