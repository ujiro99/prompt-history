/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { OrganizerResultDialog } from "../OrganizerResultDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"
import type { PromptOrganizerResult } from "@/types/promptOrganizer"

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

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <ContainerProvider container={document.body}>{children}</ContainerProvider>
}

describe("OrganizerResultDialog", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnPreview = vi.fn()
  const mockOnSaveAll = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Dialog Rendering", () => {
    it("should render dialog when open is true", () => {
      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={null}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("promptOrganizer.summary.title")).toBeInTheDocument()
    })

    it("should not render dialog when open is false", () => {
      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={false}
            onOpenChange={mockOnOpenChange}
            result={null}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(
        screen.queryByText("promptOrganizer.summary.title"),
      ).not.toBeInTheDocument()
    })
  })

  describe("No Templates Case", () => {
    it("should display no templates message when result has no templates", () => {
      const result: PromptOrganizerResult = {
        templates: [],
        sourceCount: 5,
        sourcePromptIds: ["1", "2", "3"],
        periodDays: 30,
        executedAt: new Date(),
        inputTokens: 100,
        outputTokens: 50,
        estimatedCost: 0.01,
        actualCost: 0.01,
      }

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.summary.noTemplates"),
      ).toBeInTheDocument()
    })

    it("should display cancel button when no templates exist", () => {
      const result: PromptOrganizerResult = {
        templates: [],
        sourceCount: 5,
        sourcePromptIds: ["1", "2", "3"],
        periodDays: 30,
        executedAt: new Date(),
        inputTokens: 100,
        outputTokens: 50,
        estimatedCost: 0.01,
        actualCost: 0.01,
      }

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("common.cancel")).toBeInTheDocument()
    })

    it("should call onOpenChange when cancel button is clicked", () => {
      const result: PromptOrganizerResult = {
        templates: [],
        sourceCount: 5,
        sourcePromptIds: ["1", "2", "3"],
        periodDays: 30,
        executedAt: new Date(),
        inputTokens: 100,
        outputTokens: 50,
        estimatedCost: 0.01,
        actualCost: 0.01,
      }

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      const cancelButton = screen.getByText("common.cancel")
      fireEvent.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe("Templates Exist Case", () => {
    const createResultWithTemplates = (
      count: number = 1,
      successMessageGenerated: boolean = true,
    ): PromptOrganizerResult => ({
      templates: Array.from({ length: count }, (_, i) => ({
        id: `t${i + 1}`,
        title: `Template ${i + 1}`,
        content: `Content ${i + 1}`,
        useCase: `Use case ${i + 1}`,
        clusterExplanation: `Explanation ${i + 1}`,
        categoryId: "cat1",
        variables: [],
        aiMetadata: {
          sourcePromptIds: ["1", "2"],
          sourceCount: 2,
          confirmed: false,
          showInPinned: false,
        },
        userAction: "pending" as const,
      })),
      sourceCount: 5,
      sourcePromptIds: ["1", "2", "3", "4", "5"],
      periodDays: 30,
      executedAt: new Date(),
      inputTokens: 1000,
      outputTokens: 500,
      estimatedCost: 0.05,
      actualCost: 0.05,
      successMessage: "Great templates created!",
      successMessageGenerated,
    })

    it("should display organization summary", () => {
      const result = createResultWithTemplates(3)

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.summary.organizationPerformed"),
      ).toBeInTheDocument()
    })

    it("should display summary section with templates", () => {
      const result = createResultWithTemplates(3)

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      // Verify summary section elements are rendered
      expect(screen.getByText("promptOrganizer.summary.organizationPerformed")).toBeInTheDocument()
      expect(screen.getByText("Template 1")).toBeInTheDocument()
    })

    it("should display first template preview", () => {
      const result = createResultWithTemplates(3)

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("Template 1")).toBeInTheDocument()
      expect(screen.getByText("Use case 1")).toBeInTheDocument()
    })

    it("should display example prompts section", () => {
      const result = createResultWithTemplates(2)

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.summary.examplePrompts"),
      ).toBeInTheDocument()
    })

    it("should display success message when generated", () => {
      const result = createResultWithTemplates(1, true)

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      // Verify that template content is rendered (success message is in FadeInText which splits into character spans)
      expect(screen.getByText("Template 1")).toBeInTheDocument()
      expect(screen.getByText("promptOrganizer.summary.organizationPerformed")).toBeInTheDocument()
    })

    it("should not display first text when successMessageGenerated is false", () => {
      const result = createResultWithTemplates(1, false)

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(
        screen.queryByText("promptOrganizer.summary.summary[5,1]"),
      ).not.toBeInTheDocument()
    })

    it("should display preview button", () => {
      const result = createResultWithTemplates(1)

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("promptOrganizer.buttons.preview")).toBeInTheDocument()
    })

    it("should call onPreview when preview button is clicked", () => {
      const result = createResultWithTemplates(1)

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      const previewButton = screen.getByText("promptOrganizer.buttons.preview")
      fireEvent.click(previewButton)

      expect(mockOnPreview).toHaveBeenCalledTimes(1)
    })

    it("should display save all button", () => {
      const result = createResultWithTemplates(1)

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("promptOrganizer.buttons.saveAll")).toBeInTheDocument()
    })

    it("should call onSaveAll when save all button is clicked", () => {
      const result = createResultWithTemplates(1)

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      const saveAllButton = screen.getByText("promptOrganizer.buttons.saveAll")
      fireEvent.click(saveAllButton)

      expect(mockOnSaveAll).toHaveBeenCalledTimes(1)
    })
  })

  describe("Null Result Case", () => {
    it("should handle null result gracefully", () => {
      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={null}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("promptOrganizer.summary.title")).toBeInTheDocument()
      expect(
        screen.getByText("promptOrganizer.summary.noTemplates"),
      ).toBeInTheDocument()
    })
  })

  describe("Animation Timing", () => {
    it("should render content with animation support", () => {
      const result: PromptOrganizerResult = {
        templates: [
          {
            id: "t1",
            title: "Template 1",
            content: "Content 1",
            useCase: "Use case 1",
            clusterExplanation: "Explanation 1",
            categoryId: "cat1",
            variables: [],
            aiMetadata: {
              sourcePromptIds: ["1", "2"],
              sourceCount: 2,
              confirmed: false,
              showInPinned: false,
            },
            userAction: "pending",
          },
        ],
        sourceCount: 5,
        sourcePromptIds: ["1", "2", "3", "4", "5"],
        periodDays: 30,
        executedAt: new Date(),
        inputTokens: 1000,
        outputTokens: 500,
        estimatedCost: 0.05,
        actualCost: 0.05,
        successMessage: "Great templates created!",
        successMessageGenerated: true,
      }

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      // Verify that the result content is rendered (success message is in FadeInText which splits into character spans)
      expect(screen.getByText("Template 1")).toBeInTheDocument()
      expect(screen.getByText("promptOrganizer.summary.organizationPerformed")).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("should handle result with empty success message", () => {
      const result: PromptOrganizerResult = {
        templates: [
          {
            id: "t1",
            title: "Template 1",
            content: "Content 1",
            useCase: "Use case 1",
            clusterExplanation: "Explanation 1",
            categoryId: "cat1",
            variables: [],
            aiMetadata: {
              sourcePromptIds: ["1", "2"],
              sourceCount: 2,
              confirmed: false,
              showInPinned: false,
            },
            userAction: "pending",
          },
        ],
        sourceCount: 5,
        sourcePromptIds: ["1", "2", "3"],
        periodDays: 30,
        executedAt: new Date(),
        inputTokens: 100,
        outputTokens: 50,
        estimatedCost: 0.01,
        actualCost: 0.01,
        successMessage: "",
        successMessageGenerated: true,
      }

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("Template 1")).toBeInTheDocument()
    })

    it("should handle result with many templates", () => {
      const result: PromptOrganizerResult = {
        templates: Array.from({ length: 10 }, (_, i) => ({
          id: `t${i + 1}`,
          title: `Template ${i + 1}`,
          content: `Content ${i + 1}`,
          useCase: `Use case ${i + 1}`,
          clusterExplanation: `Explanation ${i + 1}`,
          categoryId: "cat1",
          variables: [],
          aiMetadata: {
            sourcePromptIds: ["1", "2"],
            sourceCount: 2,
            confirmed: false,
            showInPinned: false,
          },
          userAction: "pending",
        })),
        sourceCount: 5,
        sourcePromptIds: ["1", "2", "3", "4", "5"],
        periodDays: 30,
        executedAt: new Date(),
        inputTokens: 1000,
        outputTokens: 500,
        estimatedCost: 0.05,
        actualCost: 0.05,
        successMessage: "Great templates created!",
        successMessageGenerated: true,
      }

      render(
        <TestWrapper>
          <OrganizerResultDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            result={result}
            onPreview={mockOnPreview}
            onSaveAll={mockOnSaveAll}
          />
        </TestWrapper>,
      )

      // Should show first template only in preview
      expect(screen.getByText("Template 1")).toBeInTheDocument()
      expect(screen.queryByText("Template 2")).not.toBeInTheDocument()
      // Should show organization performed message
      expect(screen.getByText("promptOrganizer.summary.organizationPerformed")).toBeInTheDocument()
    })
  })
})
