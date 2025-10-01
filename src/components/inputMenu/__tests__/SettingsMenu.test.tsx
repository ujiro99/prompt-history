import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { ContainerProvider } from "@/contexts/ContainerContext"

import { Menubar } from "@/components/ui/menubar"

import { SettingsMenu } from "../SettingsMenu"
import type { AppSettings } from "@/types/prompt"
import { TestIds, MENU } from "@/components/const"

// Mock modules
const { useSettingsMock } = vi.hoisted(() => ({
  useSettingsMock: vi.fn(),
}))
vi.mock("@/hooks/useSettings", () => ({
  useSettings: useSettingsMock,
}))
import { useSettings } from "@/hooks/useSettings"

vi.mock("@/services/importExport", () => ({
  promptExportService: {
    exportToCSV: vi.fn(),
  },
  promptImportService: {
    importFromCSV: vi.fn(),
  },
}))
import {
  promptExportService,
  promptImportService,
} from "@/services/importExport"

type MockMenubarProps = {
  onMouseEnter?: () => void
}
const MockMenubar = ({ onMouseEnter }: MockMenubarProps) => {
  const [value, setValue] = React.useState<MENU>(MENU.None)
  const handleMouseEnter = () => {
    onMouseEnter?.()
    setValue(MENU.Settings)
  }

  return (
    <ContainerProvider container={document.body}>
      <Menubar value={value} onValueChange={(v) => setValue(v as MENU)}>
        <SettingsMenu onMouseEnter={handleMouseEnter} />
      </Menubar>
    </ContainerProvider>
  )
}

describe("SettingsMenu", () => {
  const mockUpdate = vi.fn()
  const mockOnMouseEnter = vi.fn()

  const defaultSettings: AppSettings = {
    autoSaveEnabled: true,
    autoCompleteEnabled: true,
    maxPrompts: 100,
    sortOrder: "recent",
    showNotifications: true,
    autoCompleteTarget: "all",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useSettings as any).mockReturnValue({
      settings: defaultSettings,
      update: mockUpdate,
    })
  })

  const renderMenubar = () => {
    return render(<MockMenubar />)
  }

  describe("UI Operation Tests - Settings Menu Display", () => {
    it("should display settings trigger with correct test id", () => {
      renderMenubar()

      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      expect(settingsTrigger).toBeInTheDocument()
    })

    it("should call onMouseEnter when settings trigger is hovered", () => {
      render(<MockMenubar onMouseEnter={mockOnMouseEnter} />)

      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      fireEvent.mouseEnter(settingsTrigger)

      expect(mockOnMouseEnter).toHaveBeenCalledTimes(1)
    })

    it("should display settings content when menu is opened", async () => {
      render(<MockMenubar onMouseEnter={mockOnMouseEnter} />)

      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      fireEvent.mouseEnter(settingsTrigger)
      expect(mockOnMouseEnter).toHaveBeenCalledTimes(1)

      await waitFor(() => {
        const settingsContent = screen.getByTestId(
          TestIds.inputPopup.settingsContent,
        )
        expect(settingsContent).toBeInTheDocument()
      })
    })

    it("should display all setting items when menu is opened", async () => {
      renderMenubar()

      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      fireEvent.mouseEnter(settingsTrigger)

      await waitFor(() => {
        // ON/OFF setting items
        expect(screen.getByText("settings.autoSave")).toBeInTheDocument()
        expect(screen.getByText("settings.autoComplete")).toBeInTheDocument()
        expect(screen.getByText("settings.notifications")).toBeInTheDocument()

        // Selection setting items
        expect(
          screen.getByText("settings.autoCompleteTarget.all"),
        ).toBeInTheDocument()
        expect(
          screen.getByText("settings.autoCompleteTarget.pinned"),
        ).toBeInTheDocument()

        // Action setting items
        expect(screen.getByText("settings.export")).toBeInTheDocument()
        expect(screen.getByText("settings.import")).toBeInTheDocument()
      })
    })

    it("should not display settings content when settings is null", () => {
      useSettingsMock.mockReturnValue({
        settings: null,
        update: mockUpdate,
      })

      renderMenubar()

      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      fireEvent.mouseEnter(settingsTrigger)

      // Verify that settings items are not displayed
      expect(screen.queryByText("Auto Save Prompts")).not.toBeInTheDocument()
    })
  })

  describe("UI Operation Tests - Toggle ON/OFF Settings", () => {
    beforeEach(async () => {
      renderMenubar()
      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      fireEvent.mouseEnter(settingsTrigger)
      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.settingsContent),
        ).toBeInTheDocument()
      })
    })

    it("should toggle autoSaveEnabled setting", async () => {
      const autoSaveCheckbox = screen.getByRole("menuitemcheckbox", {
        name: "settings.autoSave",
      })
      expect(autoSaveCheckbox).toHaveAttribute("aria-checked", "true")

      fireEvent.click(autoSaveCheckbox)

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ autoSaveEnabled: false })
      })
    })

    it("should toggle autoCompleteEnabled setting", async () => {
      const autoCompleteCheckbox = screen.getByRole("menuitemcheckbox", {
        name: "settings.autoComplete",
      })
      expect(autoCompleteCheckbox).toHaveAttribute("aria-checked", "true")

      fireEvent.click(autoCompleteCheckbox)

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ autoCompleteEnabled: false })
      })
    })

    it("should toggle showNotifications setting", async () => {
      const notificationsCheckbox = screen.getByRole("menuitemcheckbox", {
        name: "settings.notifications",
      })
      expect(notificationsCheckbox).toHaveAttribute("aria-checked", "true")

      fireEvent.click(notificationsCheckbox)

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ showNotifications: false })
      })
    })

    it("should handle undefined autoCompleteEnabled setting", async () => {
      useSettingsMock.mockReturnValue({
        settings: { ...defaultSettings, autoCompleteEnabled: undefined },
        update: mockUpdate,
      })

      await waitFor(() => {
        const autoCompleteCheckbox = screen.getByRole("menuitemcheckbox", {
          name: "settings.autoComplete",
        })
        // Verify that the default value of true is applied
        expect(autoCompleteCheckbox).toHaveAttribute("aria-checked", "true")
      })
    })
  })

  describe("UI Operation Tests - Selection Settings Changes", () => {
    it("should change autoCompleteTarget from 'all' to 'pinned'", async () => {
      renderMenubar()
      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      fireEvent.mouseEnter(settingsTrigger)
      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.settingsContent),
        ).toBeInTheDocument()
      })

      const allRadio = screen.getByRole("menuitemradio", {
        name: "settings.autoCompleteTarget.all",
      })
      const pinnedRadio = screen.getByRole("menuitemradio", {
        name: "settings.autoCompleteTarget.pinned",
      })

      expect(allRadio).toHaveAttribute("aria-checked", "true")
      expect(pinnedRadio).toHaveAttribute("aria-checked", "false")

      fireEvent.click(pinnedRadio)

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          autoCompleteTarget: "pinned",
        })
      })
    })

    it("should change autoCompleteTarget from 'pinned' to 'all'", async () => {
      useSettingsMock.mockReturnValue({
        settings: { ...defaultSettings, autoCompleteTarget: "pinned" },
        update: mockUpdate,
      })

      renderMenubar()
      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      fireEvent.mouseEnter(settingsTrigger)
      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.settingsContent),
        ).toBeInTheDocument()
      })

      const allRadio = screen.getByRole("menuitemradio", {
        name: "settings.autoCompleteTarget.all",
      })
      const pinnedRadio = screen.getByRole("menuitemradio", {
        name: "settings.autoCompleteTarget.pinned",
      })

      expect(allRadio).toHaveAttribute("aria-checked", "false")
      expect(pinnedRadio).toHaveAttribute("aria-checked", "true")

      fireEvent.click(allRadio)

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ autoCompleteTarget: "all" })
      })
    })

    it("should handle undefined autoCompleteTarget setting", async () => {
      useSettingsMock.mockReturnValue({
        settings: { ...defaultSettings, autoCompleteTarget: undefined },
        update: mockUpdate,
      })

      renderMenubar()
      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      fireEvent.mouseEnter(settingsTrigger)

      await waitFor(() => {
        const allRadio = screen.getByRole("menuitemradio", {
          name: "settings.autoCompleteTarget.all",
        })
        // Verify that the default value "all" is applied
        expect(allRadio).toHaveAttribute("aria-checked", "true")
      })
    })
  })

  describe("Feature Tests - Export Functionality", () => {
    beforeEach(async () => {
      renderMenubar()
      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      fireEvent.mouseEnter(settingsTrigger)
      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.settingsContent),
        ).toBeInTheDocument()
      })
    })

    it("should call export service when export button is clicked", async () => {
      ;(promptExportService.exportToCSV as any).mockResolvedValue(undefined)

      const exportButton = screen.getByRole("menuitem", {
        name: "settings.export",
      })
      fireEvent.click(exportButton)

      await waitFor(() => {
        expect(promptExportService.exportToCSV).toHaveBeenCalledTimes(1)
      })
    })

    it("should handle export errors gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      ;(promptExportService.exportToCSV as any).mockRejectedValue(
        new Error("Export failed"),
      )

      const exportButton = screen.getByRole("menuitem", {
        name: "settings.export",
      })
      fireEvent.click(exportButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Export failed:",
          expect.any(Error),
        )
      })

      consoleErrorSpy.mockRestore()
    })

    it("should display export button with download icon", () => {
      const exportButton = screen.getByRole("menuitem", {
        name: "settings.export",
      })
      expect(exportButton).toBeInTheDocument()

      // Verify icon exists (by checking for SVG presence)
      const icon = exportButton.querySelector("svg")
      expect(icon).toBeInTheDocument()
    })
  })

  describe("Feature Tests - Import Functionality", () => {
    beforeEach(async () => {
      renderMenubar()
      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      fireEvent.mouseEnter(settingsTrigger)
      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.settingsContent),
        ).toBeInTheDocument()
      })
    })

    it("should display import button with upload icon", () => {
      const importButton = screen.getByRole("menuitem", {
        name: "settings.import",
      })
      expect(importButton).toBeInTheDocument()

      // Verify icon exists (by checking for SVG presence)
      const icon = importButton.querySelector("svg")
      expect(icon).toBeInTheDocument()
    })
  })

  describe("Error Handling", () => {
    it("should handle settings update errors", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})

      mockUpdate.mockRejectedValue(new Error("Settings update failed"))

      render(<MockMenubar />)
      const settingsTrigger = screen.getByTestId(
        TestIds.inputPopup.settingsTrigger,
      )
      fireEvent.mouseEnter(settingsTrigger)

      await waitFor(() => {
        expect(
          screen.getByTestId(TestIds.inputPopup.settingsContent),
        ).toBeInTheDocument()
      })

      const autoSaveCheckbox = screen.getByRole("menuitemcheckbox", {
        name: "settings.autoSave",
      })
      fireEvent.click(autoSaveCheckbox)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Settings update failed:",
          expect.any(Error),
        )
      })

      consoleErrorSpy.mockRestore()
    })
  })
})
