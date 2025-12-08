/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { OrganizerPreviewDialog } from "../OrganizerPreviewDialog"
import { ContainerProvider } from "@/contexts/ContainerContext"
import type { TemplateCandidate } from "@/types/promptOrganizer"

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

// Mock StorageService
const mockGetAllPrompts = vi.fn()
vi.mock("@/services/storage", () => ({
  StorageService: {
    getInstance: vi.fn(() => ({
      getAllPrompts: mockGetAllPrompts,
    })),
  },
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ContainerProvider container={document.body}>{children}</ContainerProvider>
  )
}

describe("OrganizerPreviewDialog", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSave = vi.fn()

  const createTemplates = (count: number = 3): TemplateCandidate[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `t${i + 1}`,
      title: `Template ${i + 1}`,
      content: `Content ${i + 1}`,
      useCase: `Use case ${i + 1}`,
      clusterExplanation: `Explanation ${i + 1}`,
      categoryId: "cat1",
      variables: [],
      aiMetadata: {
        sourcePromptIds: [`p${i + 1}`],
        sourceCount: 1,
        confirmed: false,
        showInPinned: false,
      },
      userAction: "pending",
    }))

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAllPrompts.mockResolvedValue([
      { id: "p1", name: "Prompt 1", content: "Content 1" },
      { id: "p2", name: "Prompt 2", content: "Content 2" },
      { id: "p3", name: "Prompt 3", content: "Content 3" },
    ])
  })

  describe("Dialog Rendering", () => {
    it("should render dialog when open is true", () => {
      const templates = createTemplates(3)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.preview.title"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("promptOrganizer.preview.description"),
      ).toBeInTheDocument()
    })

    it("should not render dialog when open is false", () => {
      const templates = createTemplates(3)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={false}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(
        screen.queryByText("promptOrganizer.preview.title"),
      ).not.toBeInTheDocument()
    })
  })

  describe("Template List Display", () => {
    it("should display all templates in the list", () => {
      const templates = createTemplates(3)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("Template 1")).toBeInTheDocument()
      expect(screen.getByText("Template 2")).toBeInTheDocument()
      expect(screen.getByText("Template 3")).toBeInTheDocument()
    })

    it("should display prompt list header", () => {
      const templates = createTemplates(3)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.preview.promptList"),
      ).toBeInTheDocument()
    })
  })

  describe("Template Selection", () => {
    it("should select first template by default", () => {
      const templates = createTemplates(3)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // First template details should be displayed
      expect(screen.getByDisplayValue("Template 1")).toBeInTheDocument()
      expect(screen.getByDisplayValue("Use case 1")).toBeInTheDocument()
    })

    it("should change selected template when clicked", async () => {
      const templates = createTemplates(3)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Click on second template
      const templateCards = screen.getAllByText(/Template \d/)
      fireEvent.click(templateCards[1])

      await waitFor(() => {
        expect(screen.getByDisplayValue("Template 2")).toBeInTheDocument()
        expect(screen.getByDisplayValue("Use case 2")).toBeInTheDocument()
      })
    })
  })

  describe("Template Detail Display", () => {
    it("should display all template fields", () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.preview.explanation"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("promptOrganizer.preview.title_label"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("promptOrganizer.preview.useCase"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("promptOrganizer.preview.category"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("promptOrganizer.preview.content"),
      ).toBeInTheDocument()
    })

    it("should display cluster explanation", () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("Explanation 1")).toBeInTheDocument()
    })

    it("should display source prompts section", async () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText("Prompt 1")).toBeInTheDocument()
      })
    })
  })

  describe("Template Editing", () => {
    it("should update title when changed", () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      const titleInput = screen.getByDisplayValue("Template 1")
      fireEvent.change(titleInput, { target: { value: "Updated Title" } })

      expect(screen.getByDisplayValue("Updated Title")).toBeInTheDocument()
    })

    it("should update use case when changed", () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      const useCaseInput = screen.getByDisplayValue("Use case 1")
      fireEvent.change(useCaseInput, { target: { value: "Updated Use Case" } })

      expect(screen.getByDisplayValue("Updated Use Case")).toBeInTheDocument()
    })

    it("should update content when changed", () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      const contentTextarea = screen.getByDisplayValue("Content 1")
      fireEvent.change(contentTextarea, {
        target: { value: "Updated Content" },
      })

      expect(screen.getByDisplayValue("Updated Content")).toBeInTheDocument()
    })
  })

  describe("Template Actions", () => {
    it("should display action buttons", () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.buttons.discard"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("promptOrganizer.buttons.save"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("promptOrganizer.buttons.saveAndPin"),
      ).toBeInTheDocument()
    })

    it("should mark template as discard when discard button is clicked", () => {
      const templates = createTemplates(2)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      const discardButton = screen.getByText("promptOrganizer.buttons.discard")
      fireEvent.click(discardButton)

      // Should move to next pending template
      expect(screen.getByDisplayValue("Template 2")).toBeInTheDocument()
    })

    it("should mark template as save when save button is clicked", () => {
      const templates = createTemplates(2)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      const saveButton = screen.getByText("promptOrganizer.buttons.save")
      fireEvent.click(saveButton)

      // Should move to next pending template
      expect(screen.getByDisplayValue("Template 2")).toBeInTheDocument()
    })

    it("should mark template as save_and_pin when saveAndPin button is clicked", () => {
      const templates = createTemplates(2)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      const saveAndPinButton = screen.getByText(
        "promptOrganizer.buttons.saveAndPin",
      )
      fireEvent.click(saveAndPinButton)

      // Should move to next pending template
      expect(screen.getByDisplayValue("Template 2")).toBeInTheDocument()
    })
  })

  describe("Complete Review Flow", () => {
    it("should show complete message when all templates are reviewed", () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      const saveButton = screen.getByText("promptOrganizer.buttons.save")
      fireEvent.click(saveButton)

      // Should show complete review message
      expect(
        screen.getByText(/promptOrganizer.preview.completeReview/),
      ).toBeInTheDocument()
    })
  })

  describe("Footer Buttons", () => {
    it("should display cancel and apply buttons", () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("common.cancel")).toBeInTheDocument()
      expect(
        screen.getByText(/promptOrganizer.buttons.notReviewed/),
      ).toBeInTheDocument()
    })

    it("should call onOpenChange when cancel button is clicked", () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      const cancelButton = screen.getByText("common.cancel")
      fireEvent.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it("should disable apply button when no templates are reviewed", () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      const applyButton = screen.getByText(
        /promptOrganizer.buttons.notReviewed/,
      )
      expect(applyButton).toBeDisabled()
    })

    it("should enable apply button when at least one template is reviewed", () => {
      const templates = createTemplates(2)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Mark first template as save
      const saveButton = screen.getByText("promptOrganizer.buttons.save")
      fireEvent.click(saveButton)

      // Apply button should be enabled
      const applyButton = screen.getByText(/promptOrganizer.buttons.apply/)
      expect(applyButton).not.toBeDisabled()
    })

    it("should call onSave with edited templates when apply is clicked", () => {
      const templates = createTemplates(2)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Edit first template
      const titleInput = screen.getByDisplayValue("Template 1")
      fireEvent.change(titleInput, { target: { value: "Edited Template 1" } })

      // Mark as save
      const saveButton = screen.getByText("promptOrganizer.buttons.save")
      fireEvent.click(saveButton)

      // Click apply
      const applyButton = screen.getByText(/promptOrganizer.buttons.apply/)
      fireEvent.click(applyButton)

      expect(mockOnSave).toHaveBeenCalledTimes(1)
      const savedTemplates = mockOnSave.mock.calls[0][0]
      expect(savedTemplates[0].title).toBe("Edited Template 1")
      expect(savedTemplates[0].userAction).toBe("save")
    })

    it("should close dialog when apply is clicked", () => {
      const templates = createTemplates(1)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Mark template as save
      const saveButton = screen.getByText("promptOrganizer.buttons.save")
      fireEvent.click(saveButton)

      // Click apply
      const applyButton = screen.getByText(/promptOrganizer.buttons.applyAll/)
      fireEvent.click(applyButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty template list", () => {
      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={[]}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.preview.noTemplates"),
      ).toBeInTheDocument()
    })

    it("should handle template with variables", () => {
      const templates = createTemplates(1)
      templates[0].variables = [
        { name: "var1", type: "text", defaultValue: "default" },
      ]

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(
        screen.getByText("promptOrganizer.preview.variables"),
      ).toBeInTheDocument()
    })

    it("should handle template with multiple source prompts", async () => {
      const templates = createTemplates(1)
      templates[0].aiMetadata.sourcePromptIds = ["p1", "p2", "p3"]
      templates[0].aiMetadata.sourceCount = 3

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText(/\(3\)/)).toBeInTheDocument()
      })
    })
  })

  describe("Next Pending Template Logic", () => {
    it("should move to next pending template after action", () => {
      const templates = createTemplates(3)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Should start with Template 1
      expect(screen.getByDisplayValue("Template 1")).toBeInTheDocument()

      // Save first template
      const saveButton = screen.getByText("promptOrganizer.buttons.save")
      fireEvent.click(saveButton)

      // Should move to Template 2
      expect(screen.getByDisplayValue("Template 2")).toBeInTheDocument()
    })

    it("should cycle to first pending template after last", () => {
      const templates = createTemplates(2)

      render(
        <TestWrapper>
          <OrganizerPreviewDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            templates={templates}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Save first template
      const saveButton = screen.getByText("promptOrganizer.buttons.save")
      fireEvent.click(saveButton)

      // Should be at Template 2
      expect(screen.getByDisplayValue("Template 2")).toBeInTheDocument()

      // Save second template - all templates reviewed
      fireEvent.click(saveButton)

      // Should show completion message
      expect(
        screen.getByText(/promptOrganizer.preview.completeReview/),
      ).toBeInTheDocument()
    })
  })
})
