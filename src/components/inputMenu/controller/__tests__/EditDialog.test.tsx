/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { EditDialog } from "../EditDialog"
import { SaveMode } from "@/types/prompt"
import type { SaveDialogData, VariableConfig, AppSettings } from "@/types/prompt"
import { ContainerProvider } from "@/contexts/ContainerContext"

// Mock @wxt-dev/analytics
vi.mock("@wxt-dev/analytics", () => ({
  createAnalytics: vi.fn().mockReturnValue({
    track: vi.fn(),
  }),
}))

// Mock i18n
vi.mock("#imports", () => ({
  i18n: {
    t: (key: string) => key,
  },
  analytics: {
    track: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock useSettings
const { useSettingsMock } = vi.hoisted(() => ({
  useSettingsMock: vi.fn(),
}))
vi.mock("@/hooks/useSettings", () => ({
  useSettings: useSettingsMock,
}))
import { useSettings } from "@/hooks/useSettings"

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <ContainerProvider container={document.body}>{children}</ContainerProvider>
}

describe("EditDialog - Variable Configuration UI", () => {
  const mockOnSave = vi.fn()
  const mockOnOpenChange = vi.fn()
  const mockUpdate = vi.fn()

  const defaultSettings: AppSettings = {
    autoSaveEnabled: true,
    autoCompleteEnabled: true,
    maxPrompts: 100,
    sortOrder: "recent",
    showNotifications: true,
    autoCompleteTarget: "all",
    variableExpansionEnabled: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useSettings as any).mockReturnValue({
      settings: defaultSettings,
      update: mockUpdate,
    })
  })

  describe("Variable Detection and UI Generation", () => {
    it("should detect variables in prompt content and display variable settings UI", async () => {
      const initialContent = "Hello {{name}}, how are you?"

      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent={initialContent}
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Wait for variable settings section to appear
      await waitFor(() => {
        expect(screen.getByText("dialogs.edit.variableSettings")).toBeInTheDocument()
      })

      // Verify variable configuration UI is displayed (look for type selector label)
      expect(screen.getByText("common.variableType")).toBeInTheDocument()
    })

    it("should dynamically update variable settings when content changes", async () => {
      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello world"
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Initially no variables
      expect(screen.queryByText("dialogs.edit.variableSettings")).not.toBeInTheDocument()

      // Update content to include variables
      const textarea = screen.getByPlaceholderText("placeholders.enterPromptContent")
      fireEvent.change(textarea, { target: { value: "Hello {{name}}" } })

      // Variable settings should appear
      await waitFor(() => {
        expect(screen.getByText("dialogs.edit.variableSettings")).toBeInTheDocument()
      })
      expect(screen.getByText("common.variableType")).toBeInTheDocument()
    })

    it("should detect multiple variables", async () => {
      const initialContent = "{{greeting}} {{name}}, the weather is {{weather}}"

      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent={initialContent}
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText("dialogs.edit.variableSettings")).toBeInTheDocument()
      })

      // Verify all three variables are displayed (3 type selectors should exist)
      const typeLabels = screen.getAllByText("common.variableType")
      expect(typeLabels).toHaveLength(3)
    })

    it("should not display variable settings when no variables present", () => {
      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello world without variables"
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(screen.queryByText("dialogs.edit.variableSettings")).not.toBeInTheDocument()
    })
  })

  describe("Variable Configuration Persistence", () => {
    it("should preserve existing variable configurations when editing", async () => {
      const initialVariables: VariableConfig[] = [
        {
          name: "name",
          type: "text",
          defaultValue: "John",
        },
      ]

      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}}"
            initialVariables={initialVariables}
            displayMode={SaveMode.Overwrite}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText("dialogs.edit.variableSettings")).toBeInTheDocument()
      })

      // Verify default value is preserved
      const input = screen.getByDisplayValue("John")
      expect(input).toBeInTheDocument()
    })

    it("should merge new variables with existing configurations", async () => {
      const initialVariables: VariableConfig[] = [
        {
          name: "name",
          type: "text",
          defaultValue: "John",
        },
      ]

      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}}"
            initialVariables={initialVariables}
            displayMode={SaveMode.Overwrite}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Update content to add a new variable
      const textarea = screen.getByPlaceholderText("placeholders.enterPromptContent")
      fireEvent.change(textarea, { target: { value: "Hello {{name}} and {{friend}}" } })

      await waitFor(() => {
        // Both variables should be present (2 type selectors)
        const typeLabels = screen.getAllByText("common.variableType")
        expect(typeLabels).toHaveLength(2)
      })

      // Original variable should still have its default value
      expect(screen.getByDisplayValue("John")).toBeInTheDocument()
    })

    it("should remove deleted variables from configuration", async () => {
      const initialVariables: VariableConfig[] = [
        {
          name: "name",
          type: "text",
          defaultValue: "John",
        },
        {
          name: "age",
          type: "text",
          defaultValue: "30",
        },
      ]

      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}} {{age}}"
            initialVariables={initialVariables}
            displayMode={SaveMode.Overwrite}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Remove one variable from content
      const textarea = screen.getByPlaceholderText("placeholders.enterPromptContent")
      fireEvent.change(textarea, { target: { value: "Hello {{name}}" } })

      await waitFor(() => {
        // Only one variable should remain (1 type selector)
        const typeLabels = screen.getAllByText("common.variableType")
        expect(typeLabels).toHaveLength(1)
      })
    })
  })

  describe("Save with Variables", () => {
    it("should include variables in save data", async () => {
      const initialContent = "Hello {{name}}"

      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent={initialContent}
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Fill in name
      const nameInput = screen.getByPlaceholderText("placeholders.enterPromptName")
      fireEvent.change(nameInput, { target: { value: "Greeting Prompt" } })

      // Wait for variables to be detected
      await waitFor(() => {
        expect(screen.getByText("dialogs.edit.variableSettings")).toBeInTheDocument()
      })

      // Click save button
      const saveButton = screen.getByText("common.save")
      fireEvent.click(saveButton)

      // Verify onSave was called with variables
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
        const saveData: SaveDialogData = mockOnSave.mock.calls[0][0]
        expect(saveData.variables).toBeDefined()
        expect(saveData.variables).toHaveLength(1)
        expect(saveData.variables![0].name).toBe("name")
      })
    })

    it("should not include empty variables array in save data", async () => {
      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello world"
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Fill in required fields
      const nameInput = screen.getByPlaceholderText("placeholders.enterPromptName")
      fireEvent.change(nameInput, { target: { value: "Simple Prompt" } })

      // Click save button
      const saveButton = screen.getByText("common.save")
      fireEvent.click(saveButton)

      // Verify onSave was called without variables
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
        const saveData: SaveDialogData = mockOnSave.mock.calls[0][0]
        expect(saveData.variables).toBeUndefined()
      })
    })

    it("should include configured variable settings in save data", async () => {
      const initialContent = "Hello {{name}}"

      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent={initialContent}
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Fill in name
      const nameInput = screen.getByPlaceholderText("placeholders.enterPromptName")
      fireEvent.change(nameInput, { target: { value: "Greeting Prompt" } })

      // Wait for variables section
      await waitFor(() => {
        expect(screen.getByText("dialogs.edit.variableSettings")).toBeInTheDocument()
      })

      // Configure variable: set default value
      const defaultValueInput = screen.getByPlaceholderText("placeholders.enterValue")
      fireEvent.change(defaultValueInput, { target: { value: "John Doe" } })

      // Click save button
      const saveButton = screen.getByText("common.save")
      fireEvent.click(saveButton)

      // Verify configured settings are included
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
        const saveData: SaveDialogData = mockOnSave.mock.calls[0][0]
        expect(saveData.variables).toBeDefined()
        expect(saveData.variables![0].defaultValue).toBe("John Doe")
      })
    })
  })

  describe("Dialog State Management", () => {
    it("should reset variables when dialog is closed", async () => {
      const { rerender } = render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}}"
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Wait for variable settings to appear
      await waitFor(() => {
        expect(screen.getByText("dialogs.edit.variableSettings")).toBeInTheDocument()
      })

      // Close dialog
      rerender(
        <TestWrapper>
          <EditDialog
            open={false}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}}"
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Dialog should be closed
      expect(screen.queryByText("dialogs.edit.variableSettings")).not.toBeInTheDocument()
    })

    it("should reload initial variables when dialog reopens", async () => {
      const initialVariables: VariableConfig[] = [
        {
          name: "name",
          type: "text",
          defaultValue: "Original",
        },
      ]

      const { rerender } = render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}}"
            initialVariables={initialVariables}
            displayMode={SaveMode.Overwrite}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Verify initial value
      await waitFor(() => {
        expect(screen.getByDisplayValue("Original")).toBeInTheDocument()
      })

      // Close dialog
      rerender(
        <TestWrapper>
          <EditDialog
            open={false}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}}"
            initialVariables={initialVariables}
            displayMode={SaveMode.Overwrite}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Reopen with updated variables
      const updatedVariables: VariableConfig[] = [
        {
          name: "name",
          type: "text",
          defaultValue: "Updated",
        },
      ]

      rerender(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}}"
            initialVariables={updatedVariables}
            displayMode={SaveMode.Overwrite}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Should show updated value
      await waitFor(() => {
        expect(screen.getByDisplayValue("Updated")).toBeInTheDocument()
      })
    })
  })

  describe("Edit Mode vs New Mode", () => {
    it("should display correct title for edit mode", () => {
      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Test content"
            displayMode={SaveMode.Overwrite}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("dialogs.edit.title")).toBeInTheDocument()
    })

    it("should display correct title for new mode", () => {
      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Test content"
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("dialogs.save.title")).toBeInTheDocument()
    })

    it("should display correct title for copy mode", () => {
      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Test content"
            displayMode={SaveMode.Copy}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      expect(screen.getByText("dialogs.copy.title")).toBeInTheDocument()
    })
  })

  describe("Variable Expansion Disabled", () => {
    beforeEach(() => {
      // Set variableExpansionEnabled to false
      ;(useSettings as any).mockReturnValue({
        settings: {
          ...defaultSettings,
          variableExpansionEnabled: false,
        },
        update: mockUpdate,
      })
    })

    it("should not display variable settings when variableExpansionEnabled is false", () => {
      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}}, how are you?"
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Variable settings section should not be displayed
      expect(screen.queryByText("dialogs.edit.variableSettings")).not.toBeInTheDocument()
    })

    it("should not parse variables when variableExpansionEnabled is false", async () => {
      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}} and {{friend}}"
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // No variable type selectors should be present
      expect(screen.queryByText("common.variableType")).not.toBeInTheDocument()
    })

    it("should not include variables in save data when variableExpansionEnabled is false", async () => {
      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}}"
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Fill in required fields
      const nameInput = screen.getByPlaceholderText("placeholders.enterPromptName")
      fireEvent.change(nameInput, { target: { value: "Test Prompt" } })

      // Click save button
      const saveButton = screen.getByText("common.save")
      fireEvent.click(saveButton)

      // Verify onSave was called without variables
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
        const saveData: SaveDialogData = mockOnSave.mock.calls[0][0]
        expect(saveData.variables).toBeUndefined()
      })
    })

    it("should not display variable settings when content changes with variableExpansionEnabled false", async () => {
      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello world"
            displayMode={SaveMode.New}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Initially no variables
      expect(screen.queryByText("dialogs.edit.variableSettings")).not.toBeInTheDocument()

      // Update content to include variables
      const textarea = screen.getByPlaceholderText("placeholders.enterPromptContent")
      fireEvent.change(textarea, { target: { value: "Hello {{name}} and {{age}}" } })

      // Wait a bit to ensure any potential state updates occur
      await new Promise(resolve => setTimeout(resolve, 100))

      // Variable settings should still not appear
      expect(screen.queryByText("dialogs.edit.variableSettings")).not.toBeInTheDocument()
      expect(screen.queryByText("common.variableType")).not.toBeInTheDocument()
    })

    it("should not preserve initial variables when variableExpansionEnabled is false", async () => {
      const initialVariables: VariableConfig[] = [
        {
          name: "name",
          type: "text",
          defaultValue: "John",
        },
      ]

      render(
        <TestWrapper>
          <EditDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            initialContent="Hello {{name}}"
            initialVariables={initialVariables}
            displayMode={SaveMode.Overwrite}
            onSave={mockOnSave}
          />
        </TestWrapper>,
      )

      // Variable settings section should not be displayed
      expect(screen.queryByText("dialogs.edit.variableSettings")).not.toBeInTheDocument()

      // Default value input should not exist
      expect(screen.queryByDisplayValue("John")).not.toBeInTheDocument()
    })
  })
})
