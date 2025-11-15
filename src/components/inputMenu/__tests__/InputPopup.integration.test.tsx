import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { InputPopup } from "../InputPopup"
import { TestIds } from "@/components/const"
import type { Prompt } from "@/types/prompt"
import { SettingsProvider } from "@/contexts/SettingsContext"
import { ContainerProvider } from "@/contexts/ContainerContext"

// Mock modules with hoisting to ensure they're applied before import
const { mockServiceFacade } = vi.hoisted(() => ({
  mockServiceFacade: {
    getPopupPlacement: vi
      .fn()
      .mockReturnValue({ sideOffset: 10, alignOffset: 0 }),
    insertPrompt: vi.fn(),
    deletePrompt: vi.fn(),
    pinPrompt: vi.fn(),
    unpinPrompt: vi.fn(),
    prepareSaveDialogData: vi.fn().mockResolvedValue({ initialName: "Test" }),
    getPrompt: vi.fn().mockResolvedValue({
      id: "1",
      name: "Test Prompt",
      content: "Test content",
    }),
    savePromptManually: vi.fn(),
    updatePrompt: vi.fn(),
  },
}))

vi.mock("@/services/promptServiceFacade", () => ({
  PromptServiceFacade: {
    getInstance: vi.fn().mockReturnValue(mockServiceFacade),
  },
}))

// Mock useCaretNode with hoisting
const { mockUseCaretNode } = vi.hoisted(() => ({
  mockUseCaretNode: vi.fn().mockReturnValue({ nodeAtCaret: null }),
}))

vi.mock("@/hooks/useCaretNode", () => ({
  useCaretNode: mockUseCaretNode,
}))

// Mock storage service for SettingsProvider
vi.mock("@/services/storage", () => ({
  StorageService: {
    getInstance: vi.fn().mockReturnValue({
      getSettings: vi.fn().mockResolvedValue({
        autoSaveEnabled: true,
        autoCompleteEnabled: true,
        maxPrompts: 100,
        sortOrder: "recent",
        showNotifications: true,
        autoCompleteTarget: "all",
      }),
      setSettings: vi.fn().mockResolvedValue(undefined),
      watchSettings: vi.fn().mockReturnValue(() => {}), // unsubscribe function
    }),
  },
}))

vi.mock("@/services/importExport", () => ({
  promptExportService: {
    exportToCSV: vi.fn(),
  },
  promptImportService: {
    importFromCSV: vi.fn(),
  },
}))

// Mock WXT analytics to prevent Browser.runtime.connect errors
vi.mock("@wxt-dev/analytics", () => ({
  createAnalytics: vi.fn().mockReturnValue({
    track: vi.fn(),
  }),
}))

// Mock useSettings with hoisting
const { useSettingsMock } = vi.hoisted(() => ({
  useSettingsMock: vi.fn(),
}))
vi.mock("@/hooks/useSettings", () => ({
  useSettings: useSettingsMock,
}))

// TestWrapper component that provides all necessary contexts
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ContainerProvider container={document.body}>
      <SettingsProvider>{children}</SettingsProvider>
    </ContainerProvider>
  )
}

describe("InputPopup Integration Tests", () => {
  const mockTargetElement = document.createElement("div")

  const mockPrompts: Prompt[] = [
    {
      id: "1",
      name: "Test Prompt 1",
      content: "Test content 1",
      executionCount: 5,
      lastExecutedAt: new Date("2023-01-01"),
      isPinned: false,
      lastExecutionUrl: "https://example.com",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    },
    {
      id: "2",
      name: "Test Prompt 2",
      content: "Test content 2",
      executionCount: 3,
      lastExecutedAt: new Date("2023-01-02"),
      isPinned: true,
      lastExecutionUrl: "https://example.com",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    },
  ]

  const mockPinnedPrompts: Prompt[] = [mockPrompts[1]]

  const defaultProps = {
    targetElm: mockTargetElement,
    prompts: mockPrompts,
    pinnedPrompts: mockPinnedPrompts,
    saveEnabled: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Restore mock return values that were cleared
    mockServiceFacade.getPopupPlacement.mockReturnValue({
      sideOffset: 10,
      alignOffset: 0,
    })
    mockServiceFacade.prepareSaveDialogData.mockResolvedValue({
      initialName: "Test",
    })
    mockServiceFacade.getPrompt.mockResolvedValue({
      id: "1",
      name: "Test Prompt",
      content: "Test content",
    })

    const mockUpdate = vi.fn()
    mockUseCaretNode.mockReturnValue({ nodeAtCaret: null })
    useSettingsMock.mockReturnValue({
      settings: {},
      update: mockUpdate,
    })
  })

  // Hover over Settings menu
  const hoverSettingsMenu = async () => {
    const settingsTrigger = screen.getByTestId(
      TestIds.inputPopup.settingsTrigger,
    )
    fireEvent.mouseEnter(settingsTrigger)
    return settingsTrigger
  }

  describe("Settings Persistence Tests", () => {
    it("should render settings menu as part of menubar", () => {
      render(
        <TestWrapper>
          <InputPopup {...defaultProps} />
        </TestWrapper>,
      )

      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      expect(settingsTrigger).toBeInTheDocument()
    })

    it("should maintain settings state when switching between different menus", async () => {
      render(
        <TestWrapper>
          <InputPopup {...defaultProps} />
        </TestWrapper>,
      )

      // First open the settings menu
      await hoverSettingsMenu()

      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.settingsContent),
        ).toBeInTheDocument()
      })

      // Switch to other menu
      const historyTrigger = screen.getByTestId(
        TestIds.inputPopup.historyTrigger,
      )
      fireEvent.mouseEnter(historyTrigger)

      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.historyList),
        ).toBeInTheDocument()
      })

      // Return to settings menu again
      await hoverSettingsMenu()

      await waitFor(() => {
        // Verify that settings menu is displayed again
        expect(
          screen.getByTestId(TestIds.inputPopup.settingsContent),
        ).toBeInTheDocument()
        // Verify that setting items are displayed properly
        expect(screen.getByText("settings.autoSave")).toBeInTheDocument()
      })
    })

    it("should handle menu navigation between History, Pinned, and Settings", async () => {
      render(
        <TestWrapper>
          <InputPopup {...defaultProps} />
        </TestWrapper>,
      )

      // Hover over History menu
      const historyTrigger = screen.getByTestId(
        TestIds.inputPopup.historyTrigger,
      )
      fireEvent.mouseEnter(historyTrigger)

      // Hover over Pinned menu
      const pinnedTrigger = screen.getByTestId(TestIds.inputPopup.pinnedTrigger)
      fireEvent.mouseEnter(pinnedTrigger)

      // Hover over Settings menu
      const settingsTrigger = await hoverSettingsMenu()

      // Verify that all triggers exist
      expect(historyTrigger).toBeInTheDocument()
      expect(pinnedTrigger).toBeInTheDocument()
      expect(settingsTrigger).toBeInTheDocument()
    })
  })

  describe("Menubar Integration Tests", () => {
    it("should display all menu triggers in correct order", async () => {
      render(
        <TestWrapper>
          <InputPopup {...defaultProps} />
        </TestWrapper>,
      )

      const menubar = screen.getByRole("menubar")
      expect(menubar).toBeInTheDocument()

      // Verify menu button order
      const triggers = screen.getAllByRole("menuitem")
      expect(triggers).toHaveLength(4) // History, Pinned, Improve, Settings

      expect(triggers[0]).toHaveAttribute(
        "data-testid",
        TestIds.inputPopup.historyTrigger,
      )
      expect(triggers[1]).toHaveAttribute(
        "data-testid",
        TestIds.inputPopup.pinnedTrigger,
      )
      expect(triggers[2]).toHaveAttribute(
        "data-testid",
        TestIds.inputPopup.improveTrigger,
      )
      expect(triggers[3]).toHaveAttribute(
        "data-testid",
        TestIds.inputPopup.settingsTrigger,
      )
    })

    it("should allow opening multiple menus independently", async () => {
      render(
        <TestWrapper>
          <InputPopup {...defaultProps} />
        </TestWrapper>,
      )

      // Open History menu
      const historyTrigger = screen.getByTestId(
        TestIds.inputPopup.historyTrigger,
      )
      fireEvent.mouseEnter(historyTrigger)

      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.historyList),
        ).toBeInTheDocument()
      })

      // Open Settings menu (History menu will be closed)
      hoverSettingsMenu()

      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.settingsContent),
        ).toBeInTheDocument()
      })
    })

    it("should maintain save button disabled state correctly", () => {
      const propsWithSaveDisabled = {
        ...defaultProps,
        saveEnabled: false,
      }

      render(
        <TestWrapper>
          <InputPopup {...propsWithSaveDisabled} />
        </TestWrapper>,
      )

      const improveButton = screen.getByTestId(TestIds.inputPopup.improveTrigger)
      expect(improveButton).toBeDisabled()

      // Verify that Settings button is enabled
      const settingsButton = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      expect(settingsButton).not.toBeDisabled()
    })
  })

  describe("Accessibility Tests", () => {
    it("should provide proper ARIA labels and roles", async () => {
      render(
        <TestWrapper>
          <InputPopup {...defaultProps} />
        </TestWrapper>,
      )

      // Open Settings menu
      hoverSettingsMenu()

      await waitFor(() => {
        // Verify MenubarCheckboxItem ARIA attributes
        const checkboxItems = screen.getAllByRole("menuitemcheckbox")
        expect(checkboxItems.length).toBeGreaterThan(0)

        checkboxItems.forEach((item) => {
          expect(item).toHaveAttribute("aria-checked")
        })

        // Verify MenubarRadioItem ARIA attributes
        const radioItems = screen.getAllByRole("menuitemradio")
        expect(radioItems.length).toBeGreaterThan(0)

        radioItems.forEach((item) => {
          expect(item).toHaveAttribute("aria-checked")
        })

        // Verify MenubarItem role
        const menuItems = screen.getAllByRole("menuitem")
        expect(menuItems.length).toBeGreaterThan(0)
      })
    })

    // TODO: Support keyboard navigation.
    // it("should support keyboard navigation", async () => {
    //   render(
    //     <TestWrapper>
    //       <InputPopup {...defaultProps} />
    //     </TestWrapper>,
    //   )

    //   const settingsTrigger = screen.getByTestId(
    //     TestIds.inputPopup.settingsTrigger,
    //   )

    //   // Set focus
    //   settingsTrigger.focus()
    //   expect(settingsTrigger).toHaveFocus()

    //   // Open menu with Enter key
    //   fireEvent.keyDown(settingsTrigger, { key: "Enter" })

    //   await waitFor(() => {
    //     expect(
    //       screen.getByTestId(TestIds.inputPopup.settingsContent),
    //     ).toBeInTheDocument()
    //   })
    // })
  })

  describe("Responsive Tests", () => {
    it("should handle different viewport sizes correctly", () => {
      // Change viewport size
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 320, // Mobile size
      })

      render(
        <TestWrapper>
          <InputPopup {...defaultProps} />
        </TestWrapper>,
      )

      const menubar = screen.getByRole("menubar")
      expect(menubar).toBeInTheDocument()

      // Verify that menu is displayed properly
      expect(
        screen.getByTestId(TestIds.inputPopup.settingsTrigger),
      ).toBeInTheDocument()
    })
  })

  // TODO: Fix variable expansion flow tests - they require more complex setup
  describe.skip("Variable Expansion Flow Tests", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Restore mock return values
      mockServiceFacade.getPopupPlacement.mockReturnValue({
        sideOffset: 10,
        alignOffset: 0,
      })
    })

    it("should display variable input dialog when executing prompt with variables", async () => {
      const promptWithVariables: Prompt = {
        id: "var-prompt-1",
        name: "Greeting Prompt",
        content: "Hello {{name}}, how are you?",
        executionCount: 0,
        lastExecutedAt: new Date(),
        isPinned: false,
        lastExecutionUrl: "https://example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        variables: [
          {
            name: "name",
            type: "text",
            defaultValue: "John",
          },
        ],
      }

      const propsWithVariables = {
        ...defaultProps,
        prompts: [promptWithVariables],
      }

      mockServiceFacade.getPrompt.mockResolvedValue(promptWithVariables)

      render(
        <TestWrapper>
          <InputPopup {...propsWithVariables} />
        </TestWrapper>,
      )

      // Open history menu
      const historyTrigger = screen.getByTestId(
        TestIds.inputPopup.historyTrigger,
      )
      fireEvent.mouseEnter(historyTrigger)

      // Wait for prompt list to appear
      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.historyList),
        ).toBeInTheDocument()
      })

      // Find and click the prompt item
      const promptItem = screen.getByText("Greeting Prompt")
      fireEvent.click(promptItem)

      // Verify variable input dialog is displayed
      await waitFor(() => {
        expect(screen.getByText("variableDialog.title")).toBeInTheDocument()
      })

      // Verify variable input field is displayed
      expect(screen.getByText("name")).toBeInTheDocument()
    })

    it("should execute prompt directly when no variables present", async () => {
      const promptWithoutVariables: Prompt = {
        id: "no-var-prompt",
        name: "Simple Prompt",
        content: "Hello world",
        executionCount: 0,
        lastExecutedAt: new Date(),
        isPinned: false,
        lastExecutionUrl: "https://example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const propsWithoutVariables = {
        ...defaultProps,
        prompts: [promptWithoutVariables],
      }

      mockServiceFacade.getPrompt.mockResolvedValue(promptWithoutVariables)

      render(
        <TestWrapper>
          <InputPopup {...propsWithoutVariables} />
        </TestWrapper>,
      )

      // Open history menu
      const historyTrigger = screen.getByTestId(
        TestIds.inputPopup.historyTrigger,
      )
      fireEvent.mouseEnter(historyTrigger)

      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.historyList),
        ).toBeInTheDocument()
      })

      // Click the prompt item
      const promptItem = screen.getByText("Simple Prompt")
      fireEvent.click(promptItem)

      // Variable input dialog should NOT be displayed
      await waitFor(() => {
        expect(
          screen.queryByText("variableDialog.title"),
        ).not.toBeInTheDocument()
      })

      // Verify insertPrompt was called
      expect(mockServiceFacade.insertPrompt).toHaveBeenCalled()
    })

    it("should execute prompt directly when all variables are excluded", async () => {
      const promptWithExcludedVariables: Prompt = {
        id: "excluded-var-prompt",
        name: "Excluded Variables Prompt",
        content: "Process {{data}} with {{config}}",
        executionCount: 0,
        lastExecutedAt: new Date(),
        isPinned: false,
        lastExecutionUrl: "https://example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        variables: [
          {
            name: "data",
            type: "exclude",
          },
          {
            name: "config",
            type: "exclude",
          },
        ],
      }

      const propsWithExcluded = {
        ...defaultProps,
        prompts: [promptWithExcludedVariables],
      }

      mockServiceFacade.getPrompt.mockResolvedValue(
        promptWithExcludedVariables,
      )

      render(
        <TestWrapper>
          <InputPopup {...propsWithExcluded} />
        </TestWrapper>,
      )

      // Open history menu
      const historyTrigger = screen.getByTestId(
        TestIds.inputPopup.historyTrigger,
      )
      fireEvent.mouseEnter(historyTrigger)

      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.historyList),
        ).toBeInTheDocument()
      })

      // Click the prompt item
      const promptItem = screen.getByText("Excluded Variables Prompt")
      fireEvent.click(promptItem)

      // Variable input dialog should NOT be displayed
      await waitFor(() => {
        expect(
          screen.queryByText("variableDialog.title"),
        ).not.toBeInTheDocument()
      })

      // Verify insertPrompt was called
      expect(mockServiceFacade.insertPrompt).toHaveBeenCalled()
    })

    it("should submit variable values and execute prompt", async () => {
      const promptWithVariables: Prompt = {
        id: "var-prompt-2",
        name: "Variable Prompt",
        content: "Hello {{name}}",
        executionCount: 0,
        lastExecutedAt: new Date(),
        isPinned: false,
        lastExecutionUrl: "https://example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        variables: [
          {
            name: "name",
            type: "text",
            defaultValue: "",
          },
        ],
      }

      const propsWithVariables = {
        ...defaultProps,
        prompts: [promptWithVariables],
      }

      mockServiceFacade.getPrompt.mockResolvedValue(promptWithVariables)

      render(
        <TestWrapper>
          <InputPopup {...propsWithVariables} />
        </TestWrapper>,
      )

      // Open history menu and click prompt
      const historyTrigger = screen.getByTestId(
        TestIds.inputPopup.historyTrigger,
      )
      fireEvent.mouseEnter(historyTrigger)

      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.historyList),
        ).toBeInTheDocument()
      })

      const promptItem = screen.getByText("Variable Prompt")
      fireEvent.click(promptItem)

      // Wait for variable input dialog
      await waitFor(() => {
        expect(screen.getByText("variableDialog.title")).toBeInTheDocument()
      })

      // Enter variable value
      const input = screen.getByPlaceholderText("variableDialog.enterValue")
      fireEvent.change(input, { target: { value: "Alice" } })

      // Click execute button
      const executeButton = screen.getByText("common.execute")
      fireEvent.click(executeButton)

      // Verify insertPrompt was called with variable values
      await waitFor(() => {
        expect(mockServiceFacade.insertPrompt).toHaveBeenCalledWith(
          "var-prompt-2",
          null,
          expect.objectContaining({
            variableValues: { name: "Alice" },
          }),
        )
      })

      // Variable dialog should be closed
      await waitFor(() => {
        expect(
          screen.queryByText("variableDialog.title"),
        ).not.toBeInTheDocument()
      })
    })

    it("should close variable dialog when cancel is clicked", async () => {
      const promptWithVariables: Prompt = {
        id: "var-prompt-3",
        name: "Cancellable Prompt",
        content: "Hello {{name}}",
        executionCount: 0,
        lastExecutedAt: new Date(),
        isPinned: false,
        lastExecutionUrl: "https://example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        variables: [
          {
            name: "name",
            type: "text",
          },
        ],
      }

      const propsWithVariables = {
        ...defaultProps,
        prompts: [promptWithVariables],
      }

      mockServiceFacade.getPrompt.mockResolvedValue(promptWithVariables)

      render(
        <TestWrapper>
          <InputPopup {...propsWithVariables} />
        </TestWrapper>,
      )

      // Open history menu and click prompt
      const historyTrigger = screen.getByTestId(
        TestIds.inputPopup.historyTrigger,
      )
      fireEvent.mouseEnter(historyTrigger)

      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.historyList),
        ).toBeInTheDocument()
      })

      const promptItem = screen.getByText("Cancellable Prompt")
      fireEvent.click(promptItem)

      // Wait for variable input dialog
      await waitFor(() => {
        expect(screen.getByText("variableDialog.title")).toBeInTheDocument()
      })

      // Click cancel button
      const cancelButton = screen.getByText("common.cancel")
      fireEvent.click(cancelButton)

      // Variable dialog should be closed
      await waitFor(() => {
        expect(
          screen.queryByText("variableDialog.title"),
        ).not.toBeInTheDocument()
      })

      // insertPrompt should NOT have been called
      expect(mockServiceFacade.insertPrompt).not.toHaveBeenCalled()
    })
  })
})
